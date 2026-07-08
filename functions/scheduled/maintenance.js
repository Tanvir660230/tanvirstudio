const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, db, firestoreAdmin } = require("../lib/init");
const { createAdminNotification }   = require("../lib/helpers");

// ─── Weekly Firestore backup (Sunday midnight) ────────────────────────────────
exports.scheduledFirestoreExport = onSchedule("every sunday 00:00", async () => {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId) { console.error("No project ID"); return; }
  const bucket       = `gs://${projectId}-backups`;
  const databaseName = firestoreAdmin.databasePath(projectId, "(default)");
  try {
    const [op] = await firestoreAdmin.exportDocuments({ name: databaseName, outputUriPrefix: bucket, collectionIds: [] });
    console.log(`Backup started: ${op.name}`);
  } catch (err) { console.error("Backup failed:", err); }
});

// ─── Delete expired notifications (daily) ────────────────────────────────────
exports.cleanupExpiredNotifications = onSchedule("every 24 hours", async () => {
  const now  = admin.firestore.Timestamp.now();
  const snap = await db.collection("notifications").where("expiresAt", "<", now).limit(500).get();
  if (snap.empty) { console.log("No expired notifications"); return; }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`Deleted ${snap.size} expired notifications`);
});

// ─── Deactivate expired coupons (daily 1am Dhaka) ────────────────────────────
exports.deactivateExpiredCoupons = onSchedule(
  { schedule: "0 1 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const now  = admin.firestore.Timestamp.now();
    const snap = await db.collection("coupons")
      .where("active",    "==", true)
      .where("expiresAt", "<",  now)
      .limit(100)
      .get();

    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { active: false }));
    await batch.commit();
    console.log(`Deactivated ${snap.size} expired coupons`);
  }
);

// ─── Coupon expiry warning — admin in-app alert 24h before coupon expires ─────
exports.couponExpiryWarning = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Dhaka" },
  async () => {
    const now  = admin.firestore.Timestamp.now();
    const in24h = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000);

    const snap = await db.collection("coupons")
      .where("active",    "==", true)
      .where("expiresAt", ">",  now)
      .where("expiresAt", "<=", in24h)
      .get();

    if (snap.empty) return;

    const summary = snap.docs.map((d) => {
      const { code, usedCount = 0, maxUses = 0 } = d.data();
      return `${code} (${usedCount}/${maxUses || "∞"} used)`;
    }).join(", ");

    await createAdminNotification(
      "Coupons Expiring in 24h",
      `${snap.size} coupon(s) expiring soon: ${summary}`,
      "warning"
    );
    console.log(`Coupon expiry warning: ${summary}`);
  }
);
