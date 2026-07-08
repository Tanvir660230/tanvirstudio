const { esc, sanitize, sanitizeSubject } = require("./sanitize");

// ─── HTML email template ──────────────────────────────────────────────────────

function htmlWrap(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:10px;overflow:hidden;max-width:560px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#1a0a2e,#6b21a8);padding:28px 36px;text-align:center">
    <p style="color:#fff;margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:.5px">&#127925; Tanvir Studio</p>
    <p style="color:rgba(255,255,255,.65);margin:0;font-size:12px">Professional Music Production</p>
  </td></tr>
  <tr><td style="padding:32px 36px">${bodyHtml}</td></tr>
  <tr><td style="background:#f9f9f9;padding:14px 36px;text-align:center;border-top:1px solid #eee">
    <p style="color:#bbb;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} Tanvir Studio</p>
  </td></tr>
</table>
</td></tr>
</table></body></html>`;
}

function btn(text, url) {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1a0a2e,#6b21a8);
      color:#fff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:600">
      ${text}
    </a>
  </div>`;
}

function para(text) {
  return `<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 14px">${text}</p>`;
}

// ─── Status-change templates (client notifications) ───────────────────────────

const STATUS_TEMPLATES = {
  accepted: {
    subject: (pkg) => sanitizeSubject(`Your order has been accepted — ${pkg}`),
    html: (name, pkg, project, date) => htmlWrap("Order Accepted", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your order has been accepted! &#127881;</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, great news — your order is confirmed.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:8px;padding:16px;margin:0 0 16px">
        <tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Package:</strong> ${esc(pkg)}</td></tr>
        <tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Project:</strong> ${esc(project)}</td></tr>
        ${date ? `<tr><td style="color:#555;font-size:14px;padding:4px 0"><strong>Session Date:</strong> ${esc(date)}</td></tr>` : ""}
      </table>
      ${para("We will contact you soon with further details. You can track your order from your dashboard.")}
      ${btn("Go to Dashboard →", "https://tanvirstudio.com/dashboard")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, your ${sanitize(pkg, 100)} order (${ref}) has been accepted! We will contact you soon. - Tanvir Studio`,
    notif: (pkg) => ["Order Accepted", `Your ${sanitize(pkg, 100)} order has been accepted!`, "order"],
  },
  completed: {
    subject: (pkg) => sanitizeSubject(`Your project is complete — ${pkg}`),
    html: (name, pkg, project) => htmlWrap("Project Complete", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">Your project is ready! &#127775;</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, your <strong>&ldquo;${esc(project)}&rdquo;</strong> (${esc(pkg)}) project is now complete.`)}
      ${para("Your files are ready to download from your dashboard. Thank you for choosing Tanvir Studio!")}
      ${btn("Download Files →", "https://tanvirstudio.com/dashboard")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, your ${sanitize(pkg, 100)} project (${ref}) is complete! Download from dashboard. - Tanvir Studio`,
    notif: (pkg) => ["Project Complete!", `Your ${sanitize(pkg, 100)} project is now complete.`, "success"],
  },
  declined: {
    subject: (pkg) => sanitizeSubject(`Update on your order — ${pkg}`),
    html: (name, pkg, project) => htmlWrap("Order Update", `
      <h2 style="color:#1a0a2e;margin:0 0 16px;font-size:20px">An update about your order</h2>
      ${para(`Hi <strong>${esc(name)}</strong>, unfortunately we are unable to take on <strong>&ldquo;${esc(project)}&rdquo;</strong> (${esc(pkg)}) at this time.`)}
      ${para("Please contact us to discuss alternatives or reschedule.")}
      ${btn("Contact Us →", "https://tanvirstudio.com/contact")}
    `),
    sms: (name, pkg, ref) =>
      `Hi ${sanitize(name, 50)}, we cannot accept your ${sanitize(pkg, 100)} order (${ref}) at this time. Please contact us. - Tanvir Studio`,
    notif: (pkg) => ["Order Update", `Your ${sanitize(pkg, 100)} order could not be processed.`, "warning"],
  },
};

module.exports = { htmlWrap, btn, para, STATUS_TEMPLATES };
