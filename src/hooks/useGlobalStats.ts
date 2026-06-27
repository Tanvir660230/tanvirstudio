/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface MonthStats {
  income?:   number;
  expenses?: number;
}

export interface GlobalStats {
  allTimeIncome?:   number;
  allTimeExpenses?: number;
  monthly?:         Record<string, MonthStats>;
  updatedAt?:       string;
}

export function useGlobalStats(enabled = true) {
  const [stats,   setStats]   = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }

    const unsub = onSnapshot(
      doc(db, 'stats', 'global'),
      (snap) => {
        setStats(snap.exists() ? (snap.data() as GlobalStats) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [enabled]);

  // Convenience helpers
  function monthIncome(yyyyMM: string): number {
    return stats?.monthly?.[yyyyMM]?.income ?? 0;
  }
  function monthExpenses(yyyyMM: string): number {
    return stats?.monthly?.[yyyyMM]?.expenses ?? 0;
  }

  const allTimeIncome   = stats?.allTimeIncome   ?? 0;
  const allTimeExpenses = stats?.allTimeExpenses  ?? 0;
  const currentBalance  = allTimeIncome - allTimeExpenses;

  return { stats, loading, allTimeIncome, allTimeExpenses, currentBalance, monthIncome, monthExpenses };
}
