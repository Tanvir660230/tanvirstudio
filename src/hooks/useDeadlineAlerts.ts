import { useEffect, useRef } from 'react';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task } from '../types';

const DAYS_WARN = 2; // alert when deadline <= 2 days away

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function useDeadlineAlerts(
  tasks: Task[],
  recipientId: string | undefined,
  enabled: boolean,
) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !recipientId || tasks.length === 0 || checkedRef.current) return;
    checkedRef.current = true;

    const ACTIVE = ['pending', 'new', 'humming', 'composition', 'revision', 'in_progress', 'recording'];
    const urgent = tasks.filter(t =>
      ACTIVE.includes(t.status) &&
      daysUntil(t.deadline) !== null &&
      (daysUntil(t.deadline) as number) <= DAYS_WARN &&
      (daysUntil(t.deadline) as number) >= 0,
    );

    if (urgent.length === 0) return;

    (async () => {
      for (const task of urgent) {
        const days = daysUntil(task.deadline) as number;
        const alertKey = `deadline_${task.id}_${task.deadline}`;
        // Check if already notified
        try {
          const snap = await getDocs(query(collection(db, 'notifications'), where('alertKey', '==', alertKey), where('recipientId', '==', recipientId)));
          if (!snap.empty) continue;
        } catch { continue; }

        const msg = days === 0
          ? `⚠️ "${task.title}" deadline is TODAY!`
          : `⏰ "${task.title}" deadline in ${days} day${days > 1 ? 's' : ''}`;

        await addDoc(collection(db, 'notifications'), {
          recipientId,
          title: 'Deadline Alert',
          message: msg,
          type: days === 0 ? 'error' : 'warning',
          read: false,
          alertKey,
          link: '/work',
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    })();
  }, [tasks, recipientId, enabled]);
}
