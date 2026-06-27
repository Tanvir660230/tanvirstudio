import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTIONS = [
  'tasks', 'clients', 'transactions', 'workerPayments', 'monthlyPayments',
  'monthlyIncomeReceipts', 'recurringExpenses', 'recurringIncome', 'monthlyLedgers',
  'leads', 'comms', 'notes', 'todos', 'bookings', 'activityLogs',
  'projectTemplates', 'settings',
];

function toSerializable(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (typeof data.toDate === 'function') return data.toDate().toISOString();
  if (Array.isArray(data)) return data.map(toSerializable);
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toSerializable(v)]));
}

export async function exportAllData(onProgress?: (msg: string) => void): Promise<void> {
  const backup: Record<string, any[]> = {};

  for (const col of COLLECTIONS) {
    onProgress?.(`Exporting ${col}…`);
    try {
      const snap = await getDocs(collection(db, col));
      backup[col] = snap.docs.map(d => ({ id: d.id, ...toSerializable(d.data()) }));
    } catch {
      backup[col] = [];
    }
  }

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tanvir-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
