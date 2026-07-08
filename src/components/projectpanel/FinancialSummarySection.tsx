import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, FileText, Wallet, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from './Card';

interface FinancialSummarySectionProps {
  task: any;
  isAdmin: boolean;
  currency: string;
  budget: number;
  paid: number;
  due: number;
  pct: number;
  paidFull: boolean;
  userData: any;
  localProgress: number;
  setLocalProgress: (val: number) => void;
  progressSaveRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  showPaymentInput: boolean;
  setShowPaymentInput: (val: boolean) => void;
  paymentAmount: string;
  setPaymentAmount: (val: string) => void;
  paymentNote: string;
  setPaymentNote: (val: string) => void;
  isSubmittingPayment: boolean;
  handleLogPayment: (e?: React.FormEvent) => void;
  handleDeletePayment: (index: number) => void;
  onGenerateInvoice?: (task: any) => void;
  safeDate: (val: any, opts: Intl.DateTimeFormatOptions, fallback?: string) => string;
}

export function FinancialSummarySection({
  task, isAdmin, currency, budget, paid, due, pct, paidFull, userData,
  localProgress, setLocalProgress, progressSaveRef,
  showPaymentInput, setShowPaymentInput,
  paymentAmount, setPaymentAmount,
  paymentNote, setPaymentNote,
  isSubmittingPayment, handleLogPayment, handleDeletePayment,
  onGenerateInvoice, safeDate,
}: FinancialSummarySectionProps) {
  return (
    <Card title="Financial Overview" icon={<Wallet size={15} color="var(--color-success)" />} color="var(--color-success)">
      <div className="stat-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Budget', value: budget, color: 'var(--text-primary)', bg: 'var(--bg-color)', border: 'var(--border-color)' },
          { label: 'Received', value: paid, color: 'var(--color-success)', bg: 'linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.02))', border: 'rgba(52,199,89,0.2)' },
          { label: 'Due', value: Math.max(0, due), color: due > 0 ? 'var(--color-danger)' : 'var(--color-success)', bg: due > 0 ? 'linear-gradient(135deg, rgba(255,59,48,0.1), rgba(255,59,48,0.02))' : 'linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.02))', border: due > 0 ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)' },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${item.border}` }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: item.color, letterSpacing: '-0.3px' }}>{currency}{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 800, letterSpacing: '0.2px' }}>Collection Progress</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: paidFull ? 'var(--color-success)' : 'var(--text-primary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-color)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', boxShadow: 'none' }}>
          {/* layoutId prevents re-animation from 0 when Firestore updates while panel is open */}
          <motion.div layoutId={`progress-${task.id}`} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%', borderRadius: 8, background: paidFull ? 'linear-gradient(90deg, #34C759, #30D158)' : 'linear-gradient(90deg, #007AFF, #34AADC)', boxShadow: 'none' }} />
        </div>
      </div>

      {/* Work progress slider — admin/composer only */}
      {(userData?.role === 'admin' || userData?.role === 'composer') && task.status !== 'completed' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 800, letterSpacing: '0.2px' }}>Work Progress</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: localProgress >= 100 ? 'var(--color-success)' : 'var(--text-primary)' }}>{localProgress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={localProgress}
            onChange={e => {
              const val = Number(e.target.value);
              setLocalProgress(val);
              if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
              progressSaveRef.current = setTimeout(() => {
                updateDoc(doc(db, 'tasks', task.id), { progress: val }).catch(() => {});
              }, 600);
            }}
            style={{ width: '100%', accentColor: 'var(--color-info)', cursor: 'pointer' }}
          />
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 10 }}>
          {!showPaymentInput ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {due > 0 && (
                <button
                  onClick={() => {
                    setPaymentAmount(due.toString());
                    setPaymentNote(paid === 0 ? (due === budget ? 'Full Payment' : 'Advance Payment') : 'Final Payment');
                    setShowPaymentInput(true);
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  <Plus size={14} /> Log Payment
                </button>
              )}
              {onGenerateInvoice && (
                <button
                  onClick={() => onGenerateInvoice(task)}
                  title="Generate Invoice"
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--bg-color)', color: 'var(--text-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                >
                  <FileText size={16} />
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogPayment} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Log New Payment</div>
                {due > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" onClick={() => { setPaymentAmount(Math.round(due / 2).toString()); setPaymentNote('Advance Payment'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>50%</button>
                    <button type="button" onClick={() => { setPaymentAmount(due.toString()); setPaymentNote(paid === 0 ? 'Full Payment' : 'Final Payment'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer', fontWeight: 600 }}>100%</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 600 }}>{currency}</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      if (e.target.value && Number(e.target.value) < due) setPaymentNote('Partial Payment');
                      if (e.target.value && Number(e.target.value) === due) setPaymentNote(paid === 0 ? 'Full Payment' : 'Final Payment');
                    }}
                    placeholder="Amount"
                    disabled={isSubmittingPayment}
                    style={{ width: '100%', padding: '9px 10px 9px 28px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, transition: 'all 0.2s', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-success)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Note (e.g. Partial)"
                  disabled={isSubmittingPayment}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, transition: 'all 0.2s', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-success)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              {/* Dynamic Balance Preview */}
              {paymentAmount && !isNaN(Number(paymentAmount)) && (
                <div style={{ fontSize: 11, color: Number(paymentAmount) > due ? 'var(--color-danger)' : 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {Number(paymentAmount) > due
                    ? <><AlertCircle size={12} /> Overpaying by {currency}{(Number(paymentAmount) - due).toLocaleString()}</>
                    : Number(paymentAmount) === due
                      ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Balance will be fully cleared</span>
                      : `Remaining balance: ${currency}${(due - Number(paymentAmount)).toLocaleString()}`}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: paymentAmount ? 0 : 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentInput(false)}
                  disabled={isSubmittingPayment}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-color)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface-1)'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment || !paymentAmount}
                  style={{ flex: 1.5, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #34C759, #30D158)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: isSubmittingPayment || !paymentAmount ? 'not-allowed' : 'pointer', opacity: isSubmittingPayment || !paymentAmount ? 0.6 : 1, boxShadow: 'none', transition: 'transform 0.1s' }}
                  onMouseDown={(e) => { if (!isSubmittingPayment && paymentAmount) e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  {isSubmittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Payment history */}
      {(task.payments || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Payment History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(task.payments || []).map((p: any, i: number) => (
              <div key={p.date ? `${p.date}-${p.amount}-${i}` : i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: 'none', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{Number(p.amount).toLocaleString()}</div>
                    {p.note && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 600 }}>{p.note}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700 }}>{safeDate(p.date, { month: 'short', day: 'numeric' })}</span>
                  {isAdmin && (
                    <button onClick={() => handleDeletePayment(i)} title="Remove entry"
                      style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
