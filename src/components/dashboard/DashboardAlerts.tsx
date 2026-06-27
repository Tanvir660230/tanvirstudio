import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardAlertsProps {
  isAdmin: boolean;
  isWorker: boolean;
  totalClientDues: number;
  totalWorkerLiability: number;
  workerDue: number;
  currency: string;
}

export function DashboardAlerts({
  isAdmin,
  isWorker,
  totalClientDues,
  totalWorkerLiability,
  workerDue,
  currency
}: DashboardAlertsProps) {
  const navigate = useNavigate();

  const alerts = [
    isAdmin && totalClientDues > 0 && {
      label: 'Clients owe you',
      value: `${currency}${totalClientDues.toLocaleString()}`,
      color: 'var(--color-danger)',
      bg: 'rgba(255,59,48,0.06)',
      border: 'rgba(255,59,48,0.18)',
      icon: <AlertCircle size={15} />,
      onClick: () => navigate('/finance', { state: { tab: 'clients' } }),
    },
    isAdmin && totalWorkerLiability > 0 && {
      label: 'Workers waiting on pay',
      value: `${currency}${totalWorkerLiability.toLocaleString()}`,
      color: 'var(--color-warning)',
      bg: 'rgba(255,149,0,0.06)',
      border: 'rgba(255,149,0,0.18)',
      icon: <Clock size={15} />,
      onClick: () => navigate('/finance', { state: { tab: 'workers' } }),
    },
    isWorker && workerDue > 0 && {
      label: 'Your payout ready',
      value: `${currency}${workerDue.toLocaleString()}`,
      color: 'var(--color-success)',
      bg: 'rgba(52,199,89,0.06)',
      border: 'rgba(52,199,89,0.18)',
      icon: <TrendingUp size={15} />,
      onClick: undefined,
    },
  ].filter(Boolean) as { label: string; value: string; color: string; bg: string; border: string; icon: React.ReactNode; onClick?: () => void }[];

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {alerts.map(a => (
        <div
          key={a.label}
          onClick={a.onClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 10,
            background: a.bg,
            border: `1px solid ${a.border}`,
            cursor: a.onClick ? 'pointer' : 'default',
          }}
        >
          <span style={{ color: a.color, flexShrink: 0, display: 'flex' }}>{a.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: a.color, flex: 1 }}>{a.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: a.color }}>{a.value}</span>
          {a.onClick && <ArrowRight size={14} color={a.color} style={{ flexShrink: 0, opacity: 0.7 }} />}
        </div>
      ))}
    </div>
  );
}
