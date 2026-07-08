// ─── String sanitization helpers ──────────────────────────────────────────────

function normalizeBDPhone(raw = "") {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0"))   return "880" + digits.slice(1);
  if (digits.length === 10)     return "880" + digits;
  return digits;
}

// Strip < > to prevent HTML injection; enforce max length
function sanitize(str = "", maxLen = 5000) {
  return String(str).replace(/[<>]/g, "").slice(0, maxLen).trim();
}

// HTML-escape user-controlled values before inserting into email HTML bodies
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Strip newlines/control chars from email subjects to prevent header injection
function sanitizeSubject(str = "", maxLen = 200) {
  return String(str).replace(/[\r\n\t]/g, " ").replace(/[<>]/g, "").slice(0, maxLen).trim();
}

module.exports = { normalizeBDPhone, sanitize, esc, sanitizeSubject };
