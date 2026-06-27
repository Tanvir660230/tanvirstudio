import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types';

interface PriorityTasksProps {
  tasks: Task[];
}

function urgencyChip(deliveryDate?: string): { label: string; color: string; bg: string } {
  if (!deliveryDate) return { label: 'No date', color: 'var(--text-tertiary)', bg: 'var(--surface-1)' };
  const now = new Date();
  const due = new Date(deliveryDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays < 0)  return { label: 'OVERDUE',          color: 'var(--color-danger)', bg: 'rgba(255,59,48,0.1)' };
  if (diffDays === 0) return { label: 'TODAY',            color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)' };
  if (diffDays === 1) return { label: '1d',               color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.08)' };
  if (diffDays <= 3)  return { label: `${diffDays}d`,     color: 'var(--accent-gold)', bg: 'rgba(196,154,82,0.1)' };
  return               { label: `${diffDays}d`,           color: 'var(--text-tertiary)', bg: 'var(--surface-1)' };
}

export function PriorityTasks({ tasks }: PriorityTasksProps) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Upcoming</h3>
        <button onClick={() => navigate('/work')} className="btn" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontWeight: 500 }}>See all</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.length > 0 ? tasks.map(t => {
          const chip = urgencyChip(t.deliveryDate);
          const progress = Number(t.progress) || 0;
          const isUrgent = chip.label === 'OVERDUE' || chip.label === 'TODAY' || chip.label === '1d';
          return (
            <div
              key={t.id}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${isUrgent ? chip.bg.replace('0.1', '0.25').replace('0.08', '0.2') : 'var(--border-color)'}`,
                background: isUrgent ? chip.bg.replace('0.1', '0.04').replace('0.08', '0.04') : 'var(--bg-color)',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/work')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: progress > 0 ? 8 : 0 }}>
                <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ textTransform: 'capitalize' }}>{t.status || 'active'}</span>
                    {t.client && <><span>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{t.client}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: chip.color, background: chip.bg, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.02em' }}>
                    {chip.label}
                  </span>
                  <ChevronRight size={14} color="var(--text-tertiary)" />
                </div>
              </div>
              {progress > 0 && (
                <div style={{ height: 3, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: progress >= 80 ? 'var(--color-success)' : progress >= 40 ? 'var(--accent-gold)' : 'var(--accent-blue)',
                    borderRadius: 999,
                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Nothing due
          </div>
        )}
      </div>
    </div>
  );
}
