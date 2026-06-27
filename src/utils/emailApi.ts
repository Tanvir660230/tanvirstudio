// src/utils/emailApi.ts
// Primary: Firebase Cloud Function (server-side, API keys hidden).
// Fallback: EmailJS (client-side) when Cloud Function is unavailable.
import { cloudSendEmail } from '../lib/firebase';
import emailjs from '@emailjs/browser';

// ── Runtime EmailJS settings cache ───────────────────────────────────────────
let _runtimeServiceId       = '';
let _runtimeTemplateId      = '';
let _runtimePublicKey       = '';
let _runtimeOrderTemplateId = '';

export function populateEmailJSSettings(
  serviceId: string,
  templateId: string,
  publicKey: string,
  orderTemplateId?: string,
) {
  if (serviceId)       _runtimeServiceId       = serviceId;
  if (templateId)      _runtimeTemplateId      = templateId;
  if (publicKey)       _runtimePublicKey       = publicKey;
  if (orderTemplateId) _runtimeOrderTemplateId = orderTemplateId;
}

function getEmailJSCredentials() {
  return {
    serviceId:       import.meta.env.VITE_EMAILJS_SERVICE_ID        || _runtimeServiceId,
    templateId:      import.meta.env.VITE_EMAILJS_TEMPLATE_ID       || _runtimeTemplateId,
    publicKey:       import.meta.env.VITE_EMAILJS_PUBLIC_KEY        || _runtimePublicKey,
    orderTemplateId: import.meta.env.VITE_EMAILJS_ORDER_TEMPLATE_ID || _runtimeOrderTemplateId,
  };
}

function emailJSConfigured(): boolean {
  const { serviceId, templateId, publicKey } = getEmailJSCredentials();
  return Boolean(serviceId && templateId && publicKey);
}

// ── Cloud Function caller ─────────────────────────────────────────────────────
async function callSendEmail(to: string, subject: string, text: string): Promise<void> {
  await cloudSendEmail({ to, subject, text });
}

// ── EmailJS fallback ──────────────────────────────────────────────────────────
async function sendViaEmailJS(templateParams: Record<string, string>): Promise<void> {
  const { serviceId, orderTemplateId, publicKey } = getEmailJSCredentials();
  await emailjs.send(serviceId, orderTemplateId || '', templateParams, publicKey);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const sendCompletionEmail = async (
  clientEmail: string,
  clientName: string,
  projectName: string,
  driveLink: string,
): Promise<void> => {
  const subject = `Your project "${projectName}" is complete!`;
  const text    = `Hi ${clientName},\n\nGreat news! Your project "${projectName}" is complete.\n\nDownload your files here: ${driveLink}\n\n— Tanvir Studio`;

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectName, drive_link: driveLink, message: text });
  }
};

export const sendOrderConfirmationToClient = async (
  clientEmail: string,
  clientName: string,
  packageName: string,
  projectName: string,
  price: string,
): Promise<void> => {
  if (!clientEmail) return;
  const subject = `Order Received — ${packageName}`;
  const text    = `Hi ${clientName},\n\nThank you for your order!\n\nPackage: ${packageName}\nProject: ${projectName}\nPrice: ${price}\n\nWe will review and contact you within 24 hours.\n\n— Tanvir Studio`;

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectName, message: text });
  }
};

export const sendContactFormNotification = async (
  adminEmail: string,
  name: string,
  email: string,
  phone: string,
  service: string,
  message: string,
): Promise<void> => {
  const subject = `Contact Form: ${service} — ${name}`;
  const text    = `New contact form submission!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService: ${service}\n\nMessage:\n${message}`;

  try {
    await callSendEmail(adminEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: adminEmail, to_name: 'Admin', project_name: `Contact: ${service}`, message: text });
  }
};

export const sendOrderAcceptedToClient = async (
  clientEmail: string,
  clientName: string,
  packageName: string,
  projectName: string,
  recordingDate?: string,
): Promise<void> => {
  if (!clientEmail) return;
  const dateStr = recordingDate
    ? new Date(recordingDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const subject = `Your order has been accepted — ${packageName}`;
  const text    = `Hi ${clientName},\n\nYour order has been accepted!\n\nPackage: ${packageName}\nProject: ${projectName}${dateStr ? `\nSession Date: ${dateStr}` : ''}\n\nTrack your project in your dashboard.\n\n— Tanvir Studio`;

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectName, message: text });
  }
};

export const sendOrderDeclinedToClient = async (
  clientEmail: string,
  clientName: string,
  packageName: string,
  projectName: string,
): Promise<void> => {
  if (!clientEmail) return;
  const subject = `Update on your order — ${packageName}`;
  const text    = `Hi ${clientName},\n\nUnfortunately we are unable to take on "${projectName}" (${packageName}) at this time.\n\nPlease contact us to discuss alternatives.\n\n— Tanvir Studio`;

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectName, message: text });
  }
};

export const sendInvoiceEmail = async (
  clientEmail: string,
  clientName: string,
  invoiceNo: string,
  studioName: string,
  projectTitle: string,
  currency: string,
  grandTotal: number,
  totalPaid: number,
  due: number,
  memo?: string,
): Promise<void> => {
  if (!clientEmail) throw new Error('No client email');
  const subject = `Invoice ${invoiceNo} — ${projectTitle}`;
  const status = due <= 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partially Paid' : 'Payment Due';
  const text = [
    `Hi ${clientName},`,
    '',
    `Please find your invoice details from ${studioName} below.`,
    '',
    `Invoice No : ${invoiceNo}`,
    `Project    : ${projectTitle}`,
    `Total      : ${currency}${grandTotal.toLocaleString('en-US')}`,
    `Paid       : ${currency}${totalPaid.toLocaleString('en-US')}`,
    `Balance Due: ${currency}${due.toLocaleString('en-US')}`,
    `Status     : ${status}`,
    memo ? `\nNote: ${memo}` : '',
    '',
    'Thank you for your business!',
    `— ${studioName}`,
  ].filter(l => l !== undefined).join('\n');

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) throw new Error('Email not configured');
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectTitle, message: text });
  }
};

export const sendPaymentReminder = async (
  clientEmail: string,
  clientName: string,
  studioName: string,
  projectTitle: string,
  currency: string,
  due: number,
  daysOverdue: number,
): Promise<void> => {
  if (!clientEmail) throw new Error('No client email');
  const subject = `Payment Reminder — ${projectTitle}`;
  const urgency = daysOverdue >= 90 ? 'Urgent: ' : daysOverdue >= 30 ? 'Reminder: ' : '';
  const text = [
    `Hi ${clientName},`,
    '',
    `${urgency}This is a friendly reminder that a payment of ${currency}${due.toLocaleString('en-US')} is outstanding for your project "${projectTitle}".`,
    daysOverdue > 0 ? `This payment has been due for ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.` : '',
    '',
    'Please arrange payment at your earliest convenience to avoid any delays.',
    '',
    `If you have already made the payment, please disregard this message.`,
    '',
    `Thank you for your continued trust in ${studioName}!`,
    `— ${studioName}`,
  ].filter(Boolean).join('\n');

  try {
    await callSendEmail(clientEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) throw new Error('Email not configured');
    await sendViaEmailJS({ to_email: clientEmail, to_name: clientName, project_name: projectTitle, message: text });
  }
};

export const sendNewOrderNotification = async (
  adminEmail: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  projectName: string,
  packageName: string,
  referenceLink: string,
  notes: string,
): Promise<void> => {
  const subject = `New Order: ${packageName} — ${clientName}`;
  const text    = `New order received!\n\nPackage: ${packageName}\nClient: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone}\nReference: ${referenceLink || 'None'}\nNotes: ${notes || 'None'}`;

  try {
    await callSendEmail(adminEmail, subject, text);
  } catch (cfErr) {
    console.warn('[emailApi] Cloud Function failed, trying EmailJS:', cfErr);
    if (!emailJSConfigured()) { console.warn('[emailApi] EmailJS not configured, skipping.'); return; }
    await sendViaEmailJS({ to_email: adminEmail, to_name: 'Admin', project_name: projectName, message: text });
  }
};
