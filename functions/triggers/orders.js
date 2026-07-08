const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { admin, db, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL_SEC } = require("../lib/init");
const { makeTransport, withRetry, createAdminNotification, detectTaskCategory } = require("../lib/helpers");
const { sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

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
