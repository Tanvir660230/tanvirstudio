import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Atomically increments the invoice counter and returns a formatted number.
 * Stores counter in settings/invoiceCounter document.
 * Returns e.g. "042" for the 42nd invoice.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const counterRef = doc(db, 'settings', 'invoiceCounter');
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (Number(snap.data().value) || 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return String(next).padStart(4, '0');
}
