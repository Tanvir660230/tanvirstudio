import React from 'react';
import { X } from 'lucide-react';

interface PanelHeaderProps {
  stage: { label: string; color: string };
  onClose: () => void;
}

export function PanelHeader({ stage, onClose }: PanelHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 28px', background: 'var(--card-bg)',
      borderBottom: '1px solid var(--border-color)', flexShrink: 0,
      position: 'relative', zIndex: 10,
      boxShadow: 'none'
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '11px', fontWeight: '800',
        color: stage.color, background: `${stage.color}15`,
        padding: '6px 12px', borderRadius: '10px',
        letterSpacing: '0.6px', textTransform: 'uppercase',
        boxShadow: 'none'
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, boxShadow: 'none' }} />
        {stage.label}
      </span>

      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: 'var(--bg-color)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
