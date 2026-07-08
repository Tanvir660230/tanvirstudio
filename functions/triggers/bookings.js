const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, db, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC, BULKSMS_KEY, BULKSMS_SENDER } = require("../lib/init");
const { makeTransport, withRetry, createAdminNotification } = require("../lib/helpers");
const { sanitizeSubject } = require("../lib/sanitize");
const { sendSMSDedup } = require("../lib/sms");

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
