import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STATS_REF = doc(db, 'stats', 'global');

function monthKey(dateStr: string): string {
  const d = new Date(dateStr || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface StatsDelta {
  income?:   number; // positive = add, negative = subtract
  expenses?: number;
  date?:     string; // ISO string — picks the month bucket
}

export async function updateGlobalStats(delta: StatsDelta): Promise<void> {
  const mk = monthKey(delta.date ?? new Date().toISOString());
  const updates: Record<string, ReturnType<typeof increment> | string> = {
    updatedAt: new Date().toISOString(),
  };

  if (delta.income !== undefined) {
    updates['allTimeIncome']        = increment(delta.income);
    updates[`monthly.${mk}.income`] = increment(delta.income);
  }
  if (delta.expenses !== undefined) {
    updates['allTimeExpenses']        = increment(delta.expenses);
    updates[`monthly.${mk}.expenses`] = increment(delta.expenses);
  }

  try {
    await updateDoc(STATS_REF, updates);
  } catch (err: any) {
    if (err?.code === 'not-found') {
      // Bootstrap the document on first write
      const monthData: Record<string, number> = {};
      if (delta.income   !== undefined) monthData.income   = delta.income;
      if (delta.expenses !== undefined) monthData.expenses = delta.expenses;

      const init: Record<string, unknown> = {
        updatedAt:        new Date().toISOString(),
        allTimeIncome:    delta.income   ?? 0,
        allTimeExpenses:  delta.expenses ?? 0,
        monthly:          { [mk]: monthData },
      };
      try { await setDoc(STATS_REF, init); } catch { /* non-critical */ }
    } else {
      console.warn('[statsUpdater] non-critical stats update failed:', err);
    }
  }
}

// Convenience — reverses a previously recorded delta (e.g. on transaction delete).
export async function decrementGlobalStats(delta: StatsDelta): Promise<void> {
  return updateGlobalStats({
    income:   delta.income   !== undefined ? -delta.income   : undefined,
    expenses: delta.expenses !== undefined ? -delta.expenses : undefined,
    date:     delta.date,
  });
}
