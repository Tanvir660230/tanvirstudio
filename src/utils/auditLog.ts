import { addDoc, collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ActivityLogEntry {
  action: string;
  collection: string;
  docId: string;
  docTitle?: string;
  by: string;
  byUid: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// Single-entry log — fire-and-forget, non-critical.
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[auditLog] non-critical write failed:', err);
  }
}

// Batch log — writes up to 500 entries in one Firestore commit.
export async function logActivities(entries: ActivityLogEntry[]): Promise<void> {
  if (!entries.length) return;
  try {
    const batch = writeBatch(db);
    for (const entry of entries) {
      batch.set(doc(collection(db, 'activityLogs')), {
        ...entry,
        timestamp: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn('[auditLog] non-critical batch write failed:', err);
  }
}
