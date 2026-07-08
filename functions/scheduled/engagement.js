const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, EMAIL_USER, EMAIL_PASS } = require("../lib/init");
const { makeTransport, withRetry } = require("../lib/helpers");
const { esc, sanitize, sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

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
      const lastMs = user.lastOrderAt?.toMillis?.()
        || user.createdAt?.toMillis?.()
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
      const createdMs = user.createdAt?.toMillis?.()
        || (user.createdAt ? new Date(user.createdAt).getTime() : null);
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
