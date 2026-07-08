import React from 'react';
import { CheckCircle2, Check } from 'lucide-react';
import { Card } from './Card';

interface MilestonesSectionProps {
  ms: any[];
  msDone: number;
  isAdmin: boolean;
  handleToggleMilestone: (index: number) => void;
}

export function MilestonesSection({ ms, msDone, isAdmin, handleToggleMilestone }: MilestonesSectionProps) {
  return (
    <Card title={`Milestones (${msDone}/${ms.length})`} icon={<CheckCircle2 size={15} color="var(--color-info)" />} color="var(--color-info)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ms.map((m: any, i: number) => (
          <button
            key={i}
            onClick={() => isAdmin && handleToggleMilestone(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: m.completed ? 'linear-gradient(135deg, rgba(52,199,89,0.08), rgba(52,199,89,0.02))' : 'var(--bg-color)', border: `1px solid ${m.completed ? 'rgba(52,199,89,0.25)' : 'var(--border-color)'}`, transition: 'all 0.2s', cursor: isAdmin ? 'pointer' : 'default', width: '100%', textAlign: 'left' }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: m.completed ? 'linear-gradient(135deg, #34C759, #28A745)' : 'transparent', border: `2px solid ${m.completed ? 'transparent' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: m.completed ? '0 2px 8px rgba(52,199,89,0.3)' : 'none' }}>
              {m.completed && <Check size={12} color="white" strokeWidth={4} />}
            </div>
            <span style={{ fontSize: 13, fontWeight: m.completed ? 600 : 800, color: m.completed ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: m.completed ? 'line-through' : 'none', flex: 1, letterSpacing: '-0.1px' }}>{m.text || m.title || m.name}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
