const { onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { admin, db, fcm, EMAIL_USER, EMAIL_PASS, BULKSMS_KEY, BULKSMS_SENDER } = require("../lib/init");
const { makeTransport, withRetry } = require("../lib/helpers");
const { sendSMSDedup } = require("../lib/sms");
const { htmlWrap, btn, para, STATUS_TEMPLATES } = require("../lib/email-templates");

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
      const createdMs   = after.createdAt?.toMillis?.()
        || (after.createdAt ? new Date(after.createdAt).getTime() : null);
      const turnaroundDays = createdMs ? Math.max(1, Math.round((completedMs - createdMs) / 86400000)) : null;

      // Staff: increment tasksCompleted + update rolling avg turnaround.
      // Runs as a transaction (read+write of the same doc) so two tasks completing
      // for the same staff member within the same instant can't clobber each other's update.
      const staffUids = [after.composerId, after.hummingArtistId].filter(Boolean);
      const staffResults = await Promise.all(staffUids.map((uid) =>
        db.runTransaction(async (tx) => {
          const ref  = db.doc(`performanceMetrics/${uid}`);
          const snap = await tx.get(ref);
          const current = snap.exists ? snap.data() : {};
          const prevCompleted = Number(current.tasksCompleted || 0);
          const prevAvg       = Number(current.avgTurnaroundDays || 0);
          const newCompleted  = prevCompleted + 1;
          const newAvg = turnaroundDays !== null && prevCompleted > 0
            ? Math.round((prevAvg * prevCompleted + turnaroundDays) / newCompleted)
            : (turnaroundDays || prevAvg);
          tx.set(ref, {
            tasksCompleted:    newCompleted,
            avgTurnaroundDays: newAvg,
            totalRevenue:      admin.firestore.FieldValue.increment(Number(after.budget || 0)),
            lastUpdated:       admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return { uid, newCompleted };
        }).catch(() => null)
      ));

      // Staff milestone: celebrate every 10/25/50/100 completed tasks.
      // Uses the authoritative count returned by the transaction above (no re-read),
      // so two near-simultaneous completions can't both observe the same post-increment
      // count and double-fire (or miss) the milestone notification.
      const MILESTONES = new Set([10, 25, 50, 100, 200, 500]);
      for (const result of staffResults) {
        if (!result) continue;
        const { uid, newCompleted } = result;
        if (MILESTONES.has(newCompleted)) {
          await db.collection("notifications").add({
            recipientId: uid,
            title:       `Milestone: ${newCompleted} Tasks Completed!`,
            message:     `Congratulations — you've completed ${newCompleted} tasks at Tanvir Studio. Outstanding work!`,
            type:        "success",
            read:        false,
            createdAt:   admin.firestore.FieldValue.serverTimestamp(),
            expiresAt:   admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
          }).catch(() => {});
        }
      }

      // Client LTV: totalSpent + orderCount + lastOrderAt + segment.
      // Transactional for the same reason as the staff update above.
      if (after.clientUid) {
        await db.runTransaction(async (tx) => {
          const clientRef  = db.doc(`users/${after.clientUid}`);
          const clientSnap = await tx.get(clientRef);
          const current    = clientSnap.exists ? clientSnap.data() : {};
          const newTotal   = Number(current.totalSpent || 0) + Number(after.budget || 0);
          const newCount   = Number(current.orderCount || 0) + 1;
          // Segment: VIP ≥ 3 orders or ≥ 15000 spent, else Regular, new client = first order
          const segment = newTotal >= 15000 || newCount >= 3 ? "vip" : newCount === 1 ? "new" : "regular";
          tx.set(clientRef, {
            totalSpent:  newTotal,
            orderCount:  newCount,
            lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
            segment,
          }, { merge: true });
        }).catch(() => {});
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
