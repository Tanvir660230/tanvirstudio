import type { Task, Payment } from '../types';

// Shared core — avoids duplicating the flat/pct branching logic.
function calcComm(
  budget: number,
  type:   string | undefined,
  flat:   number | undefined,
  pct:    number | undefined,
  defaultPct: number,
): number {
  if (type === 'flat') return Math.max(0, flat ?? 0);
  const rawPct = pct != null && pct !== ('' as any) ? Number(pct) : defaultPct;
  return Math.round((budget * Math.max(0, Math.min(100, rawPct))) / 100);
}

export function calcComposerComm(task: Task, defaultPct: number): number {
  return calcComm(
    Number(task.budget) || 0,
    task.composerCommissionType,
    task.composerCommissionAmount,
    task.composerCommissionPct,
    defaultPct,
  );
}

export function calcHummingComm(task: Task, defaultPct: number): number {
  return calcComm(
    Number(task.budget) || 0,
    task.hummingArtistCommissionType,
    task.hummingArtistCommissionAmount,
    task.hummingArtistCommissionPct,
    defaultPct,
  );
}

// Total collected from client payments on a task.
export function calcTaskPaid(task: { payments?: Payment[] }): number {
  return (task.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

// Collection ratio (0–1) capped at 1. Useful for pro-rated commission.
export function paymentRatio(task: Task): number {
  const budget = Number(task.budget) || 0;
  const paid   = calcTaskPaid(task);
  return budget > 0 ? Math.min(1, paid / budget) : 0;
}
