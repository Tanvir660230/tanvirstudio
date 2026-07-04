const { onSchedule }                                              = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError }                                      = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { defineSecret }                                            = require("firebase-functions/params");
const admin                                                       = require("firebase-admin");
const { v1: FirestoreAdmin }                                      = require("@google-cloud/firestore");
const nodemailer                                                   = require("nodemailer");

admin.initializeApp();
const db             = admin.firestore();
const fcm            = admin.messaging();
const firestoreAdmin = new FirestoreAdmin.FirestoreAdminClient();

// ─── Secrets ─────────────────────────────────────────────────────────────────
const EMAIL_USER      = defineSecret("EMAIL_USER");
const EMAIL_PASS      = defineSecret("EMAIL_PASS");
const BULKSMS_KEY     = defineSecret("BULKSMS_API_KEY");
const BULKSMS_SENDER  = defineSecret("BULKSMS_SENDER_ID");
const ADMIN_EMAIL_SEC = defineSecret("ADMIN_EMAIL");

// ─── Core helpers ─────────────────────────────────────────────────────────────

function makeTransport(user, pass) {
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function normalizeBDPhone(raw = "") {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0"))   return "880" + digits.slice(1);
  if (digits.length === 10)     return "880" + digits;
  return digits;
}

// Strip < > to prevent HTML injection; enforce max length
function sanitize(str = "", maxLen = 5000) {
  return String(str).replace(/[<>]/g, "").slice(0, maxLen).trim();
}

// HTML-escape user-controlled values before inserting into email HTML bodies
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Strip newlines/control chars from email subjects to prevent header injection
function sanitizeSubject(str = "", maxLen = 200) {
  return String(str).replace(/[\r\n\t]/g, " ").replace(/[<>]/g, "").slice(0, maxLen).trim();
}

// Retry up to `attempts` times with exponential backoff (1s, 2s, 4s…)
async function withRetry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

// Cache admin UID in-memory — avoids a Firestore read on every call within the same instance
let _cachedAdminUid = null;
let _adminUidFetchedAt = 0;
async function getAdminUid() {
  const now = Date.now();
  if (_cachedAdminUid && now - _adminUidFetchedAt < 5 * 60 * 1000) return _cachedAdminUid;
  const snap = await db.collection("users").where("role", "==", "admin").limit(1).get();
  _cachedAdminUid = snap.empty ? null : snap.docs[0].id;
  _adminUidFetchedAt = now;
  return _cachedAdminUid;
}

async function createAdminNotification(title, message, type = "info") {
  const adminUid = await getAdminUid();
  if (!adminUid) return;
  await db.collection("notifications").add({
    recipientId: adminUid,
    title,
    message,
    type,
    read:      false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
  });
}

// Best-effort caller IP for callable functions — used as a second rate-limit key
// alongside the caller-supplied email/phone, since that string is trivial to rotate.
function getClientIp(req) {
  const raw = req && req.rawRequest;
  const fwd = raw && raw.headers && raw.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (raw && raw.ip) || "unknown";
}

// Per-user per-function rate limit using Firestore (default: 20 calls / hour)
async function checkRateLimit(uid, fnName, maxCalls = 20, windowMs = 3_600_000) {
  const ref  = db.doc(`rateLimits/${uid}_${fnName}`);
  const snap = await ref.get();
  const now  = Date.now();
  if (!snap.exists) { await ref.set({ count: 1, windowStart: now }); return; }
  const { count, windowStart } = snap.data();
  if (now - windowStart > windowMs) { await ref.set({ count: 1, windowStart: now }); return; }
  if (count >= maxCalls) throw new HttpsError("resource-exhausted", "Rate limit exceeded — try again later.");
  await ref.update({ count: admin.firestore.FieldValue.increment(1) });
}

// Send SMS via BulkSMSBD (already normalises phone)
async function sendSMSRaw(phone, message) {
  const number = normalizeBDPhone(phone);
  const params = new URLSearchParams({
    api_key:  BULKSMS_KEY.value(),
    senderid: BULKSMS_SENDER.value(),
    number,
    message,
  });
  const res  = await fetch(`https://bulksmsbd.net/api/smsapi?${params}`);
  const body = await res.text();
  console.log("SMS response:", body);
  return body;
}

// Deduped SMS: won't send if same phone + typeKey was messaged within dedupMs
async function sendSMSDedup(phone, typeKey, message, dedupMs = 3_600_000) {
  if (!phone) return;
  const key  = `sms_${normalizeBDPhone(phone)}_${typeKey}`;
  const ref  = db.doc(`rateLimits/${key}`);
  const snap = await ref.get();
  if (snap.exists && (Date.now() - snap.data().sentAt) < dedupMs) return;
  await ref.set({ sentAt: Date.now() });
  await withRetry(() => sendSMSRaw(phone, message));
}

// Auto-detect task category from title + description keywords
function detectTaskCategory(title = "", description = "") {
  const text = (title + " " + description).toLowerCase();
  if (/\bhum(ming)?\b/.test(text))                      return "humming";
  if (/\bbeat\b|\binstrumental\b/.test(text))           return "beat_production";
  if (/\bvocal\b|\brecord(ing)?\b|\bsinger\b/.test(text)) return "vocal_recording";
  if (/\bmaster(ing)?\b/.test(text))                    return "mastering";
  if (/\bmix(ing)?\b/.test(text))                       return "mixing";
  return "production";
}

// Extract task deadline as ms (handles Timestamp or ISO string)
function getDeadlineMs(task) {
  const raw = task.deadline || task.sessionDate;
  if (!raw) return null;
  if (raw && typeof raw.toMillis === "function") return raw.toMillis();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.getTime();
}

// ─── HTML email template ──────────────────────────────────────────────────────

function htmlWrap(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:10px;overflow:hidden;max-width:560px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#1a0a2e,#6b21a8);padding:28px 36px;text-align:center">
    <p style="color:#fff;margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:.5px">&#127925; Tanvir Studio</p>
    <p style="color:rgba(255,255,255,.65);margin:0;font-size:12px">Professional Music Production</p>
  </td></tr>
  <tr><td style="padding:32px 36px">${bodyHtml}</td></tr>
  <tr><td style="background:#f9f9f9;padding:14px 36px;text-align:center;border-top:1px solid #eee">
    <p style="color:#bbb;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} Tanvir Studio</p>
  </td></tr>
</table>
</td></tr>
</table></body></html>`;
}

function btn(text, url) {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1a0a2e,#6b21a8);
      color:#fff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:600">
      ${text}
    </a>
  </div>`;
}

function para(text) {
  return `<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 14px">${text}</p>`;
}

// ─── Status-change templates (client notifications) ───────────────────────────

const STATUS_TEMPLATES = {
  accepted: {
    subject: (pkg) => sanitizeSubject(`Your order has been accepted — ${pkg}`),
    html: (name, pkg, project, date) => htmlWrap("Order Accepted", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your order has been accepted! &#127881;</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, great news — your order is confirmed.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:8px;padding:16px;margin:0 0 16px">
        <tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Package:</strong> ${esc(pkg)}</td></tr>
        <tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Project:</strong> ${esc(project)}</td></tr>
        ${date ? `<tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Session Date:</strong> ${esc(date)}</td></tr>` : ""}
      </table>
      ${para("We will contact you soon with further details. You can track your order from your dashboard.")}
      ${btn("Go to Dashboard →", "https://tanvirstudio.com/dashboard")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, your ${sanitize(pkg, 100)} order (${ref}) has been accepted! We will contact you soon. - Tanvir Studio`,
    notif: (pkg) => ["Order Accepted", `Your ${sanitize(pkg, 100)} order has been accepted!`, "order"],
  },
  completed: {
    subject: (pkg) => sanitizeSubject(`Your project is complete — ${pkg}`),
    html: (name, pkg, project) => htmlWrap("Project Complete", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your project is ready! &#127775;</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, your <strong>&ldquo;${esc(project)}&rdquo;</strong> (${esc(pkg)}) project is now complete.`)}
      ${para("Your files are ready to download from your dashboard. Thank you for choosing Tanvir Studio!")}
      ${btn("Download Files →", "https://tanvirstudio.com/dashboard")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, your ${sanitize(pkg, 100)} project (${ref}) is complete! Download from dashboard. - Tanvir Studio`,
    notif: (pkg) => ["Project Complete!", `Your ${sanitize(pkg, 100)} project is now complete.`, "success"],
  },
  declined: {
    subject: (pkg) => sanitizeSubject(`Update on your order — ${pkg}`),
    html: (name, pkg, project) => htmlWrap("Order Update", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">An update about your order</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, unfortunately we are unable to take on <strong>&ldquo;${esc(project)}&rdquo;</strong> (${esc(pkg)}) at this time.`)}
      ${para("Please contact us to discuss alternatives or reschedule.")}
      ${btn("Contact Us →", "https://tanvirstudio.com/contact")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, we cannot accept your ${sanitize(pkg, 100)} order (${ref}) at this time. Please contact us. - Tanvir Studio`,
    notif: (pkg) => ["Order Update", `Your ${sanitize(pkg, 100)} order could not be processed.`, "warning"],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Weekly Firestore backup (Sunday midnight) ────────────────────────────────
exports.scheduledFirestoreExport = onSchedule("every sunday 00:00", async () => {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId) { console.error("No project ID"); return; }
  const bucket       = `gs://${projectId}-backups`;
  const databaseName = firestoreAdmin.databasePath(projectId, "(default)");
  try {
    const [op] = await firestoreAdmin.exportDocuments({ name: databaseName, outputUriPrefix: bucket, collectionIds: [] });
    console.log(`Backup started: ${op.name}`);
  } catch (err) { console.error("Backup failed:", err); }
});

// ─── Delete expired notifications (daily) ────────────────────────────────────
exports.cleanupExpiredNotifications = onSchedule("every 24 hours", async () => {
  const now  = admin.firestore.Timestamp.now();
  const snap = await db.collection("notifications").where("expiresAt", "<", now).limit(500).get();
  if (snap.empty) { console.log("No expired notifications"); return; }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`Deleted ${snap.size} expired notifications`);
});

// ─── Weekly revenue report (Monday 9am Dhaka = Monday 3am UTC) ───────────────
exports.weeklyRevenueReport = onSchedule(
  { schedule: "0 3 * * 1", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC] },
  async () => {
    const adminEmail = ADMIN_EMAIL_SEC.value();
    if (!adminEmail) return;

    const weekAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400 * 1000);
    const now     = new Date();
    const weekAgoDate = new Date(Date.now() - 7 * 86400 * 1000);
    const weekStr = `${weekAgoDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

    const twoWeeksAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 14 * 86400 * 1000);

    const [txSnap, prevTxSnap, taskSnap] = await Promise.all([
      db.collection("transactions").where("createdAt", ">=", weekAgo).get().catch(() => ({ docs: [] })),
      db.collection("transactions").where("createdAt", ">=", twoWeeksAgo).where("createdAt", "<", weekAgo).get().catch(() => ({ docs: [] })),
      db.collection("tasks").where("createdAt", ">=", weekAgo).get().catch(() => ({ docs: [] })),
    ]);

    let income = 0, expenses = 0, prevIncome = 0;
    txSnap.docs.forEach((d) => {
      const { type, amount = 0 } = d.data();
      if (type === "in")  income   += Number(amount);
      if (type === "out") expenses += Number(amount);
    });
    prevTxSnap.docs.forEach((d) => {
      if (d.data().type === "in") prevIncome += Number(d.data().amount || 0);
    });
    const revenueDropPct = prevIncome > 0 ? Math.round((1 - income / prevIncome) * 100) : 0;

    const tasks = taskSnap.docs.map((d) => d.data());
    const ordersReceived  = tasks.length;
    const ordersCompleted = tasks.filter((t) => t.status === "completed").length;

    // Find top package by order count
    const pkgCount = {};
    tasks.forEach(({ packageName }) => {
      if (packageName) pkgCount[packageName] = (pkgCount[packageName] || 0) + 1;
    });
    const topPackage = Object.entries(pkgCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const net = income - expenses;

    const bodyHtml = `
      <h2 style="color:#1a0a2e;margin:0 0 6px;font-size:20px">Weekly Studio Report</h2>
      <p style="color:#aaa;font-size:13px;margin:0 0 24px">${weekStr}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
        <tr>
          <td style="text-align:center;padding:16px 8px;background:#f0fdf4;border-radius:8px">
            <p style="color:#16a34a;font-size:22px;font-weight:700;margin:0">&#2547;${income.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Income</p>
          </td>
          <td width="12"></td>
          <td style="text-align:center;padding:16px 8px;background:#fef2f2;border-radius:8px">
            <p style="color:#dc2626;font-size:22px;font-weight:700;margin:0">&#2547;${expenses.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Expenses</p>
          </td>
          <td width="12"></td>
          <td style="text-align:center;padding:16px 8px;background:#eff6ff;border-radius:8px">
            <p style="color:#2563eb;font-size:22px;font-weight:700;margin:0">&#2547;${net.toLocaleString()}</p>
            <p style="color:#555;font-size:12px;margin:4px 0 0">Net</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden">
        <tr style="background:#f9f9f9">
          <td style="padding:10px 16px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase">Metric</td>
          <td style="padding:10px 16px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;text-align:right">Value</td>
        </tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Orders Received</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${ordersReceived}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Orders Completed</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${ordersCompleted}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">Top Package</td>
          <td style="padding:12px 16px;color:#333;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #eee">${topPackage}</td></tr>
        <tr><td style="padding:12px 16px;color:#333;font-size:14px;border-top:1px solid #eee">vs Last Week</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #eee;color:${revenueDropPct >= 40 ? "#dc2626" : revenueDropPct > 0 ? "#d97706" : "#16a34a"}">
            ${prevIncome > 0 ? (revenueDropPct > 0 ? `▼ ${revenueDropPct}% drop` : `▲ ${Math.abs(revenueDropPct)}% up`) : "N/A"}
          </td></tr>
      </table>
      ${revenueDropPct >= 40 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-top:16px">
        <p style="color:#dc2626;font-weight:700;margin:0 0 4px;font-size:14px">⚠️ Revenue Anomaly Detected</p>
        <p style="color:#555;font-size:13px;margin:0">This week's income (৳${income.toLocaleString()}) is ${revenueDropPct}% below last week (৳${prevIncome.toLocaleString()}). Consider reviewing pricing or running a promotion.</p>
      </div>` : ""}
    `;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      adminEmail,
      subject: `Weekly Report — ${weekStr}`,
      html:    htmlWrap("Weekly Studio Report", bodyHtml),
      text:    `Weekly Report (${weekStr})\n\nIncome: ৳${income}\nExpenses: ৳${expenses}\nNet: ৳${net}\nOrders Received: ${ordersReceived}\nOrders Completed: ${ordersCompleted}\nTop Package: ${topPackage}`,
    }));

    console.log(`Weekly report sent. Income: ${income}, Net: ${net}`);
  }
);

// ─── Alert admin about orders pending 48h+ (every 12h) ───────────────────────
exports.checkPendingOrders = onSchedule("every 12 hours", async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 48 * 3600 * 1000);
  const snap = await db.collection("tasks")
    .where("status",             "==",  "pending")
    .where("adminPendingAlerted", "!=",  true)
    .where("createdAt",          "<=",  cutoff)
    .limit(50)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { adminPendingAlerted: true }));
  await batch.commit();

  await createAdminNotification(
    "Pending Orders Need Review",
    `${snap.size} order(s) have been pending for 48+ hours.`,
    "warning"
  );

  console.log(`Alerted admin about ${snap.size} stale pending orders`);
});

// ─── Overdue payment reminders — email client, max once per 3 days ────────────
exports.checkOverduePayments = onSchedule(
  { schedule: "0 4 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const now     = Date.now();
    const threeDaysAgo = admin.firestore.Timestamp.fromMillis(now - 3 * 86400 * 1000);

    const snap = await db.collection("tasks")
      .where("balance", ">", 0)
      .get();

    const due = snap.docs.filter((d) => {
      const task       = d.data();
      const deadlineMs = getDeadlineMs(task);
      if (!deadlineMs || deadlineMs > now) return false;               // not overdue yet
      if (task.status === "completed" || task.status === "declined") return false;
      const lastReminder = task.lastPaymentReminder;
      if (lastReminder && lastReminder.toMillis() > threeDaysAgo.toMillis()) return false; // already sent recently
      return Boolean(task.clientEmail);
    });

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    for (const d of due) {
      const task = d.data();
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      task.clientEmail,
          subject: sanitizeSubject(`Payment reminder — ${task.packageName || task.title}`),
          html: htmlWrap("Payment Reminder", `
            ${para(`Hi <strong>${esc(task.client || "there")}</strong>,`)}
            ${para(`This is a friendly reminder that there is an outstanding balance of <strong>&#2547;${Number(task.balance).toLocaleString()}</strong> for your <strong>${esc(task.packageName || task.title)}</strong> project.`)}
            ${para("Please complete your payment at your earliest convenience to avoid any delays.")}
            ${btn("View Order →", "https://tanvirstudio.com/dashboard")}
          `),
          text: `Hi ${sanitize(task.client || "there", 50)}, you have an outstanding balance of ৳${task.balance} for ${sanitize(task.packageName || task.title, 100)}. Please complete payment. - Tanvir Studio`,
        }));
        await d.ref.update({ lastPaymentReminder: admin.firestore.Timestamp.now() });
      } catch (e) { console.error("Payment reminder error:", e); }
    }

    if (due.length) console.log(`Sent ${due.length} payment reminders`);
  }
);

// ─── Deactivate expired coupons (daily 1am Dhaka) ────────────────────────────
exports.deactivateExpiredCoupons = onSchedule(
  { schedule: "0 1 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const now  = admin.firestore.Timestamp.now();
    const snap = await db.collection("coupons")
      .where("active",    "==", true)
      .where("expiresAt", "<",  now)
      .limit(100)
      .get();

    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { active: false }));
    await batch.commit();
    console.log(`Deactivated ${snap.size} expired coupons`);
  }
);

// ─── Warn admin if any staff has 5+ active tasks (daily 9am Dhaka) ────────────
exports.checkStaffWorkload = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const snap = await db.collection("tasks")
      .where("status", "in", ["pending", "accepted", "in_progress"])
      .get();

    const workload = {};
    snap.docs.forEach((d) => {
      const { composerId, hummingArtistId } = d.data();
      if (composerId)       workload[composerId]       = (workload[composerId]       || 0) + 1;
      if (hummingArtistId)  workload[hummingArtistId]  = (workload[hummingArtistId]  || 0) + 1;
    });

    const overloaded = Object.entries(workload).filter(([, count]) => count >= 5);
    if (!overloaded.length) return;

    // Get names for the alert message
    const uids     = overloaded.map(([uid]) => uid);
    const userSnap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", uids).get();
    const nameMap  = {};
    userSnap.docs.forEach((d) => { nameMap[d.id] = d.data().name || d.id; });

    const lines = overloaded.map(([uid, count]) => `${nameMap[uid] || uid}: ${count} tasks`).join(", ");
    await createAdminNotification(
      "Staff Overload Warning",
      `${overloaded.length} staff member(s) have 5+ active tasks: ${lines}`,
      "warning"
    );
    console.log(`Workload warning: ${lines}`);
  }
);

// ─── Task deadline reminders — email client 24h before (daily 8am Dhaka) ──────
exports.checkTaskDeadlines = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const now     = Date.now();
    const in24h   = now + 24 * 3600 * 1000;
    const in48h   = now + 48 * 3600 * 1000;

    const snap = await db.collection("tasks")
      .where("deadlineReminderSent", "!=", true)
      .get();

    const due = snap.docs.filter((d) => {
      const task       = d.data();
      const deadlineMs = getDeadlineMs(task);
      if (!deadlineMs) return false;
      if (deadlineMs < now || deadlineMs > in48h) return false; // only 0-48h window
      if (task.status === "completed" || task.status === "declined") return false;
      return Boolean(task.clientEmail);
    });

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    for (const d of due) {
      const task    = d.data();
      const dlMs    = getDeadlineMs(task);
      const dlStr   = new Date(dlMs).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      const hoursLeft = Math.round((dlMs - now) / 3600000);

      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      task.clientEmail,
          subject: sanitizeSubject(`Reminder: Your session is in ${hoursLeft}h — ${task.packageName || task.title}`),
          html: htmlWrap("Session Reminder", `
            ${para(`Hi <strong>${esc(task.client || "there")}</strong>,`)}
            ${para(`Just a reminder that your <strong>${esc(task.packageName || task.title)}</strong> session is scheduled for <strong>${esc(dlStr)}</strong> — that's in about <strong>${hoursLeft} hours</strong>.`)}
            ${para("Please ensure you're prepared. If you need to reschedule, contact us as soon as possible.")}
            ${btn("View Order →", "https://tanvirstudio.com/dashboard")}
          `),
          text: `Reminder: Your ${sanitize(task.packageName || task.title, 100)} session is in ${hoursLeft}h (${dlStr}). - Tanvir Studio`,
        }));
        await d.ref.update({ deadlineReminderSent: true });
      } catch (e) { console.error("Deadline reminder error:", e); }
    }

    if (due.length) console.log(`Sent ${due.length} deadline reminders`);
  }
);

// ─── Satisfaction ping — email only, 24-48h after completion ─────────────────
exports.sendSatisfactionPings = onSchedule(
  { schedule: "0 10 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const now   = Date.now();
    const h24   = now - 24 * 3600 * 1000;
    const h48   = now - 48 * 3600 * 1000;

    const snap = await db.collection("tasks")
      .where("status",           "==",  "completed")
      .where("satisfactionSent", "!=",  true)
      .get();

    const ready = snap.docs.filter((d) => {
      const { completedAt, clientEmail } = d.data();
      if (!clientEmail || !completedAt) return false;
      const ms = completedAt.toMillis ? completedAt.toMillis() : new Date(completedAt).getTime();
      return ms >= h48 && ms <= h24; // completed 24-48h ago
    });

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    for (const d of ready) {
      const task = d.data();
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      task.clientEmail,
          subject: sanitizeSubject(`How was your experience? — ${task.packageName || task.title}`),
          html: htmlWrap("We'd Love Your Feedback", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">How was your experience? &#11088;</h2>
            ${para(`Hi <strong>${esc(task.client || "there")}</strong>, we hope you're loving the result of your <strong>${esc(task.packageName || task.title)}</strong> project!`)}
            ${para("Your feedback means the world to us and helps us improve for future clients. It only takes 30 seconds.")}
            ${btn("Leave a Review →", "https://tanvirstudio.com/review")}
            ${para(`<span style="font-size:13px;color:#aaa">You can also reply directly to this email with your thoughts.</span>`)}
          `),
          text: `Hi ${sanitize(task.client || "there", 50)}, how was your experience with Tanvir Studio? We'd love your feedback! - Tanvir Studio`,
        }));
        await d.ref.update({ satisfactionSent: true });
      } catch (e) { console.error("Satisfaction ping error:", e); }
    }

    if (ready.length) console.log(`Sent ${ready.length} satisfaction emails`);
  }
);

// ─── Morning digest — admin summary email, skips quiet days (daily 7am Dhaka) ─
exports.morningDigest = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC] },
  async () => {
    const adminEmail = ADMIN_EMAIL_SEC.value();
    if (!adminEmail) return;

    const now       = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [pendingSnap, activeSnap, weekTxSnap] = await Promise.all([
      db.collection("tasks").where("status", "==", "pending").get().catch(() => ({ size: 0, docs: [] })),
      db.collection("tasks").where("status", "in", ["pending", "accepted", "in_progress"]).get().catch(() => ({ docs: [] })),
      db.collection("transactions").where("createdAt", ">=", admin.firestore.Timestamp.fromMillis(now - 7 * 86400 * 1000)).get().catch(() => ({ docs: [] })),
    ]);

    const dueToday = activeSnap.docs.filter((d) => {
      const ms = getDeadlineMs(d.data());
      return ms && ms >= todayStart.getTime() && ms <= todayEnd.getTime();
    }).length;

    const overdue = activeSnap.docs.filter((d) => {
      const ms = getDeadlineMs(d.data());
      return ms && ms < todayStart.getTime();
    }).length;

    let weekRevenue = 0;
    weekTxSnap.docs.forEach((d) => { const { type, amount = 0 } = d.data(); if (type === "in") weekRevenue += Number(amount); });

    const pendingCount = pendingSnap.size || 0;

    // Skip if nothing actionable
    if (pendingCount === 0 && dueToday === 0 && overdue === 0) { console.log("Quiet morning — digest skipped"); return; }

    const mkRow = (label, value, color) =>
      `<tr><td style="padding:11px 16px;color:#555;font-size:14px;border-top:1px solid #eee">${label}</td>
       <td style="padding:11px 16px;font-size:15px;font-weight:700;text-align:right;border-top:1px solid #eee;color:${color}">${value}</td></tr>`;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      adminEmail,
      subject: `Morning Digest — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}`,
      html: htmlWrap("Good Morning — Studio Snapshot", `
        <h2 style="color:#1a0a2e;margin:0 0 4px;font-size:20px">Good morning! Here's today's snapshot.</h2>
        <p style="color:#aaa;font-size:13px;margin:0 0 24px">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:0 0 20px">
          <tr style="background:#f9f9f9">
            <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Metric</td>
            <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right">Value</td>
          </tr>
          ${mkRow("Pending Orders",    pendingCount,                            pendingCount > 0 ? "#dc2626" : "#16a34a")}
          ${mkRow("Due Today",         dueToday,                                dueToday > 0    ? "#d97706" : "#16a34a")}
          ${mkRow("Overdue Tasks",     overdue,                                 overdue > 0     ? "#dc2626" : "#16a34a")}
          ${mkRow("Revenue This Week", `&#2547;${weekRevenue.toLocaleString()}`, "#2563eb")}
        </table>
        ${btn("Open Dashboard →", "https://tanvirstudio.com/dashboard")}
      `),
      text: `Morning Digest — Pending: ${pendingCount}, Due today: ${dueToday}, Overdue: ${overdue}, Revenue: ৳${weekRevenue}`,
    })).catch((e) => console.error("Morning digest email error:", e));

    console.log(`Morning digest sent. Pending:${pendingCount} DueToday:${dueToday} Overdue:${overdue}`);
  }
);

// ─── Auto-escalate tasks with deadline <24h to urgent (every 6h) ─────────────
exports.autoPriorityBump = onSchedule("every 6 hours", async () => {
  const now  = Date.now();
  const in24h = now + 24 * 3600 * 1000;

  const snap = await db.collection("tasks")
    .where("status", "in", ["pending", "accepted", "in_progress"])
    .get();

  const toEscalate = snap.docs.filter((d) => {
    const task = d.data();
    const ms   = getDeadlineMs(task);
    if (!ms || ms > in24h || ms < now) return false; // outside 0-24h window
    if (task.priority === "urgent") return false;     // already escalated
    return true;
  });

  if (!toEscalate.length) return;

  const batch = db.batch();
  toEscalate.forEach((d) => batch.update(d.ref, { priority: "urgent", autoEscalated: true }));
  await batch.commit();

  await createAdminNotification(
    "Tasks Auto-Escalated to Urgent",
    `${toEscalate.length} task(s) escalated — deadline within 24h: ${toEscalate.map((d) => d.data().title || d.id).slice(0, 3).join(", ")}${toEscalate.length > 3 ? "…" : ""}`,
    "warning"
  );
  console.log(`Auto-escalated ${toEscalate.length} tasks to urgent`);
});

// ─── Coupon expiry warning — admin in-app alert 24h before coupon expires ─────
exports.couponExpiryWarning = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const now  = admin.firestore.Timestamp.now();
    const in24h = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000);

    const snap = await db.collection("coupons")
      .where("active",    "==", true)
      .where("expiresAt", ">",  now)
      .where("expiresAt", "<=", in24h)
      .get();

    if (snap.empty) return;

    const summary = snap.docs.map((d) => {
      const { code, usedCount = 0, maxUses = 0 } = d.data();
      return `${code} (${usedCount}/${maxUses || "∞"} used)`;
    }).join(", ");

    await createAdminNotification(
      "Coupons Expiring in 24h",
      `${snap.size} coupon(s) expiring soon: ${summary}`,
      "warning"
    );
    console.log(`Coupon expiry warning: ${summary}`);
  }
);

// ─── Churn re-engagement — weekly, email clients quiet for 90+ days ───────────
exports.checkChurnRisk = onSchedule(
  { schedule: "0 11 * * 1", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const cutoff90 = Date.now() - 90 * 86400 * 1000;
    const cutoff30 = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 86400 * 1000);

    const snap = await db.collection("users").where("role", "==", "client").get();
    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    let sent = 0;

    for (const d of snap.docs) {
      const user = d.data();
      if (!user.email) continue;

      // Skip if re-engagement email sent in last 30 days
      if (user.churnEmailSent && user.churnEmailSent.toMillis() > cutoff30.toMillis()) continue;

      // Determine last activity: prefer lastOrderAt, fallback to createdAt
      const lastMs = user.lastOrderAt?.toMillis()
        || (user.createdAt ? new Date(user.createdAt).getTime() : null);
      if (!lastMs || lastMs > cutoff90) continue; // active within 90 days

      const name = user.name || user.email.split("@")[0] || "there";
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      user.email,
          subject: sanitizeSubject(`We miss you at Tanvir Studio, ${name}!`),
          html: htmlWrap("We Miss You!", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">It's been a while, ${esc(name)}! &#127925;</h2>
            ${para("We haven't seen you in a while — and we'd love to work with you again.")}
            ${para("We have exciting packages for mixing, mastering, beat production, and more. Whether it's a new release or a long-awaited project — we're ready when you are.")}
            ${btn("Explore Packages →", "https://tanvirstudio.com/#packages")}
            ${para(`<span style="font-size:12px;color:#bbb">Reply to this email to unsubscribe from re-engagement emails.</span>`)}
          `),
          text: `Hi ${name}, we miss you at Tanvir Studio! Check out our packages at tanvirstudio.com - Tanvir Studio`,
        }));
        await d.ref.update({ churnEmailSent: admin.firestore.Timestamp.now() });
        sent++;
      } catch (e) { console.error("Churn email error:", e); }
    }

    if (sent) console.log(`Sent ${sent} churn re-engagement emails`);
  }
);

// ─── Upsell email — 7 days after Starter completion, suggest upgrade ──────────
exports.autoUpsellEmail = onSchedule(
  { schedule: "0 14 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const STARTER_KEYWORDS = ["starter", "basic", "simple", "economy"];
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400 * 1000);
    const eightDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 8 * 86400 * 1000);

    const snap = await db.collection("tasks")
      .where("status",     "==",  "completed")
      .where("upsellSent", "!=",  true)
      .where("completedAt", ">=", eightDaysAgo)
      .where("completedAt", "<=", sevenDaysAgo)
      .get().catch(() => ({ docs: [] }));

    const candidates = snap.docs.filter((d) => {
      const { packageName = "", clientEmail } = d.data();
      if (!clientEmail) return false;
      return STARTER_KEYWORDS.some((k) => packageName.toLowerCase().includes(k));
    });

    if (!candidates.length) return;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    for (const d of candidates) {
      const task = d.data();
      const name = task.client || "there";
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      task.clientEmail,
          subject: `Ready to take your sound further? — Tanvir Studio`,
          html: htmlWrap("Level Up Your Sound", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">How did your project turn out? &#127925;</h2>
            ${para(`Hi <strong>${esc(name)}</strong>, we hope you're loving your <strong>${esc(task.packageName || "project")}</strong>!`)}
            ${para("Many of our clients who start with a basic package come back for the next level — richer arrangements, fuller sound, and a more polished release.")}
            ${para("Our <strong>Signature</strong> and <strong>Premium</strong> packages include advanced mixing, custom arrangements, and unlimited revisions.")}
            ${btn("Explore Premium Packages →", "https://tanvirstudio.com/#packages")}
            ${para(`<span style="font-size:12px;color:#bbb">Reply to this email if you have any questions.</span>`)}
          `),
          text: `Hi ${name}, hope you loved your ${task.packageName} project! Ready to level up? Check our premium packages at tanvirstudio.com - Tanvir Studio`,
        }));
        await d.ref.update({ upsellSent: true });
      } catch (e) { console.error("Upsell email error:", e); }
    }
    if (candidates.length) console.log(`Sent ${candidates.length} upsell emails`);
  }
);

// ─── Abandoned booking follow-up — 48h pending with no response ───────────────
exports.abandonedBookingFollowup = onSchedule(
  { schedule: "0 15 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const cutoffMs = Date.now() - 48 * 3600 * 1000;

    const snap = await db.collection("bookings")
      .where("status",       "==",  "pending")
      .where("followupSent", "!=",  true)
      .limit(50)
      .get().catch(() => ({ docs: [] }));

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    let sent = 0;

    for (const d of snap.docs) {
      const booking = d.data();
      if (!booking.email) continue;

      // Check age in-memory (handles both Timestamp and ISO string)
      const createdMs = booking.createdAt?.toMillis?.()
        || (booking.createdAt ? new Date(booking.createdAt).getTime() : null);
      if (!createdMs || createdMs > cutoffMs) continue;

      const name = booking.name || "there";
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      booking.email,
          subject: sanitizeSubject(`About your ${booking.service || "studio"} booking — Tanvir Studio`),
          html: htmlWrap("Your Booking Is Under Review", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">We received your booking! &#9989;</h2>
            ${para(`Hi <strong>${esc(name)}</strong>, we're reviewing your <strong>${esc(booking.service || "studio session")}</strong> booking${booking.date ? ` for ${esc(new Date(booking.date).toLocaleDateString("en-GB", { dateStyle: "medium" }))}` : ""}.`)}
            ${para("We'll confirm your slot within 24 hours. If you haven't heard from us yet, please reply to this email or reach us directly.")}
            ${btn("Contact Us →", "https://tanvirstudio.com/contact")}
          `),
          text: `Hi ${name}, your ${booking.service || "studio session"} booking is under review. We'll confirm soon. - Tanvir Studio`,
        }));
        await d.ref.update({ followupSent: true });
        sent++;
      } catch (e) { console.error("Booking followup error:", e); }
    }
    if (sent) console.log(`Sent ${sent} booking followup emails`);
  }
);

// ─── Overdue-progress alert — tasks running 50% longer than expected ──────────
exports.overdueProgressAlert = onSchedule("every 12 hours", async () => {
  const EXPECTED_DAYS = {
    starter: 3, basic: 3, simple: 3, economy: 3,
    signature: 5, standard: 5, professional: 5,
    premium: 7, advanced: 7, ultimate: 10,
  };

  const snap = await db.collection("tasks")
    .where("status", "in", ["accepted", "in_progress"])
    .where("overdueProgressAlerted", "!=", true)
    .get().catch(() => ({ docs: [] }));

  const overdue = snap.docs.filter((d) => {
    const task = d.data();
    const createdMs = task.createdAt ? new Date(task.createdAt).getTime() : null;
    if (!createdMs) return false;

    const pkgLower = (task.packageName || "").toLowerCase();
    let expectedDays = 7;
    for (const [key, days] of Object.entries(EXPECTED_DAYS)) {
      if (pkgLower.includes(key)) { expectedDays = days; break; }
    }
    return (Date.now() - createdMs) / 86400000 > expectedDays * 1.5;
  });

  if (!overdue.length) return;

  const batch = db.batch();
  overdue.forEach((d) => batch.update(d.ref, { overdueProgressAlerted: true }));
  await batch.commit();

  const preview = overdue.slice(0, 3).map((d) => d.data().title || d.id).join(", ");
  await createAdminNotification(
    "Tasks Running Behind Schedule",
    `${overdue.length} task(s) are 50%+ over expected turnaround: ${preview}${overdue.length > 3 ? "…" : ""}`,
    "warning"
  );
  console.log(`Overdue-progress alert: ${overdue.length} tasks`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALLABLE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Send email ───────────────────────────────────────────────────────────────
exports.sendEmail = onCall(
  { secrets: [EMAIL_USER, EMAIL_PASS] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
    const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
    if (callerSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");
    
    await checkRateLimit(req.auth.uid, "sendEmail");

    const to      = sanitize(req.data?.to      || "", 200);
    const subject = sanitize(req.data?.subject || "", 500);
    const text    = sanitize(req.data?.text    || "", 10_000);
    const html    = req.data?.html ? sanitize(req.data.html, 50_000) : undefined;

    if (!to || !subject || (!text && !html)) {
      throw new HttpsError("invalid-argument", "Missing: to, subject, text/html");
    }

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from: `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to, subject, text,
      ...(html ? { html } : {}),
    }));

    return { success: true };
  }
);

// ─── Send SMS ─────────────────────────────────────────────────────────────────
exports.sendSMS = onCall(
  { secrets: [BULKSMS_KEY, BULKSMS_SENDER] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
    const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
    if (callerSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");

    await checkRateLimit(req.auth.uid, "sendSMS");

    const phone   = sanitize(req.data?.phone   || "", 20);
    const message = sanitize(req.data?.message || "", 160);

    if (!phone || !message) throw new HttpsError("invalid-argument", "Missing: phone, message");

    const response = await withRetry(() => sendSMSRaw(phone, message));
    return { success: true, response };
  }
);

// ─── Send FCM push notification (admin only) ──────────────────────────────────
exports.sendPushNotification = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");

  const { token, title, body: msgBody, data } = req.data || {};
  if (!token || !title) throw new HttpsError("invalid-argument", "Missing: token, title");

  await fcm.send({
    token,
    notification: { title: sanitize(title, 100), body: sanitize(msgBody || "", 500) },
    data: data || {},
  });
  return { success: true };
});

// ─── Send batch push notification to all users (or by role) ─── admin only ────
exports.sendBatchNotification = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");

  const { title, body: msgBody, targetRole, data } = req.data || {};
  if (!title || !msgBody) throw new HttpsError("invalid-argument", "Missing: title, body");

  let q = db.collection("users");
  if (targetRole) q = q.where("role", "==", targetRole);
  const snap   = await q.get();
  const tokens = snap.docs.map((d) => d.data().fcmToken).filter(Boolean);

  if (!tokens.length) return { success: true, sent: 0, failed: 0 };

  const result = await fcm.sendEachForMulticast({
    tokens,
    notification: { title: sanitize(title, 100), body: sanitize(msgBody, 500) },
    data: data || {},
  });
  return { success: true, sent: result.successCount, failed: result.failureCount };
});

// ─── Validate (and optionally apply) a coupon ─────────────────────────────────
exports.validateCoupon = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");

  const { code, packageId, amount = 0, apply = false } = req.data || {};
  if (!code) throw new HttpsError("invalid-argument", "Missing: code");

  const codeUpper = sanitize(code, 50).toUpperCase();
  const snap = await db.collection("coupons")
    .where("code", "==", codeUpper).where("active", "==", true).limit(1).get();

  if (snap.empty) throw new HttpsError("not-found", "Invalid coupon code");

  const couponDoc = snap.docs[0];
  const coupon    = couponDoc.data();

  if (coupon.expiresAt && coupon.expiresAt.toMillis() < Date.now())
    throw new HttpsError("failed-precondition", "Coupon has expired");

  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses)
    throw new HttpsError("resource-exhausted", "Coupon usage limit reached");

  if (coupon.packageIds?.length && packageId && !coupon.packageIds.includes(packageId))
    throw new HttpsError("failed-precondition", "Coupon not valid for this package");

  const base = parseFloat(amount) || 0;
  let discountAmount = 0;
  if (coupon.type === "percent") discountAmount = Math.round(base * (coupon.value / 100));
  if (coupon.type === "fixed")   discountAmount = Math.min(coupon.value, base);

  if (apply) {
    await db.runTransaction(async (txn) => {
      const fresh = await txn.get(couponDoc.ref);
      const fd    = fresh.data();
      if (fd.maxUses && (fd.usedCount || 0) >= fd.maxUses) {
        throw new HttpsError("resource-exhausted", "Coupon usage limit reached");
      }
      txn.update(couponDoc.ref, { usedCount: admin.firestore.FieldValue.increment(1) });
    });
  }

  return {
    valid:         true,
    discountType:  coupon.type,
    discountValue: coupon.value,
    discountAmount,
    finalAmount:   Math.max(0, base - discountAmount),
    description:   coupon.description || "",
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── New public order → email admin + in-app notification ────────────────────
exports.onNewOrder = onDocumentCreated(
  { document: "tasks/{taskId}", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC] },
  async (event) => {
    const task = event.data?.data();
    if (!task || !task.publicOrder) return;

    const { title, client, packageName, clientEmail, clientPhone } = task;
    const adminEmail = ADMIN_EMAIL_SEC.value();

    if (adminEmail) {
      const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
      await withRetry(() => transport.sendMail({
        from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
        to:      adminEmail,
        subject: sanitizeSubject(`New Order: ${packageName || title} — ${client}`),
        text:    `New order!\n\nClient: ${client}\nEmail: ${clientEmail || "N/A"}\nPhone: ${clientPhone || "N/A"}\nPackage: ${packageName || "N/A"}\nProject: ${title}`,
      })).catch((e) => console.error("Order email error:", e));
    }

    await createAdminNotification("New Order", `${client} placed a ${packageName || "new"} order`, "order");

    // Auto-categorize task based on keywords + update client lastOrderAt
    const category = detectTaskCategory(title, task.description || "");
    const updates  = { category };

    // Update client's lastOrderAt so churn detection works
    if (task.clientUid) {
      updates.clientLastOrderAt = admin.firestore.FieldValue.serverTimestamp();
      db.doc(`users/${task.clientUid}`).set({ lastOrderAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    } else if (clientEmail) {
      db.collection("users").where("email", "==", clientEmail).limit(1).get().then((s) => {
        if (!s.empty) s.docs[0].ref.set({ lastOrderAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }).catch(() => {});
    }

    await event.data.ref.update(updates).catch(() => {});
  }
);

// ─── New booking → email admin + SMS confirmation to client ──────────────────
exports.onNewBooking = onDocumentCreated(
  { document: "bookings/{bookingId}", secrets: [EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC, BULKSMS_KEY, BULKSMS_SENDER] },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    const { name, email, phone, service, date, message: msg } = booking;
    const adminEmail = ADMIN_EMAIL_SEC.value();

    // Email admin
    if (adminEmail) {
      const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
      await withRetry(() => transport.sendMail({
        from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
        to:      adminEmail,
        subject: sanitizeSubject(`New Booking: ${name} — ${service || "Studio Session"}`),
        text:    `New booking!\n\nName: ${name}\nEmail: ${email || "N/A"}\nPhone: ${phone || "N/A"}\nService: ${service || "N/A"}\nDate: ${date || "N/A"}\nMessage: ${msg || "None"}`,
      })).catch((e) => console.error("Booking admin email error:", e));
    }

    // SMS confirmation to the client (deduped: won't repeat within 1h)
    if (phone) {
      const dateStr = date ? ` on ${new Date(date).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : "";
      await sendSMSDedup(
        phone,
        `booking_confirm_${event.params.bookingId}`,
        `Hi ${name}, your ${service || "studio session"} booking request${dateStr} has been received. We'll confirm within 24 hours. - Tanvir Studio`,
        86_400_000 // 24h dedup for booking confirms
      ).catch(() => {});
    }

    // Duplicate booking detection: same email or phone within last 24h
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 86400 * 1000);
    const [emailDups, phoneDups] = await Promise.all([
      email ? db.collection("bookings").where("email", "==", email).limit(5).get().catch(() => null) : null,
      phone ? db.collection("bookings").where("phone", "==", phone).limit(5).get().catch(() => null) : null,
    ]);
    const isDuplicate = [emailDups, phoneDups].some((snap) =>
      snap && snap.docs.filter((d) => d.id !== event.params.bookingId).some((d) => {
        const createdMs = d.data().createdAt?.toMillis?.() || new Date(d.data().createdAt || 0).getTime();
        return createdMs > oneDayAgo.toMillis();
      })
    );
    if (isDuplicate) {
      await event.data.ref.update({ flagged: true, flagReason: "Possible duplicate booking" }).catch(() => {});
    }

    await createAdminNotification(
      isDuplicate ? "⚠️ Duplicate Booking Flagged" : "New Booking",
      `${name} booked a ${service || "session"} for ${date || "TBD"}${isDuplicate ? " — possible duplicate, please review" : ""}`,
      isDuplicate ? "warning" : "booking"
    );
  }
);

// ─── New user → welcome email to clients only ─────────────────────────────────
exports.onNewUser = onDocumentCreated(
  { document: "users/{userId}", secrets: [EMAIL_USER, EMAIL_PASS] },
  async (event) => {
    const user = event.data?.data();
    if (!user || user.role !== "client" || !user.email) return;

    const name = user.name || user.email.split("@")[0] || "there";

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      user.email,
      subject: sanitizeSubject(`Welcome to Tanvir Studio, ${name}!`),
      html: htmlWrap("Welcome!", `
        <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:22px">Welcome, ${esc(name)}! &#127925;</h2>
        ${para("We're thrilled to have you at <strong>Tanvir Studio</strong> — your go-to destination for professional music production, recording, and mixing.")}
        ${para("You can now place orders, track projects, and download your completed files — all from your personal dashboard.")}
        ${btn("Go to Dashboard →", "https://tanvirstudio.com/dashboard")}
        ${para(`<span style="font-size:13px;color:#aaa">Have questions? Just reply to this email.</span>`)}
      `),
      text: `Welcome to Tanvir Studio, ${name}! You can track your orders and download files at tanvirstudio.com/dashboard. - Tanvir Studio`,
    })).catch((e) => console.error("Welcome email error:", e));
  }
);

// ─── Task updated → status change notifications + staff assignment + audit ─────
exports.onTaskUpdated = onDocumentUpdated(
  { document: "tasks/{taskId}", secrets: [EMAIL_USER, EMAIL_PASS, BULKSMS_KEY, BULKSMS_SENDER] },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    const taskId = event.params.taskId;

    // Audit log on every update
    const changedFields = Object.keys(after).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );
    await db.collection("auditLogs").add({
      type:          "task_updated",
      taskId,
      changedFields,
      before:        { status: before.status, composerId: before.composerId, hummingArtistId: before.hummingArtistId },
      after:         { status: after.status,  composerId: after.composerId,  hummingArtistId: after.hummingArtistId  },
      timestamp:     admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    const statusChanged = before.status !== after.status;

    // Set completedAt timestamp when task is marked complete
    if (statusChanged && after.status === "completed" && !after.completedAt) {
      await event.data.after.ref.update({ completedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
    }

    // Keep balance field in sync so checkOverduePayments query (balance > 0) works
    if (before.budget !== after.budget || before.advance !== after.advance) {
      const _budget  = Number(after.budget  || 0);
      const _advance = Math.min(Number(after.advance || 0), _budget);
      await event.data.after.ref.update({ balance: Math.max(0, _budget - _advance) }).catch(() => {});
    }

    // Staff performance + client LTV on completion (only once — guard re-completion)
    if (statusChanged && after.status === "completed" && !after.ltvCounted) {
      await event.data.after.ref.update({ ltvCounted: true }).catch(() => {});
      // Turnaround days: completedAt - createdAt
      const completedMs = after.completedAt?.toMillis?.() || Date.now();
      const createdMs   = after.createdAt ? new Date(after.createdAt).getTime() : null;
      const turnaroundDays = createdMs ? Math.max(1, Math.round((completedMs - createdMs) / 86400000)) : null;

      // Staff: increment tasksCompleted + update rolling avg turnaround
      const staffUids = [after.composerId, after.hummingArtistId].filter(Boolean);
      await Promise.all(staffUids.map(async (uid) => {
        const ref = db.doc(`performanceMetrics/${uid}`);
        const snap = await ref.get().catch(() => null);
        const current = snap?.data() || {};
        const prevCompleted = Number(current.tasksCompleted || 0);
        const prevAvg       = Number(current.avgTurnaroundDays || 0);
        const newAvg = turnaroundDays !== null && prevCompleted > 0
          ? Math.round((prevAvg * prevCompleted + turnaroundDays) / (prevCompleted + 1))
          : (turnaroundDays || prevAvg);
        return ref.set({
          tasksCompleted:    admin.firestore.FieldValue.increment(1),
          avgTurnaroundDays: newAvg,
          totalRevenue:      admin.firestore.FieldValue.increment(Number(after.budget || 0)),
          lastUpdated:       admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      })).catch(() => {});

      // Staff milestone: celebrate every 10/25/50/100 completed tasks
      const MILESTONES = new Set([10, 25, 50, 100, 200, 500]);
      for (const uid of staffUids) {
        const perfDoc = await db.doc(`performanceMetrics/${uid}`).get().catch(() => null);
        const newCount = Number(perfDoc?.data()?.tasksCompleted || 0); // already incremented above
        if (MILESTONES.has(newCount)) {
          await db.collection("notifications").add({
            recipientId: uid,
            title:       `Milestone: ${newCount} Tasks Completed!`,
            message:     `Congratulations — you've completed ${newCount} tasks at Tanvir Studio. Outstanding work!`,
            type:        "success",
            read:        false,
            createdAt:   admin.firestore.FieldValue.serverTimestamp(),
            expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
          }).catch(() => {});
        }
      }

      // Client LTV: totalSpent + orderCount + lastOrderAt + segment
      if (after.clientUid) {
        const clientRef  = db.doc(`users/${after.clientUid}`);
        const clientSnap = await clientRef.get().catch(() => null);
        const current    = clientSnap?.data() || {};
        const newTotal   = Number(current.totalSpent || 0) + Number(after.budget || 0);
        const newCount   = Number(current.orderCount || 0) + 1;
        // Segment: VIP ≥ 3 orders or ≥ 15000 spent, else Regular, new client = first order
        const segment = newTotal >= 15000 || newCount >= 3 ? "vip" : newCount === 1 ? "new" : "regular";
        await clientRef.set({
          totalSpent:  newTotal,
          orderCount:  newCount,
          lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
          segment,
        }, { merge: true }).catch(() => {});
      }
    }

    // Notify staff when they are assigned to a task
    const newComposer = !before.composerId && after.composerId;
    const newArtist   = !before.hummingArtistId && after.hummingArtistId;

    if (newComposer) {
      await db.collection("notifications").add({
        recipientId: after.composerId,
        title:       "New Task Assigned",
        message:     `You have been assigned to "${after.title || taskId}" as composer.`,
        type:        "info",
        read:        false,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
      }).catch(() => {});
    }
    if (newArtist) {
      await db.collection("notifications").add({
        recipientId: after.hummingArtistId,
        title:       "New Task Assigned",
        message:     `You have been assigned to "${after.title || taskId}" as humming artist.`,
        type:        "info",
        read:        false,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
      }).catch(() => {});
    }

    // Client notifications on status change
    if (!statusChanged) return;
    const tpl = STATUS_TEMPLATES[after.status];
    if (!tpl) return;

    const {
      client:      clientName = "Client",
      clientEmail,
      clientPhone,
      clientUid,
      packageName  = "",
      title        = "",
      sessionDate  = "",
    } = after;

    const refShort = taskId.slice(0, 8).toUpperCase();

    // HTML email to client (with retry)
    if (clientEmail) {
      const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());

      // For completed tasks with financial data: merge invoice into the email
      let emailHtml  = tpl.html(clientName, packageName, title, sessionDate);
      let emailSubj  = tpl.subject(packageName);
      if (after.status === "completed" && (after.budget > 0 || after.advance > 0)) {
        const budget   = Number(after.budget  || 0);
        const advance  = Math.min(Number(after.advance || 0), budget); // cap advance at budget to prevent negative balance
        const balance  = Number(after.balance || Math.max(0, budget - advance));
        const refNo    = after.orderRef || taskId.slice(0, 8).toUpperCase();
        const dateStr  = new Date().toLocaleDateString("en-GB", { dateStyle: "medium" });
        const invoiceRows = [
          ["Package",      packageName || title],
          ["Reference",    refNo],
          ["Date",         dateStr],
          ["Total",        `&#2547;${budget.toLocaleString()}`],
          ["Paid (Advance)", `&#2547;${advance.toLocaleString()}`],
          ["Balance Due",  balance > 0 ? `<strong style="color:#dc2626">&#2547;${balance.toLocaleString()}</strong>` : `<span style="color:#16a34a">&#2547;0 (Fully Paid)</span>`],
        ].map(([k, v]) =>
          `<tr><td style="padding:10px 16px;color:#555;font-size:13px;border-top:1px solid #eee">${k}</td><td style="padding:10px 16px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #eee">${v}</td></tr>`
        ).join("");

        emailSubj = `Project complete + Invoice — ${packageName}`;
        emailHtml = htmlWrap(`Project Complete + Invoice — ${packageName}`, `
          <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your project is ready! &#127775;</h2>
          ${para(`Hi <strong>${clientName}</strong>, your <strong>"${title}"</strong> (${packageName}) is now complete. Here is your invoice summary.`)}
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:0 0 20px">
            <tr style="background:#f9f9f9">
              <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Description</td>
              <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right">Amount</td>
            </tr>
            ${invoiceRows}
          </table>
          ${balance > 0 ? para(`<strong>Please complete the remaining payment of &#2547;${balance.toLocaleString()} at your earliest convenience.</strong>`) : para("Your account is fully settled. Thank you!")}
          ${btn("Download Files →", "https://tanvirstudio.com/dashboard")}
          ${para(`<span style="font-size:12px;color:#bbb">Invoice Ref: ${refNo}</span>`)}
        `);
      }

      await withRetry(() => transport.sendMail({
        from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
        to:      clientEmail,
        subject: emailSubj,
        html:    emailHtml,
        text:    `Hi ${clientName}, your ${packageName} order status changed to ${after.status}. - Tanvir Studio`,
      })).catch((e) => console.error("Status email error:", e));
    }

    // Deduped SMS to client
    if (clientPhone) {
      await sendSMSDedup(
        clientPhone,
        `status_${taskId}_${after.status}`,
        tpl.sms(clientName, packageName, refShort)
      ).catch(() => {});
    }

    // FCM push to client (if they have a token)
    if (clientUid) {
      try {
        const clientDoc = await db.doc(`users/${clientUid}`).get();
        const fcmToken  = clientDoc.data()?.fcmToken;
        if (fcmToken) {
          const [notifTitle, notifMsg] = tpl.notif(packageName);
          await fcm.send({ token: fcmToken, notification: { title: notifTitle, body: notifMsg } }).catch(() => {});
        }
      } catch { /* non-critical */ }
    }

    // In-app notification for client
    if (clientUid) {
      const [notifTitle, notifMsg, notifType] = tpl.notif(packageName);
      await db.collection("notifications").add({
        recipientId: clientUid,
        title:       notifTitle,
        message:     notifMsg,
        type:        notifType,
        read:        false,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
      }).catch(() => {});
    }
  }
);

// ─── Auto-archive completed/declined tasks older than 6 months (daily 2am Dhaka) ─
exports.autoArchiveTasks = onSchedule(
  { schedule: "0 2 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 180 * 86400 * 1000);

    // Try completedAt first; fallback to createdAt for tasks without completedAt
    const [byCompleted, byCreated] = await Promise.all([
      db.collection("tasks")
        .where("status", "in", ["completed", "declined"])
        .where("completedAt", "<=", cutoff)
        .limit(50)
        .get().catch(() => ({ empty: true, docs: [] })),
      db.collection("tasks")
        .where("status", "in", ["completed", "declined"])
        .where("createdAt", "<=", cutoff)
        .limit(50)
        .get().catch(() => ({ empty: true, docs: [] })),
    ]);

    const seen = new Set();
    const candidates = [];
    for (const d of [...byCompleted.docs, ...byCreated.docs]) {
      if (!seen.has(d.id)) { seen.add(d.id); candidates.push(d); }
    }

    if (!candidates.length) { console.log("No tasks to archive"); return; }

    const batch = db.batch();
    for (const d of candidates) {
      const archiveRef = db.collection("archivedTasks").doc(d.id);
      batch.set(archiveRef, { ...d.data(), archivedAt: admin.firestore.FieldValue.serverTimestamp() });
      batch.delete(d.ref);
    }
    await batch.commit();
    console.log(`Archived ${candidates.length} old tasks`);
  }
);

// ─── Validate file upload (size + MIME type) — callable ───────────────────────
exports.validateFileUpload = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");

  const { fileName = "", fileSize = 0, mimeType = "" } = req.data || {};

  const ALLOWED_TYPES = new Set([
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff",
    "audio/flac", "audio/ogg", "audio/mp4", "audio/aac", "audio/webm",
    "video/mp4", "video/quicktime", "video/webm",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  if (fileSize > MAX_BYTES) {
    throw new HttpsError("invalid-argument", `File too large (max 50 MB). Your file: ${(fileSize / 1024 / 1024).toFixed(1)} MB.`);
  }
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new HttpsError("invalid-argument", `File type not allowed: ${mimeType || "unknown"}`);
  }

  return { valid: true, fileName: sanitize(fileName, 200) };
});

// ─── Task deleted → cleanup Storage files + audit log ────────────────────────
exports.onTaskDeleted = onDocumentDeleted("tasks/{taskId}", async (event) => {
  const taskId = event.params.taskId;
  const task   = event.data?.data();

  await db.collection("auditLogs").add({
    type:      "task_deleted",
    taskId,
    snapshot:  { title: task?.title, client: task?.client, status: task?.status },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});

  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: `tasks/${taskId}/` });
    if (files.length > 0) {
      await Promise.all(files.map((f) => f.delete().catch(() => {})));
      console.log(`Deleted ${files.length} Storage files for task ${taskId}`);
    }
  } catch (e) { console.error("Storage cleanup error:", e); }
});

// ─── Post-completion payment chase — 7 days after completed, unpaid balance ───
exports.postCompletionPaymentChase = onSchedule(
  { schedule: "0 5 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400 * 1000);
    const eightDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 8 * 86400 * 1000);

    const snap = await db.collection("tasks")
      .where("status",                  "==",  "completed")
      .where("postCompletionChaseSent", "!=",  true)
      .where("completedAt",             ">=",  eightDaysAgo)
      .where("completedAt",             "<=",  sevenDaysAgo)
      .get().catch(() => ({ docs: [] }));

    const due = snap.docs.filter((d) => {
      const { budget = 0, advance = 0, balance, clientEmail } = d.data();
      if (!clientEmail) return false;
      const unpaid = balance !== undefined ? Number(balance) : Math.max(0, Number(budget) - Number(advance));
      return unpaid > 0;
    });

    if (!due.length) return;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    for (const d of due) {
      const task = d.data();
      const budget  = Number(task.budget  || 0);
      const advance = Number(task.advance || 0);
      const unpaid  = task.balance !== undefined ? Number(task.balance) : Math.max(0, budget - advance);
      const name    = task.client || "there";
      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      task.clientEmail,
          subject: `Payment outstanding — ${task.packageName || task.title}`,
          html: htmlWrap("Friendly Payment Reminder", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your project is complete — one last step &#128176;</h2>
            ${para(`Hi <strong>${name}</strong>, your <strong>${task.packageName || task.title}</strong> is complete and the files are ready.`)}
            ${para(`We noticed there is an outstanding balance of <strong style="color:#dc2626">&#2547;${unpaid.toLocaleString()}</strong> on your account.`)}
            ${para("Please complete the payment at your earliest convenience so we can keep working together!")}
            ${btn("Pay Now →", "https://tanvirstudio.com/dashboard")}
            ${para(`<span style="font-size:12px;color:#bbb">Ref: ${task.orderRef || d.id.slice(0,8).toUpperCase()}</span>`)}
          `),
          text: `Hi ${name}, your ${task.packageName || task.title} project is complete. Outstanding balance: ৳${unpaid}. Please pay at tanvirstudio.com/dashboard - Tanvir Studio`,
        }));
        await d.ref.update({ postCompletionChaseSent: true });
      } catch (e) { console.error("Post-completion chase error:", e); }
    }
    if (due.length) console.log(`Sent ${due.length} post-completion payment chase emails`);
  }
);

// ─── Weekly client progress email — Monday 10am Dhaka ─────────────────────────
exports.weeklyClientProgress = onSchedule(
  { schedule: "0 10 * * 1", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const snap = await db.collection("tasks")
      .where("status", "in", ["accepted", "in_progress"])
      .get().catch(() => ({ docs: [] }));

    // Group by clientEmail
    const byClient = {};
    snap.docs.forEach((d) => {
      const task = d.data();
      if (!task.clientEmail) return;
      if (!byClient[task.clientEmail]) byClient[task.clientEmail] = { name: task.client || "there", tasks: [] };
      byClient[task.clientEmail].tasks.push(task);
    });

    if (!Object.keys(byClient).length) return;

    const STATUS_LABEL = { accepted: "Accepted", in_progress: "In Progress", pending: "Pending Review" };
    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    let sent = 0;

    for (const [email, { name, tasks }] of Object.entries(byClient)) {
      const rows = tasks.map((t) => {
        const dl = getDeadlineMs(t);
        const dlStr = dl ? new Date(dl).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "TBD";
        return `<tr>
          <td style="padding:10px 16px;color:#333;font-size:13px;border-top:1px solid #eee">${t.title || t.packageName || "Project"}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:600;text-align:center;border-top:1px solid #eee;color:#2563eb">${STATUS_LABEL[t.status] || t.status}</td>
          <td style="padding:10px 16px;font-size:13px;text-align:right;border-top:1px solid #eee;color:#555">${dlStr}</td>
        </tr>`;
      }).join("");

      try {
        await withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      email,
          subject: `Your project update — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          html: htmlWrap("Weekly Project Update", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Here's your weekly update, ${name}! &#127925;</h2>
            ${para("Here's a quick snapshot of your active projects at Tanvir Studio:")}
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;margin:0 0 20px">
              <tr style="background:#f9f9f9">
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase">Project</td>
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;text-align:center">Status</td>
                <td style="padding:10px 16px;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;text-align:right">Deadline</td>
              </tr>
              ${rows}
            </table>
            ${para("Check your dashboard for files, updates, and messages.")}
            ${btn("View Dashboard →", "https://tanvirstudio.com/dashboard")}
          `),
          text: `Hi ${name}, here's your weekly project update from Tanvir Studio. ${tasks.length} active project(s). View at tanvirstudio.com/dashboard`,
        }));
        sent++;
      } catch (e) { console.error("Weekly progress email error:", e); }
    }
    if (sent) console.log(`Sent ${sent} weekly client progress emails`);
  }
);

// ─── Client onboarding sequence — day 3 and day 7 follow-ups ─────────────────
exports.clientOnboarding = onSchedule(
  { schedule: "0 11 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const now = Date.now();
    const day3Start = now - 4 * 86400 * 1000;  // 3-4 days ago window
    const day3End   = now - 3 * 86400 * 1000;
    const day7Start = now - 8 * 86400 * 1000;  // 7-8 days ago window
    const day7End   = now - 7 * 86400 * 1000;

    const snap = await db.collection("users").where("role", "==", "client").get();
    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());

    for (const d of snap.docs) {
      const user = d.data();
      if (!user.email) continue;
      const createdMs = user.createdAt ? new Date(user.createdAt).getTime() : null;
      if (!createdMs) continue;

      const name = user.name || user.email.split("@")[0] || "there";

      // Day 3: tips + portfolio nudge
      if (createdMs >= day3Start && createdMs <= day3End && !user.onboarding3Sent) {
        try {
          await withRetry(() => transport.sendMail({
            from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
            to:      user.email,
            subject: `Getting the most out of Tanvir Studio, ${name}`,
            html: htmlWrap("Studio Tips", `
              <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">A few tips to get started &#128161;</h2>
              ${para(`Hi <strong>${name}</strong>, it's been a few days since you joined Tanvir Studio!`)}
              ${para("Here's how to get the best results from us:")}
              <ul style="color:#555;font-size:14px;line-height:2;padding-left:20px;margin:0 0 16px">
                <li>Upload your raw audio files through the dashboard for fastest processing</li>
                <li>Include a reference track or YouTube link so we match your style perfectly</li>
                <li>Use the notes field to describe your vision — tempo, mood, genre, key</li>
                <li>Check your dashboard for real-time status updates</li>
              </ul>
              ${btn("Explore Packages →", "https://tanvirstudio.com/#packages")}
            `),
            text: `Hi ${name}, a few tips to get the best results at Tanvir Studio: upload reference tracks, describe your vision, and check your dashboard for updates. - Tanvir Studio`,
          }));
          await d.ref.update({ onboarding3Sent: true });
        } catch (e) { console.error("Onboarding day-3 error:", e); }
      }

      // Day 7: portfolio showcase + invite to book
      if (createdMs >= day7Start && createdMs <= day7End && !user.onboarding7Sent) {
        try {
          await withRetry(() => transport.sendMail({
            from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
            to:      user.email,
            subject: `See what we've created for our clients — Tanvir Studio`,
            html: htmlWrap("Client Showcase", `
              <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Take a look at our work &#127925;</h2>
              ${para(`Hi <strong>${name}</strong>, one week in — welcome to the family!`)}
              ${para("Check out our portfolio to hear what we've produced for clients just like you — from raw vocals to chart-ready releases.")}
              ${btn("Hear Our Work →", "https://tanvirstudio.com/portfolio")}
              ${para("Ready to start your next project? Book a session or place an order anytime.")}
              ${btn("Book a Session →", "https://tanvirstudio.com/booking")}
              ${para(`<span style="font-size:12px;color:#bbb">You're receiving this as a new Tanvir Studio member.</span>`)}
            `),
            text: `Hi ${name}, it's been a week! Check out our portfolio at tanvirstudio.com/portfolio and book your next session. - Tanvir Studio`,
          }));
          await d.ref.update({ onboarding7Sent: true });
        } catch (e) { console.error("Onboarding day-7 error:", e); }
      }
    }
  }
);

// ─── Auto-close stale bookings — 7+ days pending with no response ─────────────
exports.autoCloseStaleBookings = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Asia/Dhaka", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400 * 1000);

    const snap = await db.collection("bookings")
      .where("status", "==", "pending")
      .get().catch(() => ({ docs: [] }));

    const stale = snap.docs.filter((d) => {
      const { createdAt, staleCloseSent } = d.data();
      if (staleCloseSent) return false;
      const ms = createdAt?.toMillis?.() || (createdAt ? new Date(createdAt).getTime() : null);
      return ms && ms < cutoff.toMillis();
    });

    if (!stale.length) return;

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    const batch = db.batch();

    for (const d of stale) {
      const booking = d.data();
      batch.update(d.ref, { status: "expired", staleCloseSent: true });

      if (booking.email) {
        const name = booking.name || "there";
        withRetry(() => transport.sendMail({
          from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
          to:      booking.email,
          subject: `Your booking has expired — Tanvir Studio`,
          html: htmlWrap("Booking Expired", `
            <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your booking has expired &#128337;</h2>
            ${para(`Hi <strong>${name}</strong>, your <strong>${booking.service || "studio session"}</strong> booking from ${new Date(booking.createdAt?.toDate?.() || booking.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} has been automatically closed after 7 days.`)}
            ${para("We'd love to work with you — please book again anytime and we'll get back to you within 24 hours.")}
            ${btn("Book Again →", "https://tanvirstudio.com/booking")}
          `),
          text: `Hi ${name}, your ${booking.service || "studio session"} booking has expired. Please re-book at tanvirstudio.com/booking - Tanvir Studio`,
        })).catch(() => {});
      }
    }

    await batch.commit();
    console.log(`Auto-closed ${stale.length} stale bookings`);

    if (stale.length >= 3) {
      await createAdminNotification(
        "Stale Bookings Closed",
        `${stale.length} bookings expired after 7 days of no response.`,
        "info"
      );
    }
  }
);

// ─── Referral tracking — award a coupon after referee's 2nd order converts ─────
// onNewOrder already runs; we hook into it via a separate trigger on tasks
exports.onReferralConverted = onDocumentCreated(
  { document: "tasks/{taskId}", secrets: [EMAIL_USER, EMAIL_PASS] },
  async (event) => {
    const task = event.data?.data();
    if (!task || !task.publicOrder || !task.referredBy) return;

    const referrerId = task.referredBy; // uid of the person who referred this client

    // Count total converted referrals for this referrer
    const refSnap = await db.collection("tasks")
      .where("referredBy", "==", referrerId)
      .where("publicOrder", "==", true)
      .get().catch(() => null);

    if (!refSnap) return;
    const totalReferrals = refSnap.size; // includes this new one

    // Award a coupon on the 2nd and every 5th referral
    const shouldAward = totalReferrals === 2 || totalReferrals % 5 === 0;
    if (!shouldAward) return;

    const referrerSnap = await db.doc(`users/${referrerId}`).get().catch(() => null);
    if (!referrerSnap || !referrerSnap.exists) return;
    const referrer = referrerSnap.data();

    const discountPct = totalReferrals >= 5 ? 15 : 10; // 10% for 2nd, 15% for 5th+
    const couponCode  = `REF-${referrerId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const expiresAt   = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000); // 30 days

    await db.collection("coupons").add({
      code:      couponCode,
      type:      "percent",
      value:     discountPct,
      active:    true,
      usedCount: 0,
      maxUses:   1,
      expiresAt,
      ownerId:   referrerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: `Referral reward for ${referrer.name || referrer.email || referrerId}`,
    });

    // Notify in-app
    await db.collection("notifications").add({
      recipientId: referrerId,
      title:       `Referral Reward — ${discountPct}% Off Coupon!`,
      message:     `Thanks for referring a client! Your ${discountPct}% discount coupon: ${couponCode} (valid 30 days).`,
      type:        "success",
      read:        false,
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
    }).catch(() => {});

    // Email the referrer
    if (referrer.email) {
      const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
      withRetry(() => transport.sendMail({
        from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
        to:      referrer.email,
        subject: `You earned a referral reward — ${discountPct}% off!`,
        html: htmlWrap("Referral Reward!", `
          <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Thanks for spreading the word! &#127381;</h2>
          ${para(`Hi <strong>${referrer.name || "there"}</strong>, one of your referrals just placed an order — that's ${totalReferrals} total referrals from you!`)}
          ${para(`As a thank you, here's your exclusive coupon code for <strong>${discountPct}% off</strong> your next order (valid 30 days):`)}
          <div style="text-align:center;margin:24px 0;background:#f5f3ff;border-radius:10px;padding:20px">
            <span style="font-size:28px;font-weight:900;letter-spacing:4px;color:#1a0a2e">${couponCode}</span>
          </div>
          ${btn("Use Coupon →", "https://tanvirstudio.com/#packages")}
          ${para(`<span style="font-size:12px;color:#bbb">Single use, expires in 30 days.</span>`)}
        `),
        text: `Hi ${referrer.name || "there"}, thanks for your referrals! Your ${discountPct}% coupon: ${couponCode} (30-day expiry). - Tanvir Studio`,
      })).catch(() => {});
    }

    console.log(`Referral coupon ${couponCode} (${discountPct}%) created for ${referrerId} after ${totalReferrals} referrals`);
  }
);

// ─── Rate-limit public form submissions (max 3 per email per hour) ─────────────
// Used by both contact and booking forms via a callable wrapper
exports.submitPublicContactForm = onCall(async (req) => {
  const { name, email, phone, message, subject, honeypot } = req.data || {};

  // Honeypot: bots fill hidden fields
  if (honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email/phone per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "contact_ip", 8, 3_600_000);

  const safeEmail   = sanitize(email || "", 200).toLowerCase();
  const safeName    = sanitize(name    || "", 200);
  const safePhone   = sanitize(phone   || "", 20);
  const safeMessage = sanitize(message || "", 3000);
  const safeSubject = sanitize(subject || "Contact Enquiry", 300);

  if (!safeName || !safeMessage) throw new HttpsError("invalid-argument", "Name and message required");

  // Rate limit: max 3 submissions per email per hour (use phone if no email)
  const limitKey = safeEmail || (safePhone ? `ph_${normalizeBDPhone(safePhone)}` : null);
  if (limitKey) {
    const rlRef  = db.doc(`rateLimits/contact_${limitKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60)}`);
    const rlSnap = await rlRef.get();
    const now    = Date.now();
    if (rlSnap.exists) {
      const { count, windowStart } = rlSnap.data();
      if (now - windowStart < 3_600_000 && count >= 3) {
        throw new HttpsError("resource-exhausted", "Too many submissions. Please try again in an hour.");
      }
      if (now - windowStart < 3_600_000) {
        await rlRef.update({ count: admin.firestore.FieldValue.increment(1) });
      } else {
        await rlRef.set({ count: 1, windowStart: now });
      }
    } else {
      await rlRef.set({ count: 1, windowStart: now });
    }
  }

  await db.collection("contacts").add({
    name:      safeName,
    email:     safeEmail,
    phone:     safePhone,
    subject:   safeSubject,
    message:   safeMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await createAdminNotification(
    "New Contact Form",
    `${safeName}${safeEmail ? ` (${safeEmail})` : ""}: ${safeMessage.slice(0, 80)}${safeMessage.length > 80 ? "…" : ""}`,
    "info"
  );

  return { success: true };
});

exports.submitPublicOrder = onCall(async (req) => {
  const data = req.data || {};
  
  if (data.honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "order_ip", 8, 3_600_000);

  const safeEmail = sanitize(data.clientEmail || "", 200).toLowerCase();
  if (!safeEmail) throw new HttpsError("invalid-argument", "Email required");

  const limitKey = safeEmail;
  const rlRef  = db.doc(`rateLimits/order_${limitKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60)}`);
  const rlSnap = await rlRef.get();
  const now    = Date.now();
  if (rlSnap.exists) {
    const { count, windowStart } = rlSnap.data();
    if (now - windowStart < 3_600_000 && count >= 3) {
      throw new HttpsError("resource-exhausted", "Too many orders. Please try again later.");
    }
    if (now - windowStart < 3_600_000) {
      await rlRef.update({ count: admin.firestore.FieldValue.increment(1) });
    } else {
      await rlRef.set({ count: 1, windowStart: now });
    }
  } else {
    await rlRef.set({ count: 1, windowStart: now });
  }

  // Enforce validation constraints. Public submissions are unauthenticated, so
  // treat these as untrusted display values, not a real payment record: cap them
  // at a sane ceiling and never let the claimed advance exceed the claimed budget
  // (prevents a fake "already paid" number from misleading staff).
  const MAX_PUBLIC_ORDER_AMOUNT = 5_000_000;
  const safeBudget = Math.min(MAX_PUBLIC_ORDER_AMOUNT, Math.max(0, Number(data.budget) || 0));
  const safeAdvance = Math.min(safeBudget, Math.max(0, Number(data.advance) || 0));

  const docData = {
    title: sanitize(data.title || "New Order", 200),
    client: sanitize(data.client || "Client", 100),
    clientEmail: safeEmail,
    clientPhone: sanitize(data.clientPhone || "", 30),
    songName: sanitize(data.songName || "", 100),
    description: sanitize(data.description || "", 3000),
    budget: safeBudget,
    advance: safeAdvance,
    status: 'pending',
    priority: sanitize(data.priority || 'normal', 20),
    needsHumming: Boolean(data.needsHumming),
    hasRecording: Boolean(data.hasRecording),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    publicOrder: true,
    packageName: sanitize(data.packageName || "", 100),
    orderRef: sanitize(data.orderRef || `TSN-${Date.now().toString(36).toUpperCase().slice(-6)}`, 50),
    clientUid: req.auth ? req.auth.uid : null, // link auth if logged in
  };
  
  if (data.couponCode) {
    docData.couponCode = sanitize(data.couponCode, 30);
    docData.couponDiscount = Math.min(safeBudget, Math.max(0, Number(data.couponDiscount) || 0));
  }

  const docRef = await db.collection("tasks").add(docData);
  
  await createAdminNotification(
    "New Order Received",
    `${docData.client} ordered ${docData.packageName || docData.songName}`,
    "success"
  );
  
  return { success: true, id: docRef.id };
});

exports.submitPublicBooking = onCall(async (req) => {
  const data = req.data || {};
  
  if (data.honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "booking_ip", 8, 3_600_000);

  const safeEmail = sanitize(data.email || "", 200).toLowerCase();
  if (!safeEmail) throw new HttpsError("invalid-argument", "Email required");

  const limitKey = safeEmail;
  const rlRef  = db.doc(`rateLimits/booking_${limitKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60)}`);
  const rlSnap = await rlRef.get();
  const now    = Date.now();
  if (rlSnap.exists) {
    const { count, windowStart } = rlSnap.data();
    if (now - windowStart < 3_600_000 && count >= 3) {
      throw new HttpsError("resource-exhausted", "Too many bookings. Please try again later.");
    }
    if (now - windowStart < 3_600_000) {
      await rlRef.update({ count: admin.firestore.FieldValue.increment(1) });
    } else {
      await rlRef.set({ count: 1, windowStart: now });
    }
  } else {
    await rlRef.set({ count: 1, windowStart: now });
  }

  const docData = {
    name: sanitize(data.name || "Client", 100),
    email: safeEmail,
    phone: sanitize(data.phone || "", 30),
    service: sanitize(data.service || "", 100),
    date: sanitize(data.date || "", 50),
    time: sanitize(data.time || "", 50),
    message: sanitize(data.message || "", 3000),
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    studioName: sanitize(data.studioName || "Tanvir Studio", 100),
    clientUid: req.auth ? req.auth.uid : null, // link auth if logged in
  };

  const docRef = await db.collection("bookings").add(docData);
  
  await createAdminNotification(
    "New Booking Request",
    `${docData.name} requested ${docData.service} on ${docData.date}`,
    "info"
  );

  return { success: true, id: docRef.id };
});

// ─── Helpers for stats/global maintenance ─────────────────────────────────────

function txMonthKey(tx) {
  const raw = tx.date
    || (tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString() : String(tx.createdAt || ""));
  const d = raw ? new Date(raw) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function statsIncrements(tx, multiplier) {
  const amt = (Number(tx.amount) || 0) * multiplier;
  const mk  = txMonthKey(tx);
  if (tx.type === "in") {
    return {
      allTimeIncome:             admin.firestore.FieldValue.increment(amt),
      [`monthly.${mk}.income`]:  admin.firestore.FieldValue.increment(amt),
    };
  }
  if (tx.type === "out") {
    return {
      allTimeExpenses:              admin.firestore.FieldValue.increment(amt),
      [`monthly.${mk}.expenses`]:   admin.firestore.FieldValue.increment(amt),
    };
  }
  return null;
}

// ─── Transaction created → update stats/global ────────────────────────────────
exports.onTransactionCreated = onDocumentCreated("transactions/{txId}", async (event) => {
  const tx = event.data?.data();
  if (!tx || tx.status !== "Completed" || tx.deleted) return;

  const inc = statsIncrements(tx, 1);
  if (!inc) return;

  await db.doc("stats/global").set(
    { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  ).catch((e) => console.error("[stats] onTransactionCreated:", e));
});

// ─── Transaction updated → keep stats in sync (status change or soft-delete) ──
exports.onTransactionUpdated = onDocumentUpdated("transactions/{txId}", async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  // Soft-delete: was active Completed → now deleted
  if (!before.deleted && after.deleted && before.status === "Completed") {
    const inc = statsIncrements(before, -1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(softDelete):", e));
    return;
  }

  // Status changed TO Completed
  if (before.status !== "Completed" && after.status === "Completed" && !after.deleted) {
    const inc = statsIncrements(after, 1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(completed):", e));
    return;
  }

  // Status changed FROM Completed (cancelled / uncompleted)
  if (before.status === "Completed" && after.status !== "Completed" && !before.deleted) {
    const inc = statsIncrements(before, -1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(uncompleted):", e));
  }
});
