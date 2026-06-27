/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

interface KPICardsProps {
  isWorker: boolean;
  isAdmin: boolean;
  isClient?: boolean;
  activeProjects: number;
  avgProgress: number;
  workerEarned: number;
  workerAvailable?: number;
  workerPendingClient?: number;
  workerPaid: number;
  clientPaid?: number;
  clientDue?: number;
  currentBalance: number;
  totalIncome: number;
  currency: string;
  clientsCount: number;
}

export function KPICards({
  isWorker, isAdmin, isClient = false,
  activeProjects, avgProgress,
  workerEarned, workerAvailable = 0, workerPendingClient = 0, workerPaid,
  clientPaid = 0, clientDue = 0,
  currentBalance, totalIncome, currency, clientsCount,
}: KPICardsProps) {
  const items = isWorker
    ? [
        { label: 'Active projects', value: String(activeProjects), sub: `${avgProgress}% avg progress`, progress: avgProgress, accent: 'var(--accent-gold)' },
        { label: 'Total earned', value: `${currency}${workerEarned.toLocaleString()}`, sub: `${currency}${workerAvailable.toLocaleString()} withdrawable${workerPendingClient > 0 ? ` · ${currency}${workerPendingClient.toLocaleString()} pending` : ''}`, accent: '#10b981' },
        { label: 'Total paid out', value: `${currency}${workerPaid.toLocaleString()}`, accent: 'var(--accent-gold)' },
      ]
    : isClient
    ? [
        { label: 'Active projects', value: String(activeProjects), sub: `${avgProgress}% avg progress`, progress: avgProgress, accent: 'var(--accent-gold)' },
        { label: 'Total spent', value: `${currency}${clientPaid.toLocaleString()}`, accent: '#10b981' },
        { label: 'Pending due', value: `${currency}${clientDue.toLocaleString()}`, sub: clientDue > 0 ? 'Balance remaining' : 'All clear', accent: clientDue > 0 ? '#ef4444' : 'var(--accent-gold)' },
      ]
    : [
        { label: 'Active projects', value: String(activeProjects), sub: `${avgProgress}% avg progress`, progress: avgProgress, accent: 'var(--accent-gold)' },
        { label: 'Cash balance', value: `${currency}${currentBalance.toLocaleString()}`, sub: 'All time', accent: '#10b981' },
        { label: 'This month income', value: `${currency}${totalIncome.toLocaleString()}`, sub: `${clientsCount} active client${clientsCount !== 1 ? 's' : ''}`, accent: 'var(--accent-gold)' },
      ];

  return (
    <div className="kpi-grid" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
      {items.map((item, i) => (
        <div
          key={i}
          className="card kpi-card"
          style={{ padding: '20px 22px', overflow: 'hidden', position: 'relative', borderTop: `2px solid ${item.accent}` }}
        >
          {/* Accent glow */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 60,
            background: `linear-gradient(180deg, ${item.accent}10 0%, transparent 100%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, opacity: 0.8 }}>
            {item.label}
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800,
            color: /^[৳$€£¥₹]?0$/.test(item.value.replace(/,/g, '')) ? 'var(--text-tertiary)' : 'var(--text-primary)',
            letterSpacing: '-0.6px', lineHeight: 1,
            marginBottom: item.progress !== undefined ? 10 : item.sub ? 6 : 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {item.value}
          </div>
          {item.progress !== undefined && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ height: 3, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${item.progress}%`,
                  background: `linear-gradient(90deg, ${item.accent}, ${item.accent}aa)`,
                  borderRadius: 999,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          )}
          {item.sub && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.4 }}>
              {item.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
