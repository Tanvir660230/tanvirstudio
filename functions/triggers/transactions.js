const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { admin, db } = require("../lib/init");

// ─── Helpers for stats/global maintenance ─────────────────────────────────────

function txMonthKey(tx) {
  const raw = tx.date
    || (tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString() : String(tx.createdAt || ""));
  const d = raw ? new Date(raw) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function statsIncrements(tx, multiplier) {
  const amt = (Number(tx.amount) || 0) * multiplier;
  const mk  = txMonthKey(tx);
  if (tx.type === "in") {
    return {
      allTimeIncome:             admin.firestore.FieldValue.increment(amt),
      [`monthly.${mk}.income`]:  admin.firestore.FieldValue.increment(amt),
    };
  }
  if (tx.type === "out") {
    return {
      allTimeExpenses:              admin.firestore.FieldValue.increment(amt),
      [`monthly.${mk}.expenses`]:   admin.firestore.FieldValue.increment(amt),
    };
  }
  return null;
}

// ─── Transaction created → update stats/global ────────────────────────────────
exports.onTransactionCreated = onDocumentCreated("transactions/{txId}", async (event) => {
  const tx = event.data?.data();
  if (!tx || tx.status !== "Completed" || tx.deleted) return;

  const inc = statsIncrements(tx, 1);
  if (!inc) return;

  await db.doc("stats/global").set(
    { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  ).catch((e) => console.error("[stats] onTransactionCreated:", e));
});

// ─── Transaction updated → keep stats in sync (status change or soft-delete) ──
exports.onTransactionUpdated = onDocumentUpdated("transactions/{txId}", async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  // Soft-delete: was active Completed → now deleted
  if (!before.deleted && after.deleted && before.status === "Completed") {
    const inc = statsIncrements(before, -1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(softDelete):", e));
    return;
  }

  // Status changed TO Completed
  if (before.status !== "Completed" && after.status === "Completed" && !after.deleted) {
    const inc = statsIncrements(after, 1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(completed):", e));
    return;
  }

  // Status changed FROM Completed (cancelled / uncompleted)
  if (before.status === "Completed" && after.status !== "Completed" && !before.deleted) {
    const inc = statsIncrements(before, -1);
    if (inc) await db.doc("stats/global").set(
      { ...inc, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error("[stats] onTransactionUpdated(uncompleted):", e));
  }
});
