const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { sanitize } = require("../lib/sanitize");

// ─── Validate file upload (size + MIME type) — callable ───────────────────────
exports.validateFileUpload = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required");

  const { fileName = "", fileSize = 0, mimeType = "" } = req.data || {};

  const ALLOWED_TYPES = new Set([
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff",
    "audio/flac", "audio/ogg", "audio/mp4", "audio/aac", "audio/webm",
    "video/mp4", "video/quicktime", "video/webm",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  if (fileSize > MAX_BYTES) {
    throw new HttpsError("invalid-argument", `File too large (max 50 MB). Your file: ${(fileSize / 1024 / 1024).toFixed(1)} MB.`);
  }
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new HttpsError("invalid-argument", `File type not allowed: ${mimeType || "unknown"}`);
  }

  return { valid: true, fileName: sanitize(fileName, 200) };
});
