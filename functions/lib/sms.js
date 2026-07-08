const { db, BULKSMS_KEY, BULKSMS_SENDER } = require("./init");
const { normalizeBDPhone }                = require("./sanitize");
const { withRetry }                       = require("./helpers");

// Send SMS via BulkSMSBD (already normalises phone)
async function sendSMSRaw(phone, message) {
  const number = normalizeBDPhone(phone);
  const params = new URLSearchParams({
    api_key:  BULKSMS_KEY.value(),
    senderid: BULKSMS_SENDER.value(),
    number,
    message,
  });
  const res  = await fetch(`https://bulksmsbd.net/api/smsapi?${params}`);
  const body = await res.text();
  console.log("SMS response:", body);
  return body;
}

// Deduped SMS: won't send if same phone + typeKey was messaged within dedupMs
async function sendSMSDedup(phone, typeKey, message, dedupMs = 3_600_000) {
  if (!phone) return;
  const key  = `sms_${normalizeBDPhone(phone)}_${typeKey}`;
  const ref  = db.doc(`rateLimits/${key}`);
  const snap = await ref.get();
  if (snap.exists && (Date.now() - snap.data().sentAt) < dedupMs) return;
  await ref.set({ sentAt: Date.now() });
  await withRetry(() => sendSMSRaw(phone, message));
}

module.exports = { sendSMSRaw, sendSMSDedup };
