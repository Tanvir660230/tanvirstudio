const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, EMAIL_USER, EMAIL_PASS } = require("../lib/init");
const { makeTransport, withRetry, createAdminNotification, getDeadlineMs } = require("../lib/helpers");
const { esc, sanitize, sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

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
    const createdMs = task.createdAt?.toMillis?.()
      || (task.createdAt ? new Date(task.createdAt).getTime() : null);
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
