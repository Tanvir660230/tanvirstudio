const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, fcm } = require("../lib/init");
const { sanitize } = require("../lib/sanitize");
const { checkRateLimit } = require("../lib/helpers");

// ─── Send FCM push notification (admin only) ──────────────────────────────────
exports.sendPushNotification = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (callerSnap.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");
  await checkRateLimit(req.auth.uid, "sendPushNotification", 30, 3_600_000);

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
  await checkRateLimit(req.auth.uid, "sendBatchNotification", 30, 3_600_000);

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
