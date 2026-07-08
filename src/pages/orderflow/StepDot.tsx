import { Check } from 'lucide-react';

import type { TColors } from './theme';

export function StepDot({ n, label, active, done, T }: { n: number; label: string; active: boolean; done?: boolean; T: TColors }) {
  const bg = done ? T.green : active ? T.accent : 'transparent';
  const border = done ? T.green : active ? T.accent : T.divider;
  const textColor = (done || active) ? 'var(--bg-color)' : T.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, border: `1.5px solid ${border}`, color: textColor, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {done ? <Check size={11} strokeWidth={3} /> : n}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: (active || done) ? T.text : T.muted }}>{label}</span>
    </div>
  );
}
