const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("../lib/init");
const { checkRateLimit, getClientIp, createAdminNotification } = require("../lib/helpers");
const { sanitize, normalizeBDPhone } = require("../lib/sanitize");

// ─── Rate-limit public form submissions (max 3 per email per hour) ─────────────
// Used by both contact and booking forms via a callable wrapper
exports.submitPublicContactForm = onCall(async (req) => {
  const { name, email, phone, message, subject, honeypot } = req.data || {};

  // Honeypot: bots fill hidden fields
  if (honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email/phone per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "contact_ip", 8, 3_600_000);

  const safeEmail   = sanitize(email || "", 200).toLowerCase();
  const safeName    = sanitize(name    || "", 200);
  const safePhone   = sanitize(phone   || "", 20);
  const safeMessage = sanitize(message || "", 3000);
  const safeSubject = sanitize(subject || "Contact Enquiry", 300);

  if (!safeName || !safeMessage) throw new HttpsError("invalid-argument", "Name and message required");

  // Rate limit: max 3 submissions per email per hour (use phone if no email)
  const limitKey = safeEmail || (safePhone ? `ph_${normalizeBDPhone(safePhone)}` : null);
  if (limitKey) {
    await checkRateLimit(limitKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60), "contact_email", 3, 3_600_000);
  }

  await db.collection("contacts").add({
    name:      safeName,
    email:     safeEmail,
    phone:     safePhone,
    subject:   safeSubject,
    message:   safeMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await createAdminNotification(
    "New Contact Form",
    `${safeName}${safeEmail ? ` (${safeEmail})` : ""}: ${safeMessage.slice(0, 80)}${safeMessage.length > 80 ? "…" : ""}`,
    "info"
  );

  return { success: true };
});

exports.submitPublicOrder = onCall(async (req) => {
  const data = req.data || {};

  if (data.honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "order_ip", 8, 3_600_000);

  const safeEmail = sanitize(data.clientEmail || "", 200).toLowerCase();
  if (!safeEmail) throw new HttpsError("invalid-argument", "Email required");

  await checkRateLimit(safeEmail.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60), "order_email", 3, 3_600_000);

  // Enforce validation constraints. Public submissions are unauthenticated, so
  // treat these as untrusted display values, not a real payment record: cap them
  // at a sane ceiling and never let the claimed advance exceed the claimed budget
  // (prevents a fake "already paid" number from misleading staff).
  const MAX_PUBLIC_ORDER_AMOUNT = 5_000_000;
  const safeBudget = Math.min(MAX_PUBLIC_ORDER_AMOUNT, Math.max(0, Number(data.budget) || 0));
  const safeAdvance = Math.min(safeBudget, Math.max(0, Number(data.advance) || 0));

  const docData = {
    title: sanitize(data.title || "New Order", 200),
    client: sanitize(data.client || "Client", 100),
    clientEmail: safeEmail,
    clientPhone: sanitize(data.clientPhone || "", 30),
    songName: sanitize(data.songName || "", 100),
    description: sanitize(data.description || "", 3000),
    budget: safeBudget,
    advance: safeAdvance,
    status: 'pending',
    priority: sanitize(data.priority || 'normal', 20),
    needsHumming: Boolean(data.needsHumming),
    hasRecording: Boolean(data.hasRecording),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    publicOrder: true,
    packageName: sanitize(data.packageName || "", 100),
    orderRef: sanitize(data.orderRef || `TSN-${Date.now().toString(36).toUpperCase().slice(-6)}`, 50),
    clientUid: req.auth ? req.auth.uid : null, // link auth if logged in
  };

  if (data.couponCode) {
    docData.couponCode = sanitize(data.couponCode, 30);
    docData.couponDiscount = Math.min(safeBudget, Math.max(0, Number(data.couponDiscount) || 0));
  }

  const docRef = await db.collection("tasks").add(docData);

  await createAdminNotification(
    "New Order Received",
    `${docData.client} ordered ${docData.packageName || docData.songName}`,
    "success"
  );

  return { success: true, id: docRef.id };
});

exports.submitPublicBooking = onCall(async (req) => {
  const data = req.data || {};

  if (data.honeypot) throw new HttpsError("permission-denied", "Submission blocked");

  // IP-based limit first: catches scripts that rotate a fake email per request
  // (the email-keyed limit below is trivially bypassed on its own).
  await checkRateLimit(getClientIp(req), "booking_ip", 8, 3_600_000);

  const safeEmail = sanitize(data.email || "", 200).toLowerCase();
  if (!safeEmail) throw new HttpsError("invalid-argument", "Email required");

  await checkRateLimit(safeEmail.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60), "booking_email", 3, 3_600_000);

  const docData = {
    name: sanitize(data.name || "Client", 100),
    email: safeEmail,
    phone: sanitize(data.phone || "", 30),
    service: sanitize(data.service || "", 100),
    date: sanitize(data.date || "", 50),
    time: sanitize(data.time || "", 50),
    message: sanitize(data.message || "", 3000),
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    studioName: sanitize(data.studioName || "Tanvir Studio", 100),
    clientUid: req.auth ? req.auth.uid : null, // link auth if logged in
  };

  const docRef = await db.collection("bookings").add(docData);

  await createAdminNotification(
    "New Booking Request",
    `${docData.name} requested ${docData.service} on ${docData.date}`,
    "info"
  );

  return { success: true, id: docRef.id };
});
