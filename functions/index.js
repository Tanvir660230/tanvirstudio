// ─── Entry point ───────────────────────────────────────────────────────────────
// This file only aggregates and re-exports the Cloud Functions defined in
// ./scheduled, ./callable, and ./triggers. Shared setup (admin.initializeApp,
// db/fcm, secrets, and helper utilities) lives under ./lib and is required
// exactly once per process via ./lib/init.

Object.assign(
  exports,
  require("./scheduled/maintenance"),
  require("./scheduled/tasks"),
  require("./scheduled/payments"),
  require("./scheduled/reports"),
  require("./scheduled/engagement"),
  require("./scheduled/bookings"),
  require("./callable/messaging"),
  require("./callable/notifications"),
  require("./callable/coupons"),
  require("./callable/uploads"),
  require("./callable/public-forms"),
  require("./triggers/orders"),
  require("./triggers/bookings"),
  require("./triggers/users"),
  require("./triggers/tasks"),
  require("./triggers/transactions")
);
