import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Check, CheckCircle2, ChevronDown, Edit2, Mail, Paperclip,
  TrendingDown, TrendingUp, UserRound, X, Home, Zap, Wifi, MoreHorizontal, AlertTriangle,
  Bell, Wallet,
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { toJSDate } from '../../pages/MonthlyFinance';

const fmt = (v: any) => (isNaN(Number(v)) ? '0' : Number(v).toLocaleString());

const EXPENSE_CATEGORIES = [
  { id: 'rent',    label: 'House Rent', icon: <Home size={16} />,         color: 'var(--color-info)' },
  { id: 'utility', label: 'Utility',    icon: <Zap size={16} />,          color: 'var(--color-warning)' },
  { id: 'internet',label: 'Internet',   icon: <Wifi size={16} />,         color: 'var(--color-success)' },
  { id: 'other',   label: 'Other',      icon: <MoreHorizontal size={16} />, color: '#8E8E93' },
];

export function ClientDueList({ items, currency, onInvoice, onRemind, empty }: {
  items: any[]; currency: string; onInvoice: (task: any) => void;
  onRemind?: (task: any, daysOverdue: number) => void; studioName?: string; empty: string;
}) {
  const now = React.useMemo(() => Date.now(), []);
  if (items.length === 0) return <EmptyBox text={empty} />;
  return (
    <div className="ledger-list">
      {items.map((task: any) => {
        const isOverdue = task.dueType === 'overdue';
        const refDateJs = isOverdue ? toJSDate(task.completedAt || task.deadline) : null;
        const daysOverdue = refDateJs ? Math.floor((now - refDateJs.getTime()) / 86400000) : 0;
        const ageBadge = isOverdue
          ? daysOverdue >= 90 ? { label: '90+ days overdue', color: '#b91c1c', bg: 'rgba(185,28,28,0.1)' }
          : daysOverdue >= 60 ? { label: '60+ days overdue', color: '#c05621', bg: 'rgba(192,86,33,0.1)' }
          : daysOverdue >= 30 ? { label: '30+ days overdue', color: '#b45309', bg: 'rgba(255,149,0,0.12)' }
          : { label: 'Collect payment', color: '#b45309', bg: 'rgba(255,149,0,0.08)' }
          : { label: 'In progress', color: 'var(--text-tertiary)', bg: 'var(--border-color)' };
        const hasEmail = Boolean(task.clientEmail);
        return (
          <div key={task.id} className="ledger-row" style={{ opacity: isOverdue ? 1 : 0.75 }}>
            <div className="ledger-row-icon" style={{ background: isOverdue ? 'rgba(255,59,48,0.08)' : 'rgba(0,122,255,0.08)', color: isOverdue ? 'var(--color-danger)' : 'var(--color-info)' }}>
              <Briefcase size={18} />
            </div>
            <div className="ledger-row-main">
              <div className="ledger-row-title">
                {task.title || 'Untitled Project'}
                {isOverdue && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.08)', padding: '1px 6px', borderRadius: 4 }}>COLLECT</span>}
              </div>
              <div className="ledger-row-sub">
                {task.client || 'Unknown Client'} · Budget {currency}{fmt(task.budget)} · Paid {currency}{fmt(task.paid)}
                {!isOverdue && <span style={{ marginLeft: 6 }}>· {task.status || 'in-progress'}</span>}
              </div>
            </div>
            <div className="ledger-row-money">
              <strong style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{fmt(task.due)}</strong>
              <span style={{ display: 'inline-block', background: ageBadge.bg, color: ageBadge.color, padding: '2px 8px', borderRadius: 5, fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>{ageBadge.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {isOverdue && hasEmail && onRemind && (
                <button className="ledger-row-button" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-info)' }} onClick={() => onRemind(task, daysOverdue)} title="Send payment reminder email">
                  <Mail size={13} style={{ display: 'inline', marginRight: 3 }} />Remind
                </button>
              )}
              <button className="ledger-row-button" onClick={() => onInvoice(task)}>Invoice</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WorkerDueList({ registry, currency, expandedWorker, setExpandedWorker, onPay, empty }: {
  registry: Record<string, any>; currency: string; expandedWorker: string | null;
  setExpandedWorker: (id: string | null) => void; onPay: (worker: any) => void; empty: string;
}) {
  const workers = Object.values(registry);
  const now = React.useMemo(() => Date.now(), []);
  if (workers.length === 0) return <EmptyBox text={empty} />;
  return (
    <div className="ledger-list">
      {workers.map((worker: any) => {
        const expanded = expandedWorker === worker.workerId;
        // Oldest ready task — shows how long this worker has been waiting for payment
        const oldestReadyMs = worker.tasks
          .filter((e: any) => e.payStatus === 'ready')
          .map((e: any) => toJSDate(e.task.completedAt || e.task.deliveredAt)?.getTime() || now)
          .reduce((min: number, t: number) => Math.min(min, t), now);
        const daysOwed = Math.floor((now - oldestReadyMs) / 86400000);
        return (
          <div key={worker.workerId} className="ledger-worker-card">
            <button className="ledger-worker-top" onClick={() => setExpandedWorker(expanded ? null : worker.workerId)}>
              <div className="ledger-row-icon orange"><UserRound size={18} /></div>
              <div className="ledger-row-main">
                <div className="ledger-row-title">{worker.name}</div>
                <div className="ledger-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{worker.tasks.length} payable task{worker.tasks.length > 1 ? 's' : ''}</span>
                  {daysOwed > 0 && worker.readyDue > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: daysOwed >= 30 ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)',
                      color: daysOwed >= 30 ? 'var(--color-danger)' : 'var(--color-warning)',
                    }}>
                      {daysOwed}d owed
                    </span>
                  )}
                </div>
              </div>
              <div className="ledger-row-money">
                <strong>{currency}{fmt(worker.totalDue)}</strong>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
                  {worker.readyDue > 0 && (
                    <span style={{ display: 'inline-block', background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', padding: '2px 7px', borderRadius: 5, fontSize: '10px', fontWeight: 500 }}>Ready {currency}{fmt(worker.readyDue)}</span>
                  )}
                  {worker.waitingDue > 0 && (
                    <span style={{ display: 'inline-block', background: 'rgba(255,149,0,0.12)', color: 'var(--color-warning)', padding: '2px 7px', borderRadius: 5, fontSize: '10px', fontWeight: 500 }}>Waiting {currency}{fmt(worker.waitingDue)}</span>
                  )}
                </div>
              </div>
              <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }} className="ledger-worker-detail">
                  {worker.tasks.map((entry: any) => (
                    <div key={`${entry.task.id}-${entry.role}`} className="ledger-mini-row">
                      <span>{entry.task.title} <span style={{ opacity: 0.5 }}>- {entry.role}</span></span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: entry.payStatus === 'ready' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.12)', color: entry.payStatus === 'ready' ? 'var(--color-success)' : 'var(--color-warning)', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 500 }}>
                          {entry.payStatus === 'ready' ? 'Ready' : 'Waiting'}
                        </span>
                        <strong style={{ color: entry.payStatus === 'ready' ? 'var(--color-success)' : 'var(--color-warning)' }}>{currency}{fmt(entry.due)}</strong>
                      </div>
                    </div>
                  ))}
                  <button className="ledger-pay-button" onClick={() => onPay(worker)}>Pay {worker.name}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectList({ items, currency, onInvoice, empty }: {
  items: any[]; currency: string; onInvoice: (task: any) => void; empty: string;
}) {
  if (items.length === 0) return <EmptyBox text={empty} />;
  return (
    <div className="ledger-list">
      {items.map((task: any) => (
        <div key={task.id} className="ledger-row">
          <div className="ledger-row-icon green"><CheckCircle2 size={18} /></div>
          <div className="ledger-row-main">
            <div className="ledger-row-title">{task.title || 'Untitled Project'}</div>
            <div className="ledger-row-sub">{task.client || 'Unknown Client'} - Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '—'}</div>
          </div>
          <div className="ledger-row-money">
            <strong>{currency}{fmt(task.budget)}</strong>
            {task.due > 0 ? (
              <span style={{ display: 'inline-block', background: 'rgba(255,149,0,0.12)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: 5, fontSize: '10px', fontWeight: 500, marginTop: '4px' }}>Pending Clearance</span>
            ) : (
              <span style={{ display: 'inline-block', background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 5, fontSize: '10px', fontWeight: 500, marginTop: '4px' }}>Fully Paid</span>
            )}
          </div>
          <button className="ledger-row-button" onClick={() => onInvoice(task)}>Invoice</button>
        </div>
      ))}
    </div>
  );
}

export function TransactionList({ items, currency, empty, onDelete }: {
  items: any[]; currency: string; empty: string; onDelete?: (tx: any) => void;
}) {
  if (items.length === 0) return <EmptyBox text={empty} />;
  return (
    <div className="ledger-list">
      {items.map((tx: any) => {
        const isIn = tx.type === 'in';
        const dateStr = (() => {
          try {
            const raw = tx.createdAt || tx.date;
            if (!raw) return '—';
            const d = new Date(raw);
            if (isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch { return '—'; }
        })();
        return (
          <div key={tx.id} className="ledger-row">
            <div className={`ledger-row-icon ${isIn ? 'green' : 'red'}`}>{isIn ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</div>
            <div className="ledger-row-main">
              <div className="ledger-row-title">{tx.title || (isIn ? 'Cash In' : 'Cash Out')}</div>
              <div className="ledger-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span>{tx.category || 'General'}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{dateStr}</span>
                {tx.account && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '0px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{tx.account}</span>
                  </>
                )}
                {tx.note && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{tx.note}</span>
                  </>
                )}
              </div>
            </div>
            <div className={`ledger-row-money ${isIn ? 'positive' : 'negative'}`}>
              <strong>{isIn ? '+' : '-'}{currency}{fmt(tx.amount)}</strong>
              {tx.attachmentUrl && (
                <a href={tx.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-info)', fontSize: 11, fontWeight: 600, textDecoration: 'none', marginTop: 4, background: 'rgba(0,122,255,0.08)', padding: '2px 8px', borderRadius: 100 }}>
                  <Paperclip size={12} /> Receipt
                </a>
              )}
            </div>
            {onDelete && (
              <button
                className="ledger-icon-button red"
                title="Delete transaction"
                onClick={() => onDelete(tx)}
                style={{ flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getPastMonthKeys(currentMonthKey: string, count: number): string[] {
  const [y, m] = currentMonthKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function getStreak(expenseId: string, currentMonthKey: string, monthlyPayments: any[]): number {
  let streak = 0;
  const [y, m] = currentMonthKey.split('-').map(Number);
  for (let i = 1; i <= 12; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const wasPaid = monthlyPayments.some((p: any) => p.expenseId === expenseId && p.monthKey === key && p.paidAt);
    if (!wasPaid) break;
    streak++;
  }
  return streak;
}

export function BillList({ expenses, monthlyPayments, monthKey, currency, isAdmin, editingId, editAmount, setEditingId, setEditAmount, onSave, onToggle, onDelete }: any) {
  if (expenses.length === 0) return <EmptyBox text="No studio bills configured." />;

  const historyKeys = getPastMonthKeys(monthKey, 6);
  const paidCount = expenses.filter((e: any) => monthlyPayments.some((p: any) => p.expenseId === e.id && p.monthKey === monthKey && p.paidAt)).length;
  const totalAmount = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const paidAmount = expenses.filter((e: any) => monthlyPayments.some((p: any) => p.expenseId === e.id && p.monthKey === monthKey && p.paidAt)).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;
  const progressPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const sorted = [...expenses].sort((a: any, b: any) => {
    const aPaid = monthlyPayments.some((p: any) => p.expenseId === a.id && p.monthKey === monthKey && p.paidAt);
    const bPaid = monthlyPayments.some((p: any) => p.expenseId === b.id && p.monthKey === monthKey && p.paidAt);
    return aPaid === bPaid ? 0 : aPaid ? 1 : -1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Progress summary */}
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {paidCount} / {expenses.length} paid
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{currency}{fmt(paidAmount)} paid</span>
            {pendingAmount > 0 && <span style={{ fontSize: 12, color: 'var(--color-warning)', fontWeight: 600 }}>{currency}{fmt(pendingAmount)} pending</span>}
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progressPct}%`,
            background: progressPct === 100 ? 'var(--color-success)' : 'var(--accent-gold)',
            transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {/* Bill rows */}
      <div className="ledger-list">
        {sorted.map((expense: any) => {
          const payRecord = monthlyPayments.find((p: any) => p.expenseId === expense.id && p.monthKey === monthKey);
          const paid = !!(payRecord?.paidAt);
          const paidAt = payRecord?.paidAt ? new Date(payRecord.paidAt) : null;
          const category = EXPENSE_CATEGORIES.find(c => c.id === expense.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
          const editing = editingId === expense.id;
          const streak = getStreak(expense.id, monthKey, monthlyPayments);

          return (
            <div key={expense.id} className={`ledger-row ${paid ? 'is-paid' : ''}`} style={{ flexWrap: 'wrap', gap: 8 }}>
              {/* Icon */}
              <div className="ledger-row-icon" style={{ color: category.color, background: `${category.color}18`, position: 'relative' }}>
                {category.icon}
                {paid && (
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card-bg)' }}>
                    <Check size={8} color="white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Main info */}
              <div className="ledger-row-main" style={{ minWidth: 0 }}>
                <div className="ledger-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {expense.name}
                  {streak >= 2 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(52,199,89,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      🔥 {streak}mo streak
                    </span>
                  )}
                </div>
                <div className="ledger-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{category.label}</span>
                  {paid && paidAt && (
                    <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                      Paid {paidAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {/* History dots — last 6 months */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} title="Last 6 months payment history">
                    {historyKeys.map(hKey => {
                      const wasP = monthlyPayments.some((p: any) => p.expenseId === expense.id && p.monthKey === hKey && p.paidAt);
                      const [, hm] = hKey.split('-');
                      return (
                        <div key={hKey} title={`${new Date(Number(hKey.split('-')[0]), Number(hm) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })}: ${wasP ? 'Paid' : 'Unpaid'}`}
                          style={{ width: 7, height: 7, borderRadius: '50%', background: wasP ? 'var(--color-success)' : 'var(--border-color)', flexShrink: 0 }} />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="ledger-row-money">
                {editing ? (
                  <input className="ledger-inline-input" autoFocus type="number" min="0" step="0.01" value={editAmount}
                    onKeyDown={e => ['e','E','+','-'].includes(e.key) && e.preventDefault()}
                    onChange={ev => { const v = ev.target.value; if (v === '' || (Number(v) >= 0 && isFinite(Number(v)))) setEditAmount(v); }} />
                ) : (
                  <strong style={{ color: paid ? 'var(--color-success)' : 'var(--text-primary)' }}>{currency}{fmt(expense.amount)}</strong>
                )}
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="ledger-row-actions">
                  {editing ? (
                    <>
                      <button aria-label="Save" className="ledger-icon-button green" onClick={() => onSave(expense)}><Check size={14} /></button>
                      <button aria-label="Cancel" className="ledger-icon-button" onClick={() => setEditingId(null)}><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button aria-label="Edit amount" className="ledger-icon-button" onClick={() => { setEditingId(expense.id); setEditAmount(String(expense.amount ?? 0)); }}><Edit2 size={14} /></button>
                      {onDelete && <button aria-label="Delete bill" className="ledger-icon-button red" onClick={() => onDelete(expense)}><X size={14} /></button>}
                    </>
                  )}
                  <button className={`ledger-row-button ${paid ? 'paid' : ''}`} onClick={() => onToggle(expense)}>
                    {paid ? 'Undo' : 'Mark Paid'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkerPaymentHistory({ payments, currency }: { payments: any[]; currency: string }) {
  const sorted = [...payments].sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());
  const grouped: Record<string, any[]> = {};
  sorted.forEach(p => {
    const name = p.workerName || p.workerId || 'Unknown';
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push(p);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(grouped).map(([name, pmts]) => {
        const total = pmts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return (
          <div key={name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>{currency}{fmt(total)} total paid</span>
            </div>
            <div className="ledger-list" style={{ gap: 6 }}>
              {pmts.map((p: any, i: number) => (
                <div key={i} className="ledger-row" style={{ padding: '10px 14px' }}>
                  <div className="ledger-row-icon green"><CheckCircle2 size={16} /></div>
                  <div className="ledger-row-main">
                    <div className="ledger-row-title">{p.note || 'Worker payable settlement'}</div>
                    <div className="ledger-row-sub">
                      {new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {p.paidBy ? ` · by ${p.paidBy}` : ''}
                    </div>
                  </div>
                  <div className="ledger-row-money">
                    <strong style={{ color: 'var(--color-success)' }}>+{currency}{fmt(p.amount)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReportMini({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`ledger-report-mini ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyBox({ text }: { text: string }) {
  return <div className="mf-empty-box">{text}</div>;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      className="ledger-dialog-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="ledger-dialog"
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 16, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 400 }}
      >
        <div className="ledger-dialog-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: danger ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={16} style={{ color: danger ? 'var(--color-danger)' : 'var(--color-warning)' }} />
            </div>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <button onClick={onCancel}><X size={16} /></button>
        </div>
        <div style={{ padding: '4px 0 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{message}</p>
        </div>
        <div className="ledger-dialog-actions">
          <button className="ledger-small-button" onClick={onCancel}>Cancel</button>
          <button
            className={`ledger-small-button primary${danger ? ' red' : ''}`}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FinanceModals(props: any) {
  const {
    currency, monthLabel,
    showAddForm, setShowAddForm, newExpense, setNewExpense, handleAddExpense,
    payModal, setPayModal, payAmount, setPayAmount, payNote, setPayNote, handlePayWorker, payProcessing,
    showAddIncome, setShowAddIncome, newIncome, setNewIncome, handleAddIncome,
    showAddExpenseModal, setShowAddExpenseModal, newOneOffExpense, setNewOneOffExpense, handleAddOneOffExpense,
    uploadingReceipt, setUploadingReceipt, fireToast,
  } = props;

  return (
    <AnimatePresence>
      {showAddForm && (
        <FinanceDialog title="Add Fixed Bill" onClose={() => setShowAddForm(false)}>
          <form onSubmit={handleAddExpense} className="ledger-form">
            <FormInput label="Bill Name" value={newExpense.name} onChange={(value: string) => setNewExpense({ ...newExpense, name: value })} placeholder="e.g. Electricity Bill" required />
            <FormInput label={`Amount (${currency})`} type="number" value={newExpense.amount} onChange={(value: string) => setNewExpense({ ...newExpense, amount: value })} placeholder="e.g. 5000" required />
            <div className="ledger-dialog-actions">
              <button type="button" className="ledger-small-button" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="ledger-small-button primary">Save Bill</button>
            </div>
          </form>
        </FinanceDialog>
      )}

      {payModal && (
        <FinanceDialog title={`Pay ${payModal.name}`} subtitle={`${payModal.tasks.length} payable task${payModal.tasks.length > 1 ? 's' : ''}`} onClose={() => setPayModal(null)}>
          <div className="ledger-dialog-summary">
            <ReportMini label="Earned"            value={`${currency}${fmt(payModal.totalEarned)}`} />
            <ReportMini label="Already Paid"      value={`${currency}${fmt(payModal.totalPaid)}`}   tone="green" />
            <ReportMini label="Ready to Pay"      value={`${currency}${fmt(payModal.readyDue)}`}    tone="green" />
            <ReportMini label="Waiting Clearance" value={`${currency}${fmt(payModal.waitingDue)}`}  tone="orange" />
          </div>
          <div className="ledger-form">
            <FormInput label={`Amount to Pay (${currency})`} type="number" value={payAmount} onChange={setPayAmount} placeholder={String(payModal.readyDue || payModal.totalDue)} autoFocus />
            <FormInput label="Note" value={payNote} onChange={setPayNote} placeholder="e.g. Clear pending dues" />
            <div className="ledger-dialog-actions">
              <button type="button" className="ledger-small-button" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="button" className="ledger-small-button primary" onClick={handlePayWorker} disabled={payProcessing}>{payProcessing ? 'Processing…' : 'Confirm Payment'}</button>
            </div>
          </div>
        </FinanceDialog>
      )}

      {showAddIncome && (
        <FinanceDialog title="Add Cash In" subtitle={`Log income for ${monthLabel}.`} onClose={() => setShowAddIncome(false)}>
          <form onSubmit={handleAddIncome} className="ledger-form">
            <FormInput label={`Amount (${currency})`} type="number" value={newIncome.amount} onChange={(value: string) => setNewIncome({ ...newIncome, amount: value })} placeholder="e.g. 50000" required autoFocus />
            <label className="form-label">Received via</label>
            <select className="form-input" value={newIncome.account} onChange={e => setNewIncome((p: any) => ({ ...p, account: e.target.value }))}>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
            <FormInput label="Note / Source" value={newIncome.note} onChange={(value: string) => setNewIncome({ ...newIncome, note: value })} placeholder="e.g. Direct client payment" />
            <div className="ledger-dialog-actions">
              <button type="button" className="ledger-small-button" onClick={() => setShowAddIncome(false)}>Cancel</button>
              <button type="submit" className="ledger-small-button primary green">Save Cash In</button>
            </div>
          </form>
        </FinanceDialog>
      )}

      {showAddExpenseModal && (
        <FinanceDialog title="Add Cash Out" subtitle={`Log expense for ${monthLabel}.`} onClose={() => setShowAddExpenseModal(false)}>
          <form onSubmit={handleAddOneOffExpense} className="ledger-form">
            <FormInput label={`Amount (${currency})`} type="number" value={newOneOffExpense.amount} onChange={(value: string) => setNewOneOffExpense({ ...newOneOffExpense, amount: value })} placeholder="e.g. 5000" required autoFocus />
            <label className="form-label">Paid via</label>
            <select className="form-input" value={newOneOffExpense.account} onChange={e => setNewOneOffExpense((p: any) => ({ ...p, account: e.target.value }))}>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Other">Other</option>
            </select>
            <label className="form-label">Category</label>
            <select className="form-input" value={newOneOffExpense.category} onChange={(event) => setNewOneOffExpense({ ...newOneOffExpense, category: event.target.value })}>
              <option value="General">General Expense</option>
              <option value="Equipment">Studio Equipment</option>
              <option value="Marketing">Marketing & Ads</option>
              <option value="Snacks">Tea & Snacks</option>
              <option value="Maintenance">Maintenance & Repair</option>
              <option value="Other">Other</option>
            </select>
            <FormInput label="Note / Detail" value={newOneOffExpense.note} onChange={(value: string) => setNewOneOffExpense({ ...newOneOffExpense, note: value })} placeholder="e.g. Bought a new microphone" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label className="form-label">Receipt (Optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  id="receipt-upload"
                  style={{ display: 'none' }}
                  disabled={uploadingReceipt}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 15 * 1024 * 1024) {
                      fireToast?.('File too large. Maximum 15 MB.', 'error');
                      e.target.value = '';
                      return;
                    }
                    setUploadingReceipt(true);
                    try {
                      const fileRef = ref(storage, `receipts/${Date.now()}_${file.name}`);
                      const task = uploadBytesResumable(fileRef, file);
                      task.on('state_changed', null,
                        () => {
                          setUploadingReceipt(false);
                          fireToast?.('Receipt upload failed. Please try again.', 'error');
                        },
                        async () => {
                          const url = await getDownloadURL(fileRef);
                          setNewOneOffExpense((prev: any) => ({ ...prev, receiptUrl: url, receiptName: file.name }));
                          setUploadingReceipt(false);
                          fireToast?.('Receipt uploaded successfully.', 'success');
                        }
                      );
                    } catch { setUploadingReceipt(false); fireToast?.('Upload failed. Please try again.', 'error'); }
                  }}
                />
                <label htmlFor="receipt-upload" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: uploadingReceipt ? 'not-allowed' : 'pointer', fontWeight: 600, color: uploadingReceipt ? 'var(--text-tertiary)' : 'var(--text-secondary)', opacity: uploadingReceipt ? 0.6 : 1, pointerEvents: uploadingReceipt ? 'none' : 'auto' }}>
                  {uploadingReceipt ? 'Uploading…' : 'Upload Receipt'}
                </label>
                {newOneOffExpense.receiptName && <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>{newOneOffExpense.receiptName} (Ready)</span>}
              </div>
            </div>
            <div className="ledger-dialog-actions">
              <button type="button" className="ledger-small-button" onClick={() => setShowAddExpenseModal(false)}>Cancel</button>
              <button type="submit" className="ledger-small-button primary red">Save Cash Out</button>
            </div>
          </form>
        </FinanceDialog>
      )}
    </AnimatePresence>
  );
}

export function FinanceDialog({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div className="ledger-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
      <motion.div className="ledger-dialog" initial={{ scale: 0.96, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 16, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} onClick={(event) => event.stopPropagation()}>
        <div className="ledger-dialog-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function FormInput({ label, value, onChange, type = 'text', placeholder, required, autoFocus }: any) {
  const id = label?.toLowerCase().replace(/\s+/g, '-') || 'input';
  return (
    <div>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} name={id} autoFocus={autoFocus} className="form-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}

export function GoalBar({ goal, current, money }: { goal: number; current: number; money: (n: number) => string }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const over = current >= goal;
  return (
    <div style={{ marginTop: 12, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Income Goal</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--color-success)' : 'var(--text-secondary)' }}>
          {money(current)} / {money(goal)} &nbsp;·&nbsp; {pct}%{over ? ' ✓' : ''}
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: over ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-info)', transition: 'width 0.4s ease' }} />
      </div>
      {!over && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{money(goal - current)} remaining to hit target</div>}
    </div>
  );
}

export function HealthScore({ cashIn, cashProfit, paidBillsCount, totalBillsCount, totalClientDue, avgMonthlyIncome, money }: {
  cashIn: number; cashProfit: number; paidBillsCount: number; totalBillsCount: number;
  totalClientDue: number; avgMonthlyIncome: number; money: (n: number) => string;
}) {
  // Profit margin (0–40): positive margin scaled to 40 pts
  const marginScore = cashIn > 0 ? Math.max(0, Math.min(40, Math.round((cashProfit / cashIn) * 40))) : 0;
  // Bill payment rate (0–30)
  const billScore = totalBillsCount > 0 ? Math.round((paidBillsCount / totalBillsCount) * 30) : 30;
  // All-time collection score (0–30): use 3× avg monthly income as max-due benchmark
  const dueBenchmark = Math.max(avgMonthlyIncome * 3, 1);
  const collectionScore = Math.max(0, Math.round((1 - Math.min(1, totalClientDue / dueBenchmark)) * 30));
  const score = marginScore + billScore + collectionScore;
  const grade = score >= 80 ? { label: 'Excellent', color: '#15803d', bg: '#f0fdf4' }
    : score >= 60 ? { label: 'Good', color: '#1d4ed8', bg: '#eff6ff' }
    : score >= 40 ? { label: 'Fair', color: '#b45309', bg: '#fffbeb' }
    : { label: 'Needs Attention', color: '#b91c1c', bg: '#fef2f2' };
  return (
    <div style={{ marginTop: 12, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Financial Health Score</span>
        <span style={{ fontSize: 13, fontWeight: 800, padding: '2px 10px', borderRadius: 20, background: grade.bg, color: grade.color }}>{grade.label}</span>
      </div>
      <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, borderRadius: 999, background: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-info)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, flexWrap: 'wrap' }}>
        <span>Profit margin: {marginScore}/40</span>
        <span>Bills paid: {billScore}/30</span>
        <span title={`${money(totalClientDue)} outstanding vs benchmark ${money(dueBenchmark)}`}>Collection: {collectionScore}/30</span>
        <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{score}/100</span>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub, tone, icon, trend }: {
  label: string; value: string; sub: string; tone: string; icon: React.ReactNode; trend?: number;
}) {
  const hasTrend = trend !== undefined && trend !== 0;
  return (
    <div className={`ledger-kpi ${tone}`}>
      <div className="ledger-kpi-icon">{icon}</div>
      <div className="ledger-kpi-label">{label}</div>
      <div className="ledger-kpi-value">{value}</div>
      <div className="ledger-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {hasTrend ? (
          <span style={{ color: trend! > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700, fontSize: 11 }}>
            {trend! > 0 ? '↑' : '↓'} {Math.abs(trend!)}% vs last mo
          </span>
        ) : (
          sub || null
        )}
      </div>
    </div>
  );
}

export function LedgerPanel({ title, icon, description, actionLabel, onAction, children }: { title: string; icon: React.ReactNode; description?: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="ledger-panel">
      <div className="ledger-panel-head">
        <div className="ledger-panel-title-wrap">
          <div className="ledger-panel-icon">{icon}</div>
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        {actionLabel && onAction && <button className="ledger-small-button" onClick={onAction}>{actionLabel}</button>}
      </div>
      <div className="ledger-panel-body">{children}</div>
    </section>
  );
}

export function ActionCenter({ items, currency }: { items: any[]; currency: string }) {
  return (
    <section className="ledger-action-center">
      <div className="ledger-action-center-head">
        <div>
          <div className="ledger-action-center-title">Priority Actions</div>
          <div className="ledger-action-center-sub">Collect dues, settle payable work, and clear monthly bills.</div>
        </div>
        <div className="ledger-action-count">{items.length} open</div>
      </div>

      {items.length === 0 ? (
        <div className="ledger-action-empty">
          <CheckCircle2 size={20} />
          All finance actions are clear.
        </div>
      ) : (
        <div className="ledger-action-list">
          {items.map((item: any) => (
            <div key={item.id} className={`ledger-action-item ${item.tone}`}>
              <div className="ledger-action-dot">
                {item.tone === 'red' ? <AlertTriangle size={16} /> : item.tone === 'orange' ? <Wallet size={16} /> : <Bell size={16} />}
              </div>
              <div className="ledger-row-main">
                <div className="ledger-row-title">{item.title}</div>
                <div className="ledger-row-sub">{item.sub}</div>
              </div>
              <div className="ledger-row-money">
                <strong>{currency}{Number(item.amount).toLocaleString()}</strong>
              </div>
              <button className="ledger-row-button" onClick={item.action}>{item.label}</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
