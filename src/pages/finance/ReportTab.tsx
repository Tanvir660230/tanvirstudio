import type { CSSProperties } from 'react';
import { TrendingUp, FileText, CheckCircle2, Bell, Wallet, Banknote, ReceiptText, TrendingDown } from 'lucide-react';
import {
  LedgerPanel, ReportMini, ProjectList, ClientDueList, WorkerDueList, TransactionList, BillList,
} from '../../components/finance/FinanceShared';

export interface ReportTabProps {
  budgetVsActualData: any[];
  money: (n: number) => string;
  completedProjects: any[];
  clientDues: any[];
  workerRegistry: Record<string, any>;
  expandedWorker: string | null;
  setExpandedWorker: (id: string | null) => void;
  setPayModal: (worker: any) => void;
  monthTransactions: any[];
  paidBills: any[];
  unpaidBills: any[];
  recurringExpenses: any[];
  monthlyPayments: any[];
  monthKey: string;
  isAdmin: boolean;
  editingId: string | null;
  editAmount: string;
  setEditingId: (id: string | null) => void;
  setEditAmount: (v: string) => void;
  saveEditAmount: (expense: any) => void;
  togglePaid: (expense: any) => void;
  setInvoiceTask: (task: any) => void;
  handleSendReminder: (task: any, daysOverdue: number) => void;
  studioName?: string;
  exportReportCSV: () => void;
  monthLabel: string;
  currency: string;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  cashProfit: number;
  closingBalance: number;
  totalWorkerDue: number;
  completedValue: number;
  completedDue: number;
  totalClientDue: number;
  fireToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ReportTab({
  budgetVsActualData, money, completedProjects, clientDues, workerRegistry, expandedWorker, setExpandedWorker, setPayModal,
  monthTransactions, paidBills, unpaidBills, recurringExpenses, monthlyPayments, monthKey, isAdmin,
  editingId, editAmount, setEditingId, setEditAmount, saveEditAmount, togglePaid,
  setInvoiceTask, handleSendReminder, studioName, exportReportCSV, monthLabel, currency,
  openingBalance, cashIn, cashOut, cashProfit, closingBalance, totalWorkerDue, completedValue, completedDue, totalClientDue, fireToast,
}: ReportTabProps) {
  return (
    <div className="ledger-report-grid">
      <LedgerPanel title="Budget vs Actual" icon={<TrendingUp size={18} />} description="Completed projects — collected cash vs worker costs. Full margin = if fully paid.">
        {budgetVsActualData.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600 }}>No completed projects this month.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as CSSProperties}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Project', 'Budget', 'Collected', 'Worker Cost', 'Cash Margin', 'Full Margin'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Project' ? 'left' : 'right', fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budgetVsActualData.map((row: any) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {money(row.budget)}
                        {row.taxAmount > 0 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{money(row.taxAmount)} tax</div>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: row.collectedPct >= 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {money(row.clientPaid)}
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{row.collectedPct}% collected</div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>{money(row.totalCost)}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: row.cashMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {money(row.cashMargin)}
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>actual cash</div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: row.marginPct >= 50 ? 'rgba(52,199,89,0.1)' : row.marginPct >= 25 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.1)', color: row.marginPct >= 50 ? 'var(--color-success)' : row.marginPct >= 25 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                          {money(row.margin)} · {row.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-color)' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>Total ({budgetVsActualData.length})</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.grossRevenue, 0))}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-warning)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.clientPaid, 0))}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-warning)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.totalCost, 0))}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.cashMargin, 0))}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.margin, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </LedgerPanel>

      <LedgerPanel title="Monthly Cash Summary" icon={<FileText size={18} />}>
        <div className="ledger-report-strip">
          <ReportMini label="Opening Balance" value={money(openingBalance)} tone="neutral" />
          <ReportMini label="Cash In" value={money(cashIn)} tone="green" />
          <ReportMini label="Cash Out" value={money(cashOut)} tone="red" />
          <ReportMini label="Cash Profit" value={money(cashProfit)} tone={cashProfit >= 0 ? 'blue' : 'red'} />
          <ReportMini label="Closing Balance" value={money(closingBalance)} tone="neutral" />
        </div>
        {/* Accrual view: deduct unpaid worker dues from cash profit for true picture */}
        <div className="ledger-report-strip" style={{ marginTop: 12 }}>
          <ReportMini label="Worker Dues (unpaid)" value={money(totalWorkerDue)} tone={totalWorkerDue > 0 ? 'red' : ''} />
          <ReportMini
            label="Accrual Profit"
            value={money(cashProfit - totalWorkerDue)}
            tone={(cashProfit - totalWorkerDue) >= 0 ? 'blue' : 'red'}
          />
          <ReportMini label="Completed Value" value={money(completedValue)} />
          <ReportMini label="Completed Due" value={money(completedDue)} tone={completedDue > 0 ? 'red' : ''} />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
          Accrual Profit = Cash Profit minus all unpaid worker commissions (money earned but not yet paid out).
        </div>
      </LedgerPanel>

      <LedgerPanel title="Completed Projects" icon={<CheckCircle2 size={18} />}>
        <ProjectList items={completedProjects} currency={currency} onInvoice={setInvoiceTask} empty="No completed projects this month." />
      </LedgerPanel>

      <LedgerPanel title="Client Due Register" icon={<Bell size={18} />}>
        <ClientDueList items={clientDues} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={studioName} empty="No client dues." />
      </LedgerPanel>

      <LedgerPanel title="Worker Payable Register" icon={<Wallet size={18} />}>
        <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables." />
      </LedgerPanel>

      <LedgerPanel title="Cash Activity" icon={<Banknote size={18} />}>
        <TransactionList items={monthTransactions} currency={currency} empty="No transactions recorded this month." />
      </LedgerPanel>

      <LedgerPanel title="Bills Summary" icon={<ReceiptText size={18} />}>
        <div className="ledger-report-strip">
          <ReportMini label="Paid Bills" value={money(paidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} tone="red" />
          <ReportMini label="Pending Bills" value={money(unpaidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />
        </div>
        <div style={{ marginTop: 12 }}>
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
          />
        </div>
      </LedgerPanel>

      {/* Report actions */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        <button className="ledger-action neutral" onClick={exportReportCSV}>
          <TrendingDown size={14} /> Export P&amp;L CSV
        </button>
        <button
          className="ledger-action blue"
          onClick={() => {
            const bva = budgetVsActualData;
            const totalBudget = bva.reduce((s: number, r: any) => s + r.budget, 0);
            const totalCost = bva.reduce((s: number, r: any) => s + r.totalCost, 0);
            const totalMargin = bva.reduce((s: number, r: any) => s + r.margin, 0);
            const marginPct = totalBudget > 0 ? Math.round((totalMargin / totalBudget) * 100) : 0;
            const lines = [
              `📊 ${monthLabel} Finance Summary`,
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
              `Opening Balance : ${money(openingBalance)}`,
              `Cash In         : ${money(cashIn)}`,
              `Cash Out        : ${money(cashOut)}`,
              `Cash Profit     : ${money(cashProfit)}`,
              `Closing Balance : ${money(closingBalance)}`,
              ``,
              `Client Due      : ${money(totalClientDue)}`,
              `Worker Due      : ${money(totalWorkerDue)}`,
              ``,
              `Completed Projects (${bva.length})`,
              `  Budget  : ${money(totalBudget)}`,
              `  Costs   : ${money(totalCost)}`,
              `  Margin  : ${money(totalMargin)} (${marginPct}%)`,
              ``,
              bva.map((r: any) => `  • ${r.title}: collected ${money(r.clientPaid)}/${money(r.grossRevenue)} · cash margin ${money(r.cashMargin)} · full margin ${money(r.margin)} (${r.marginPct}%)`).join('\n'),
            ];
            navigator.clipboard.writeText(lines.join('\n'));
            fireToast('Summary copied to clipboard!');
          }}
        >
          <FileText size={14} /> Copy Summary
        </button>
      </div>
    </div>
  );
}
