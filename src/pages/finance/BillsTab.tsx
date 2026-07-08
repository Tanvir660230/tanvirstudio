import type { Dispatch, SetStateAction } from 'react';
import { Plus, ReceiptText, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { BillList, ReportMini, LedgerPanel } from '../../components/finance/FinanceShared';

const PIE_COLORS = ['var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)', 'var(--accent-purple)', 'var(--accent-indigo)', '#8E8E93'];

export interface BillsTabProps {
  recurringExpenses: any[];
  monthlyPayments: any[];
  monthKey: string;
  currency: string;
  isAdmin: boolean;
  editingId: string | null;
  editAmount: string;
  setEditingId: (id: string | null) => void;
  setEditAmount: (v: string) => void;
  saveEditAmount: (expense: any) => void;
  togglePaid: (expense: any) => void;
  handleDeleteExpense: (expense: any) => void;
  paidBills: any[];
  unpaidBills: any[];
  setShowAddForm: (v: boolean) => void;
  handleQuickSetup: () => void;
  payAll: () => void;
  monthLabel: string;
  showAddIncomeForm: boolean;
  setShowAddIncomeForm: Dispatch<SetStateAction<boolean>>;
  newRecurringIncome: { name: string; amount: string };
  setNewRecurringIncome: Dispatch<SetStateAction<{ name: string; amount: string }>>;
  handleAddRecurringIncome: (e: React.FormEvent) => void;
  recurringIncome: any[];
  receivedIncomeKeys: Set<string>;
  toggleIncomeReceived: (income: any) => void;
  handleDeleteRecurringIncome: (income: any) => void;
  expensePieData: { name: string; value: number; pct: number; limit: number; overLimit: boolean }[];
  money: (n: number) => string;
}

export function BillsTab({
  recurringExpenses, monthlyPayments, monthKey, currency, isAdmin,
  editingId, editAmount, setEditingId, setEditAmount, saveEditAmount, togglePaid, handleDeleteExpense,
  paidBills, unpaidBills, setShowAddForm, handleQuickSetup, payAll, monthLabel,
  showAddIncomeForm, setShowAddIncomeForm, newRecurringIncome, setNewRecurringIncome, handleAddRecurringIncome,
  recurringIncome, receivedIncomeKeys, toggleIncomeReceived, handleDeleteRecurringIncome,
  expensePieData, money,
}: BillsTabProps) {
  return (
    <>
      <LedgerPanel title="Studio Bills" icon={<ReceiptText size={18} />} description={`Fixed operating costs for ${monthLabel}.`}>
        {recurringExpenses.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {paidBills.length} / {recurringExpenses.length} paid
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: paidBills.length === recurringExpenses.length ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {Math.round((paidBills.length / recurringExpenses.length) * 100)}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.round((paidBills.length / recurringExpenses.length) * 100)}%`,
                background: paidBills.length === recurringExpenses.length ? 'var(--color-success)' : 'var(--color-warning)',
                borderRadius: 999, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}
        <div className="ledger-inline-actions">
          {isAdmin && <button className="ledger-small-button" onClick={() => setShowAddForm(true)}><Plus size={14} /> Add Bill</button>}
          {isAdmin && recurringExpenses.length === 0 && <button className="ledger-small-button" onClick={handleQuickSetup}>Quick Setup</button>}
          {isAdmin && unpaidBills.length > 0 && <button className="ledger-small-button primary" onClick={payAll}>Pay All Pending</button>}
        </div>
        <BillList
          expenses={recurringExpenses}
          monthlyPayments={monthlyPayments}
          monthKey={monthKey}
          currency={currency}
          isAdmin={isAdmin}
          editingId={editingId}
          editAmount={editAmount}
          setEditingId={setEditingId}
          setEditAmount={setEditAmount}
          onSave={saveEditAmount}
          onToggle={togglePaid}
          onDelete={handleDeleteExpense}
        />
        <div className="ledger-report-strip">
          <ReportMini label="Paid Bills" value={money(paidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />
          <ReportMini label="Pending Bills" value={money(unpaidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />
        </div>
      </LedgerPanel>

      <LedgerPanel title="Recurring Income" icon={<TrendingUp size={18} />} description={`Expected monthly income sources for ${monthLabel}.`}>
        {isAdmin && (
          <div className="ledger-inline-actions">
            <button className="ledger-small-button" onClick={() => setShowAddIncomeForm(v => !v)}><Plus size={14} /> Add Source</button>
          </div>
        )}
        {showAddIncomeForm && (
          <form onSubmit={handleAddRecurringIncome} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input className="ledger-input" style={{ flex: 2, minWidth: 120 }} placeholder="Source name (e.g. Retainer - Client X)" value={newRecurringIncome.name} onChange={e => setNewRecurringIncome((p: any) => ({ ...p, name: e.target.value }))} required />
            <input className="ledger-input" style={{ flex: 1, minWidth: 80 }} type="number" min="0" placeholder="Amount" value={newRecurringIncome.amount} onChange={e => setNewRecurringIncome((p: any) => ({ ...p, amount: e.target.value }))} required />
            <button className="ledger-small-button primary" type="submit">Save</button>
            <button className="ledger-small-button" type="button" onClick={() => setShowAddIncomeForm(false)}>Cancel</button>
          </form>
        )}
        {recurringIncome.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600 }}>No recurring income sources added yet.</div>
        ) : (
          <div className="ledger-list">
            {recurringIncome.map((income: any) => {
              const received = receivedIncomeKeys.has(income.id);
              return (
                <div key={income.id} className={`ledger-row${received ? ' muted' : ''}`}>
                  <div className="ledger-row-icon" style={{ background: received ? 'rgba(52,199,89,0.1)' : 'rgba(0,122,255,0.08)', color: received ? 'var(--color-success)' : 'var(--color-info)' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="ledger-row-main">
                    <div className="ledger-row-title" style={{ textDecoration: received ? 'line-through' : 'none', opacity: received ? 0.6 : 1 }}>{income.name}</div>
                    <div className="ledger-row-sub">{received ? 'Received this month' : 'Pending receipt'}</div>
                  </div>
                  <div className="ledger-row-money">
                    <strong style={{ color: received ? 'var(--color-success)' : 'var(--text-primary)' }}>{currency}{Number(income.amount).toLocaleString()}</strong>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`ledger-row-button${received ? '' : ' primary'}`} onClick={() => toggleIncomeReceived(income)}>
                        {received ? 'Undo' : '✓ Received'}
                      </button>
                      {!received && <button className="ledger-row-button" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteRecurringIncome(income)}>✕</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="ledger-report-strip" style={{ marginTop: 12 }}>
          <ReportMini label="Received" value={money(recurringIncome.filter((i: any) => receivedIncomeKeys.has(i.id)).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} tone="green" />
          <ReportMini label="Pending" value={money(recurringIncome.filter((i: any) => !receivedIncomeKeys.has(i.id)).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} />
        </div>
      </LedgerPanel>

      {expensePieData.length > 0 && (
        <LedgerPanel title="Expense Breakdown" icon={<TrendingDown size={18} />} description={`Cash out by category in ${monthLabel}.`}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <PieChart width={180} height={180}>
              <Tooltip formatter={(val: any) => { const n = Number(val || 0); return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, 'Amount']; }} contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }} />
              <Pie data={expensePieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} stroke="none" cornerRadius={4}>
                {expensePieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
              {expensePieData.map((entry: any, i: number) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.overLimit ? 'var(--color-danger)' : PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.overLimit && '⚠ '}{entry.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-primary)', marginLeft: 8, flexShrink: 0 }}>
                        {currency}{entry.value.toLocaleString()}
                        {entry.limit > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}> / {currency}{entry.limit.toLocaleString()}</span>}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: entry.limit > 0 ? `${Math.min(100, Math.round((entry.value / entry.limit) * 100))}%` : `${entry.pct}%`, background: entry.overLimit ? 'var(--color-danger)' : PIE_COLORS[i % PIE_COLORS.length], borderRadius: 999 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-tertiary)', minWidth: 32, textAlign: 'right' }}>{entry.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </LedgerPanel>
      )}
    </>
  );
}
