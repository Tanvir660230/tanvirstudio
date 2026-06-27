import React from 'react';
import { LayoutGrid, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface WorkflowStatsProps {
  rawTasks: any[];
  currency: string;
  isAdmin?: boolean;
}

export function WorkflowStats({ rawTasks, currency, isAdmin = false }: WorkflowStatsProps) {
  const totalProjects = rawTasks.length;
  const totalRevenue = rawTasks.reduce((s: number, t: any) => s + (Number(t.budget) || 0), 0);
  const totalCollected = rawTasks.reduce((s: number, t: any) => s + (t.payments || []).reduce((ps: number, p: any) => ps + (Number(p.amount) || 0), 0), 0);
  const totalPending = totalRevenue - totalCollected;
  const ACTIVE_STAGES = ['recording', 'arrangement', 'humming', 'composition', 'revision'];
  const overdueCount = rawTasks.filter((t: any) =>
    t.deliveryDate &&
    new Date(t.deliveryDate) < new Date() &&
    ACTIVE_STAGES.includes(t.status)
  ).length;

  const cur = currency || '৳';
  const stats = [
    { label: 'Projects', value: totalProjects, icon: <LayoutGrid size={17} />, color: 'var(--color-info)' },
    ...(isAdmin ? [
      { label: 'Revenue', value: `${cur}${totalRevenue.toLocaleString()}`, icon: <DollarSign size={17} />, color: 'var(--accent-purple)' },
      { label: 'Collected', value: `${cur}${totalCollected.toLocaleString()}`, icon: <CheckCircle2 size={17} />, color: 'var(--color-success)' },
      { label: 'Pending', value: `${cur}${totalPending.toLocaleString()}`, icon: <Clock size={17} />, color: 'var(--color-warning)' },
    ] : []),
    { label: 'Overdue', value: overdueCount, icon: <AlertCircle size={17} />, color: overdueCount > 0 ? 'var(--color-danger)' : '#8E8E93' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
      gap: '16px', marginBottom: '32px',
    }}>
      {stats.map((stat, i) => (
        <div key={i} style={{
          background: 'var(--card-bg)',
          padding: '14px 16px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.02)',
          display: 'flex', alignItems: 'center', gap: '10px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', opacity: 0.5 }} />
          {/* Colored Icon Block */}
          <div style={{
            width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
            background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}05)`,
            border: `1px solid ${stat.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: stat.color,
            boxShadow: 'none'
          }}>
            {stat.icon}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)',
              marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: 1,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
