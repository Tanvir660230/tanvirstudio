const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { EMAIL_USER, EMAIL_PASS } = require("../lib/init");
const { makeTransport, withRetry } = require("../lib/helpers");
const { esc, sanitizeSubject } = require("../lib/sanitize");
const { htmlWrap, btn, para } = require("../lib/email-templates");

// ─── New user → welcome email to clients only ─────────────────────────────────
exports.onNewUser = onDocumentCreated(
  { document: "users/{userId}", secrets: [EMAIL_USER, EMAIL_PASS] },
  async (event) => {
    const user = event.data?.data();
    if (!user || user.role !== "client" || !user.email) return;

    const name = user.name || user.email.split("@")[0] || "there";

    const transport = makeTransport(EMAIL_USER.value(), EMAIL_PASS.value());
    await withRetry(() => transport.sendMail({
      from:    `"Tanvir Studio" <${EMAIL_USER.value()}>`,
      to:      user.email,
      subject: sanitizeSubject(`Welcome to Tanvir Studio, ${name}!`),
      html: htmlWrap("Welcome!", `
        <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:22px">Welcome, ${esc(name)}! &#127925;</h2>
        ${para("We're thrilled to have you at <strong>Tanvir Studio</strong> — your go-to destination for professional music production, recording, and mixing.")}
        ${para("You can now place orders, track projects, and download your completed files — all from your personal dashboard.")}
        ${btn("Go to Dashboard →", "https://tanvirstudio.com/dashboard")}
        ${para(`<span style="font-size:13px;color:#aaa">Have questions? Just reply to this email.</span>`)}
      `),
      text: `Welcome to Tanvir Studio, ${name}! You can track your orders and download files at tanvirstudio.com/dashboard. - Tanvir Studio`,
    })).catch((e) => console.error("Welcome email error:", e));
  }
);
