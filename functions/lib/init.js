// ─── Shared Firebase Admin init + secrets ─────────────────────────────────────
// admin.initializeApp() MUST be called exactly once across the whole codebase.
// Every other file that needs admin/db/fcm/firestoreAdmin/secrets requires this
// module instead of calling initializeApp()/admin.firestore() independently.

const { defineSecret }       = require("firebase-functions/params");
const admin                  = require("firebase-admin");
const { v1: FirestoreAdmin } = require("@google-cloud/firestore");

admin.initializeApp();
const db             = admin.firestore();
const fcm             = admin.messaging();
const firestoreAdmin = new FirestoreAdmin.FirestoreAdminClient();

// ─── Secrets ─────────────────────────────────────────────────────────────────
const EMAIL_USER      = defineSecret("EMAIL_USER");
const EMAIL_PASS      = defineSecret("EMAIL_PASS");
const BULKSMS_KEY     = defineSecret("BULKSMS_API_KEY");
const BULKSMS_SENDER  = defineSecret("BULKSMS_SENDER_ID");
const ADMIN_EMAIL_SEC = defineSecret("ADMIN_EMAIL");

module.exports = {
  admin,
  db,
  fcm,
  firestoreAdmin,
  EMAIL_USER,
  EMAIL_PASS,
  BULKSMS_KEY,
  BULKSMS_SENDER,
  ADMIN_EMAIL_SEC,
};
