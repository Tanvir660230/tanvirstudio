const nodemailer     = require("nodemailer");
const { HttpsError } = require("firebase-functions/v2/https");
const { admin, db }  = require("./init");

// ─── Core helpers ─────────────────────────────────────────────────────────────

function makeTransport(user, pass) {
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// Retry up to `attempts` times with exponential backoff (1s, 2s, 4s…)
async function withRetry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

// Cache admin UID in-memory — avoids a Firestore read on every call within the same instance
let _cachedAdminUid = null;
let _adminUidFetchedAt = 0;
async function getAdminUid() {
  const now = Date.now();
  if (_cachedAdminUid && now - _adminUidFetchedAt < 5 * 60 * 1000) return _cachedAdminUid;
  const snap = await db.collection("users").where("role", "==", "admin").limit(1).get();
  _cachedAdminUid = snap.empty ? null : snap.docs[0].id;
  _adminUidFetchedAt = now;
  return _cachedAdminUid;
}

async function createAdminNotification(title, message, type = "info") {
  const adminUid = await getAdminUid();
  if (!adminUid) return;
  await db.collection("notifications").add({
    recipientId: adminUid,
    title,
    message,
    type,
    read:      false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400 * 1000),
  });
}

// Best-effort caller IP for callable functions — used as a second rate-limit key
// alongside the caller-supplied email/phone, since that string is trivial to rotate.
function getClientIp(req) {
  const raw = req && req.rawRequest;
  const fwd = raw && raw.headers && raw.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (raw && raw.ip) || "unknown";
}

// Per-user per-function rate limit using Firestore (default: 20 calls / hour).
// Runs as a transaction so concurrent calls within the same window can't all read
// the pre-increment count and all pass the check (TOCTOU race on a plain get()+set()).
async function checkRateLimit(uid, fnName, maxCalls = 20, windowMs = 3_600_000) {
  const ref = db.doc(`rateLimits/${uid}_${fnName}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now  = Date.now();
    if (!snap.exists) { tx.set(ref, { count: 1, windowStart: now }); return; }
    const { count, windowStart } = snap.data();
    if (now - windowStart > windowMs) { tx.set(ref, { count: 1, windowStart: now }); return; }
    if (count >= maxCalls) throw new HttpsError("resource-exhausted", "Rate limit exceeded — try again later.");
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) });
  });
}

// Auto-detect task category from title + description keywords
function detectTaskCategory(title = "", description = "") {
  const text = (title + " " + description).toLowerCase();
  if (/\bhum(ming)?\b/.test(text))                      return "humming";
  if (/\bbeat\b|\binstrumental\b/.test(text))           return "beat_production";
  if (/\bvocal\b|\brecord(ing)?\b|\bsinger\b/.test(text)) return "vocal_recording";
  if (/\bmaster(ing)?\b/.test(text))                    return "mastering";
  if (/\bmix(ing)?\b/.test(text))                       return "mixing";
  return "production";
}

// Extract task deadline as ms (handles Timestamp or ISO string)
function getDeadlineMs(task) {
  const raw = task.deadline || task.sessionDate;
  if (!raw) return null;
  if (raw && typeof raw.toMillis === "function") return raw.toMillis();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.getTime();
}

module.exports = {
  makeTransport,
  withRetry,
  getAdminUid,
  createAdminNotification,
  getClientIp,
  checkRateLimit,
  detectTaskCategory,
  getDeadlineMs,
};
