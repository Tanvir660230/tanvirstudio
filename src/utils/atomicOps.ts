import {
  writeBatch,
  doc,
  collection,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateGlobalStats } from './statsUpdater';
import { logActivity } from './auditLog';
import type { Transaction, WorkerPayment, Payment } from '../types';

export interface WorkerTaskUpdate {
  taskId: string;
  field: 'composerPaid' | 'hummingArtistPaid';
  newValue: number;
}

// Atomically create a task + optional advance transaction.
// Returns the new task's Firestore ID.
export async function atomicAddTaskWithAdvance(
  taskData: Record<string, unknown>,
  advanceTx: Omit<Transaction, 'id'> | null,
  actor?: { name: string; uid: string },
): Promise<string> {
  const batch   = writeBatch(db);
  const taskRef = doc(collection(db, 'tasks'));
  const now     = serverTimestamp();

  batch.set(taskRef, { createdAt: now, ...taskData });

  if (advanceTx) {
    const txRef = doc(collection(db, 'transactions'));
    batch.set(txRef, { createdAt: now, ...(advanceTx as Record<string, unknown>) });
  }

  await batch.commit();
  if (advanceTx?.amount) {
    updateGlobalStats({ income: Number(advanceTx.amount), date: advanceTx.createdAt as string }).catch((e) => console.warn('[atomicOps] stats update failed after task+advance commit:', e));
  }
  if (actor) {
    logActivity({ by: actor.name, byUid: actor.uid, action: 'task.created_with_advance', collection: 'tasks', docId: taskRef.id, docTitle: taskData.title as string, after: { advance: advanceTx?.amount } }).catch(() => {});
  }
  return taskRef.id;
}

// Atomically append a payment to N tasks + create income transaction + update client.
export async function atomicClientPayment(
  taskPayments: { taskId: string; payment: Payment }[],
  tx: Omit<Transaction, 'id'>,
  clientId: string,
  clientUpdate: Record<string, unknown>,
  actor?: { name: string; uid: string },
): Promise<void> {
  const batch = writeBatch(db);

  for (const { taskId, payment } of taskPayments) {
    batch.update(doc(db, 'tasks', taskId), {
      payments:  arrayUnion(payment),
      updatedAt: serverTimestamp(),
    });
  }

  const txRef = doc(collection(db, 'transactions'));
  batch.set(txRef, { createdAt: serverTimestamp(), ...(tx as Record<string, unknown>) });
  batch.update(doc(db, 'clients', clientId), {
    ...clientUpdate,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  updateGlobalStats({ income: Number(tx.amount), date: tx.createdAt as string }).catch((e) => console.warn('[atomicOps] stats update failed after client payment commit:', e));
  if (actor) {
    logActivity({ by: actor.name, byUid: actor.uid, action: 'payment.received', collection: 'transactions', docId: clientId, docTitle: tx.title, after: { amount: tx.amount, taskCount: taskPayments.length } }).catch(() => {});
  }
}

// Atomically create a transaction + workerPayment + update N task paid fields.
export async function atomicPayWorker(
  tx: Omit<Transaction, 'id'>,
  workerPayment: Omit<WorkerPayment, 'id'>,
  taskUpdates: WorkerTaskUpdate[],
  actor?: { name: string; uid: string },
): Promise<void> {
  const batch = writeBatch(db);
  const now   = serverTimestamp();

  const taskIds = taskUpdates.map(u => u.taskId);
  batch.set(doc(collection(db, 'transactions')),   { createdAt: now, ...(tx            as Record<string, unknown>) });
  batch.set(doc(collection(db, 'workerPayments')), { createdAt: now, taskIds, ...(workerPayment as Record<string, unknown>) });

  for (const { taskId, field, newValue } of taskUpdates) {
    batch.update(doc(db, 'tasks', taskId), { [field]: newValue, updatedAt: now });
  }

  await batch.commit();
  if (actor) {
    logActivity({ by: actor.name, byUid: actor.uid, action: 'worker.paid', collection: 'workerPayments', docId: workerPayment.workerId ?? '', docTitle: workerPayment.workerName ?? workerPayment.workerId, after: { amount: tx.amount, tasks: taskUpdates.length } }).catch(() => {});
  }
}
