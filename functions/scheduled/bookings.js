const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, EMAIL_USER, EMAIL_PASS } = require("../lib/init");
const { makeTransport, withRetry, createAdminNotification } = require("../lib/helpers");
const { esc, sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

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
        await withRetry(() => transport.sendMail({
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
