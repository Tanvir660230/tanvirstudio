import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  income?: number;
  expense?: number;
  tasks?: number;
  spent?: number;
}

interface MonthlyChartProps {
  isWorker: boolean;
  isClient?: boolean;
  data: ChartDataPoint[];
}

export function MonthlyChart({ isWorker, isClient = false, data }: MonthlyChartProps) {
  const hasData = data && data.length > 0;
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Last 6 months</h3>
        {(!isWorker && !isClient) && (
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold)' }} /> In
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} /> Out
            </div>
          </div>
        )}
      </div>
      {hasData ? (
        <div style={{ width: '100%', height: 240, minHeight: 240 }}>
          <ResponsiveContainer width="99%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 400 }} dy={8} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'none', padding: '10px 14px', fontWeight: 600, fontSize: 13, background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                cursor={{ stroke: 'rgba(196,154,82,0.2)', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey={isClient ? 'spent' : 'income'} stroke="var(--accent-gold)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" dot={false} activeDot={{ r: 4, fill: 'var(--accent-gold)', strokeWidth: 0 }} />
              {(!isWorker && !isClient) && <Area type="monotone" dataKey="expense" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" dot={false} activeDot={{ r: 4, fill: 'var(--color-danger)', strokeWidth: 0 }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          No data yet
        </div>
      )}
    </div>
  );
}
