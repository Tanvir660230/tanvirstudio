const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, EMAIL_USER, EMAIL_PASS, BULKSMS_KEY, BULKSMS_SENDER } = require("../lib/init");
const { makeTransport, withRetry, checkRateLimit } = require("../lib/helpers");
const { sanitize } = require("../lib/sanitize");
const { sendSMSRaw } = require("../lib/sms");

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
