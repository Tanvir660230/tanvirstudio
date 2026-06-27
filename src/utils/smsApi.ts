// src/utils/smsApi.ts
// Calls the 'sendSMS' Cloud Function (server-side, API key hidden).
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().+]/g, '');
  // Accept BD numbers: 01XXXXXXXXX (11 digits) or +880XXXXXXXXXX / 880XXXXXXXXXX
  if (/^01[3-9]\d{8}$/.test(digits)) return `+880${digits.slice(1)}`;
  if (/^880[1-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+?[1-9]\d{7,14}$/.test(digits)) return digits.startsWith('+') ? digits : `+${digits}`;
  return null;
}

async function sendSMS(phone: string, message: string): Promise<void> {
  if (!phone || !message) return;
  const normalised = normalisePhone(phone);
  if (!normalised) {
    console.warn(`[smsApi] Invalid phone number, skipping: "${phone}"`);
    return;
  }
  try {
    await httpsCallable(functions, 'sendSMS')({ phone: normalised, message });
  } catch (err) {
    console.warn('[smsApi] SMS failed, skipping:', err);
  }
}

export async function sendOrderAcceptedSMS(
  phone: string,
  clientName: string,
  packageName: string,
  orderRef: string,
  sessionDate?: string,
): Promise<void> {
  const datePart = sessionDate
    ? ` Session: ${new Date(sessionDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`
    : '';
  return sendSMS(phone, `Hi ${clientName}, your ${packageName} order (${orderRef}) has been accepted!${datePart} We will contact you soon. - Tanvir Studio`);
}

export async function sendOrderDeclinedSMS(
  phone: string,
  clientName: string,
  packageName: string,
  orderRef: string,
): Promise<void> {
  return sendSMS(phone, `Hi ${clientName}, unfortunately we could not accept your ${packageName} order (${orderRef}) at this time. Please contact us for details. - Tanvir Studio`);
}

export async function sendOrderReceivedSMS(
  phone: string,
  clientName: string,
  packageName: string,
  orderRef: string,
): Promise<void> {
  return sendSMS(phone, `Hi ${clientName}, we received your ${packageName} order (${orderRef}). We will review and contact you within 24 hours. - Tanvir Studio`);
}

export async function sendOrderCompletedSMS(
  phone: string,
  clientName: string,
  songName: string,
  packageName: string,
): Promise<void> {
  const songPart = songName ? ` "${songName}"` : '';
  return sendSMS(phone, `Hi ${clientName}, great news! Your${songPart} ${packageName} project is now complete. Thank you for choosing Tanvir Studio!`);
}
