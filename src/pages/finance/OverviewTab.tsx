import { Bell, Wallet, TrendingUp, CheckCircle2, Banknote } from 'lucide-react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import {
  ClientDueList, WorkerDueList, ProjectList, TransactionList, ActionCenter, LedgerPanel,
} from '../../components/finance/FinanceShared';
import type { FinanceTab } from '../MonthlyFinance';

export interface OverviewTabProps {
  actionItems: any[];
  currency: string;
  trendChartData: { name: string; cashIn: number; cashOut: number; profit: number }[];
  chartRange: 3 | 6 | 12;
  setChartRange: (r: 3 | 6 | 12) => void;
  clientDues: any[];
  setInvoiceTask: (task: any) => void;
  handleSendReminder: (task: any, daysOverdue: number) => void;
  studioName?: string;
  workerRegistry: Record<string, any>;
  expandedWorker: string | null;
  setExpandedWorker: (id: string | null) => void;
  setPayModal: (worker: any) => void;
  monthTransactions: any[];
  completedProjects: any[];
  cashForecast: { label: string; expectedIncome: number; expectedExpenses: number; netForecast: number }[];
  money: (n: number) => string;
  setActiveTab: (tab: FinanceTab) => void;
}

export function OverviewTab({
  actionItems, currency, trendChartData, chartRange, setChartRange,
  clientDues, setInvoiceTask, handleSendReminder, studioName,
  workerRegistry, expandedWorker, setExpandedWorker, setPayModal,
  monthTransactions, completedProjects, cashForecast, money, setActiveTab,
}: OverviewTabProps) {
  return (
    <>
      <ActionCenter items={actionItems} currency={currency} />

      {/* Revenue Trend Chart */}
      <section className="ledger-panel" style={{ marginBottom: 24 }}>
        <div className="ledger-panel-head">
          <div className="ledger-panel-title-wrap">
            <div className="ledger-panel-icon"><TrendingUp size={18} /></div>
            <div>
              <h2>Cash flow</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} /> in
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} /> out
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold, #f59e0b)' }} /> profit
            </div>
            <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 7, padding: 2, gap: 1, marginLeft: 4 }}>
              {([3, 6, 12] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  aria-label={`Show last ${r} months`}
                  aria-pressed={chartRange === r}
                  style={{
                    padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 800,
                    background: chartRange === r ? 'var(--card-bg)' : 'transparent',
                    color: chartRange === r ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: chartRange === r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >{r}M</button>
              ))}
            </div>
          </div>
        </div>
        <div className="ledger-panel-body">
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mfGradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mfGradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} dy={8} />
                <YAxis hide />
                <Tooltip
                  formatter={(val: any, name: any) => {
                    const n = Number(val || 0);
                    const labels: Record<string, string> = { cashIn: 'Cash In', cashOut: 'Cash Out', profit: 'Profit' };
                    return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, labels[name] || name];
                  }}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}
                />
                <Area type="monotone" dataKey="cashIn" stroke="var(--color-success)" strokeWidth={2.5} fillOpacity={1} fill="url(#mfGradIn)" />
                <Area type="monotone" dataKey="cashOut" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#mfGradOut)" />
                <Line type="monotone" dataKey="profit" stroke="var(--accent-gold, #f59e0b)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-gold, #f59e0b)', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="0" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="ledger-overview-grid">
        <LedgerPanel title="Need to Collect" icon={<Bell size={18} />} actionLabel="View all" onAction={() => setActiveTab('clients')}>
          <ClientDueList items={clientDues.slice(0, 5)} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={studioName} empty="No client dues right now." />
        </LedgerPanel>

        <LedgerPanel title="Need to Pay" icon={<Wallet size={18} />} actionLabel="View all" onAction={() => setActiveTab('workers')}>
          <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables right now." />
        </LedgerPanel>

        <LedgerPanel title="This Month Cash Activity" icon={<Banknote size={18} />} actionLabel="Transactions" onAction={() => setActiveTab('transactions')}>
          <TransactionList items={monthTransactions.slice(0, 6)} currency={currency} empty="No cash activity this month." />
        </LedgerPanel>

        <LedgerPanel title="Completed This Month" icon={<CheckCircle2 size={18} />} actionLabel="Report" onAction={() => setActiveTab('report')}>
          <ProjectList items={completedProjects.slice(0, 5)} currency={currency} onInvoice={setInvoiceTask} empty="No completed projects this month." />
        </LedgerPanel>

        <LedgerPanel title="Cash Flow Forecast" icon={<TrendingUp size={18} />} description="Next 3 months projection based on recurring bills + avg income.">
          <div className="ledger-list">
            {cashForecast.map((f) => (
              <div key={f.label} className="ledger-row" style={{ alignItems: 'center' }}>
                <div className="ledger-row-main">
                  <div className="ledger-row-title" style={{ fontWeight: 700 }}>{f.label}</div>
                  <div className="ledger-row-sub">Avg income {money(f.expectedIncome)} · Bills {money(f.expectedExpenses)}</div>
                </div>
                <div className="ledger-row-money">
                  <strong style={{ color: f.netForecast >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {f.netForecast >= 0 ? '+' : ''}{money(f.netForecast)}
                  </strong>
                  <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>projected net</span>
                </div>
              </div>
            ))}
          </div>
        </LedgerPanel>
      </div>
    </>
  );
}
