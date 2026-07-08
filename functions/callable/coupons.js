const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");
const { sanitize } = require("../lib/sanitize");
const { checkRateLimit } = require("../lib/helpers");

// ─── Validate (and optionally apply) a coupon ─────────────────────────────────
exports.validateCoupon = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
  await checkRateLimit(req.auth.uid, "validateCoupon", 20, 3_600_000);

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
