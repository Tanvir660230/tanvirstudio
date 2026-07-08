import type { CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportMini } from '../../components/finance/FinanceShared';

export interface YearSummaryRow {
  month: string; fullMonth: string; cashIn: number; cashOut: number; profit: number; mIndex: number;
}

export interface YearTabProps {
  selectedYear: number;
  setSelectedYear: (updater: (y: number) => number) => void;
  isMobile: boolean;
  yearSummaryData: YearSummaryRow[];
  money: (n: number) => string;
  currency: string;
  now: Date;
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  setActiveTab: (tab: 'overview') => void;
  invoiceTaxRate: number;
  fireToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function YearTab({
  selectedYear, setSelectedYear, isMobile, yearSummaryData, money, currency, now,
  selectedMonth, setSelectedMonth, setActiveTab, invoiceTaxRate, fireToast,
}: YearTabProps) {
  return (
    <div>
      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{selectedYear} Annual Overview</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ledger-action neutral" style={{ padding: '8px 14px' }} onClick={() => setSelectedYear(y => y - 1)}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 50, textAlign: 'center' }}>{selectedYear}</span>
          <button className="ledger-action neutral" style={{ padding: '8px 14px' }} onClick={() => setSelectedYear(y => y + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Year KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Cash In', value: money(yearSummaryData.reduce((s, r) => s + r.cashIn, 0)), color: 'var(--color-success)' },
          { label: 'Total Cash Out', value: money(yearSummaryData.reduce((s, r) => s + r.cashOut, 0)), color: 'var(--color-danger)' },
          { label: 'Net Profit', value: money(yearSummaryData.reduce((s, r) => s + r.profit, 0)), color: yearSummaryData.reduce((s, r) => s + r.profit, 0) >= 0 ? 'var(--color-info)' : 'var(--color-danger)' },
          { label: 'Best Month', value: (() => { const active = yearSummaryData.filter(r => r.cashIn > 0 || r.cashOut > 0); if (!active.length) return '—'; const best = active.reduce((b, r) => r.profit > b.profit ? r : b, active[0]); return best.month; })(), color: 'var(--accent-purple)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, letterSpacing: '-0.4px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 12-month bar chart */}
      <section className="ledger-panel" style={{ marginBottom: 24 }}>
        <div className="ledger-panel-head">
          <div className="ledger-panel-title-wrap">
            <div className="ledger-panel-icon"><TrendingUp size={18} /></div>
            <div><h2>{selectedYear} Cash Flow</h2><p>Monthly cash in vs cash out</p></div>
          </div>
        </div>
        <div className="ledger-panel-body">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearSummaryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="yrGradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="yrGradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} dy={8} />
                <YAxis hide />
                <Tooltip
                  formatter={(val: any, name: any) => { const n = Number(val || 0); return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, name === 'cashIn' ? 'Cash In' : 'Cash Out']; }}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}
                />
                <Area type="monotone" dataKey="cashIn" stroke="var(--color-success)" strokeWidth={2.5} fillOpacity={1} fill="url(#yrGradIn)" />
                <Area type="monotone" dataKey="cashOut" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#yrGradOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 12-month table grid */}
      <section className="ledger-panel">
        <div className="ledger-panel-head">
          <div className="ledger-panel-title-wrap">
            <div className="ledger-panel-icon"><FileText size={18} /></div>
            <div><h2>Month-by-Month Breakdown</h2><p>Click a month to view details</p></div>
          </div>
        </div>
        <div className="ledger-panel-body" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as CSSProperties}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 360 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
                {['Month', 'Cash In', 'Cash Out', 'Profit', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Month' ? 'left' : 'right', fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            {(() => {
                const activeMonths = yearSummaryData.filter(r => r.cashIn > 0 || r.cashOut > 0);
                const bestIdx  = activeMonths.length > 0 ? activeMonths.reduce((b, r) => r.profit > b.profit ? r : b, activeMonths[0]).mIndex : -1;
                const worstIdx = activeMonths.length > 0 ? activeMonths.reduce((w, r) => r.profit < w.profit ? r : w, activeMonths[0]).mIndex : -1;
                const maxIn = Math.max(...yearSummaryData.map(r => r.cashIn), 1);
                return (
            <>
            <tbody>
              {yearSummaryData.map((row) => {
                const isCurrentMonth = row.mIndex === now.getMonth() && selectedYear === now.getFullYear();
                const isSelected = row.mIndex === selectedMonth;
                const isBest  = row.mIndex === bestIdx  && row.cashIn > 0;
                const isWorst = row.mIndex === worstIdx && row.profit < 0;
                const rowBg = isSelected ? 'rgba(0,122,255,0.06)' : isBest ? 'rgba(52,199,89,0.06)' : isWorst ? 'rgba(255,59,48,0.05)' : 'transparent';
                return (
                  <tr
                    key={row.month}
                    onClick={() => { setSelectedMonth(row.mIndex); setActiveTab('overview'); }}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: rowBg, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,122,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: isCurrentMonth ? 'var(--color-info)' : 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {row.fullMonth}
                        {isCurrentMonth && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-info)', background: 'rgba(0,122,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>NOW</span>}
                        {isBest  && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(52,199,89,0.12)', padding: '1px 6px', borderRadius: 4 }}>BEST</span>}
                        {isWorst && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-danger)',  background: 'rgba(255,59,48,0.1)',  padding: '1px 6px', borderRadius: 4 }}>LOSS</span>}
                      </div>
                      {row.cashIn > 0 && (
                        <div style={{ marginTop: 4, height: 3, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden', width: 80 }}>
                          <div style={{ height: '100%', width: `${Math.round((row.cashIn / maxIn) * 100)}%`, background: 'var(--color-info)', borderRadius: 2 }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: row.cashIn > 0 ? 'var(--color-success)' : 'var(--text-tertiary)' }}>{row.cashIn > 0 ? money(row.cashIn) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: row.cashOut > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>{row.cashOut > 0 ? money(row.cashOut) : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: row.profit > 0 ? 'var(--color-success)' : row.profit < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>
                      {row.cashIn > 0 || row.cashOut > 0 ? money(row.profit) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isCurrentMonth
                          ? <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-info)', background: 'rgba(0,122,255,0.1)', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(0,122,255,0.2)' }}>Live</span>
                          : <span style={{ fontSize: 10, fontWeight: 500, color: '#8E8E93', background: 'rgba(142,142,147,0.1)', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(142,142,147,0.2)' }}>Done</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-color)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>Year Total</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(yearSummaryData.reduce((s, r) => s + r.cashIn, 0))}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>{money(yearSummaryData.reduce((s, r) => s + r.cashOut, 0))}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: yearSummaryData.reduce((s, r) => s + r.profit, 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{money(yearSummaryData.reduce((s, r) => s + r.profit, 0))}</td>
                <td />
              </tr>
            </tfoot>
            </>
                );})()}
          </table>
        </div>
      </section>

      {/* Tax Summary */}
      {(() => {
        const totalIn = yearSummaryData.reduce((s, r) => s + r.cashIn, 0);
        const totalOut = yearSummaryData.reduce((s, r) => s + r.cashOut, 0);
        const netProfit = totalIn - totalOut;
        const taxRate = Number(invoiceTaxRate) || 0;
        const estimatedTax = taxRate > 0 ? Math.round(netProfit * (taxRate / 100)) : 0;
        const profitMargin = totalIn > 0 ? Math.round((netProfit / totalIn) * 100) : 0;
        return (
          <section className="ledger-panel" style={{ marginTop: 16 }}>
            <div className="ledger-panel-head">
              <div className="ledger-panel-title-wrap">
                <div className="ledger-panel-icon"><FileText size={18} /></div>
                <div><h2>{selectedYear} Tax Summary</h2><p>Annual P&amp;L and estimated tax liability</p></div>
              </div>
            </div>
            <div className="ledger-panel-body">
              <div className="ledger-report-strip">
                <ReportMini label="Gross Income" value={money(totalIn)} tone="green" />
                <ReportMini label="Total Expenses" value={money(totalOut)} tone="red" />
                <ReportMini label="Net Profit" value={money(netProfit)} tone={netProfit >= 0 ? 'blue' : 'red'} />
                <ReportMini label="Profit Margin" value={`${profitMargin}%`} tone={profitMargin >= 30 ? 'green' : profitMargin >= 10 ? 'orange' : 'red'} />
                {taxRate > 0 && <ReportMini label={`Tax Est. (${taxRate}%)`} value={money(estimatedTax)} tone="red" />}
                {taxRate > 0 && <ReportMini label="After-Tax Profit" value={money(netProfit - estimatedTax)} tone="blue" />}
              </div>
              {taxRate === 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Set a tax rate in Settings → Invoice to see estimated tax liability.
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="ledger-action neutral" onClick={() => {
                  const lines = [
                    `${selectedYear} Annual Tax Summary`,
                    `Gross Income  : ${money(totalIn)}`,
                    `Total Expenses: ${money(totalOut)}`,
                    `Net Profit    : ${money(netProfit)}`,
                    `Profit Margin : ${profitMargin}%`,
                    taxRate > 0 ? `Tax Est (${taxRate}%): ${money(estimatedTax)}` : '',
                    taxRate > 0 ? `After-Tax Profit: ${money(netProfit - estimatedTax)}` : '',
                  ].filter(Boolean).join('\n');
                  navigator.clipboard.writeText(lines);
                  fireToast('Tax summary copied!');
                }}>
                  <FileText size={14} /> Copy Tax Summary
                </button>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
