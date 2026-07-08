import React from 'react';
import { Clock } from 'lucide-react';

interface TimelineSectionProps {
  task: any;
  deadline: { line1: string; line2: string | null; color: string; urgent: boolean; icon: React.ReactNode };
}

export function TimelineSection({ task, deadline }: TimelineSectionProps) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: deadline.urgent ? 'linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,59,48,0.02))' : 'var(--card-bg)', borderRadius: 16, border: `1px solid ${deadline.urgent ? 'rgba(255,59,48,0.2)' : 'var(--border-color)'}`, boxShadow: deadline.urgent ? '0 8px 24px rgba(255,59,48,0.1)' : '0 8px 30px rgba(0,0,0,0.04)', minWidth: 0 }}>
        <div style={{ background: deadline.urgent ? 'linear-gradient(135deg, #FF3B30, #FF6B22)' : 'var(--bg-color)', border: deadline.urgent ? 'none' : '1px solid var(--border-color)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deadline.urgent ? 'white' : 'var(--text-secondary)', flexShrink: 0, boxShadow: deadline.urgent ? '0 4px 12px rgba(255,59,48,0.3)' : 'none' }}>
          {deadline.icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: deadline.color, marginBottom: 2, letterSpacing: '0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deadline.line1}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deadline.line2 || 'Not scheduled'}</div>
        </div>
      </div>
      {task.recordingDate && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'none', minWidth: 0 }}>
          <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <Clock size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rec Session</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {(() => {
                try {
                  const d = new Date(task.recordingDate);
                  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const hasTime = typeof task.recordingDate === 'string' && task.recordingDate.includes('T');
                  return hasTime ? `${dateStr} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : dateStr;
                } catch { return 'Invalid date'; }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
