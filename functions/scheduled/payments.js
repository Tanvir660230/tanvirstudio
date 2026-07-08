const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, EMAIL_USER, EMAIL_PASS } = require("../lib/init");
const { makeTransport, withRetry, getDeadlineMs } = require("../lib/helpers");
const { esc, sanitize, sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

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
