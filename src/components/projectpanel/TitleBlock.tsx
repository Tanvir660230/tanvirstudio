import React from 'react';
import { User, MessageSquare } from 'lucide-react';

interface TitleBlockProps {
  task: any;
  buildWaMessage: () => string;
}

export function TitleBlock({ task, buildWaMessage }: TitleBlockProps) {
  return (
    <div style={{ padding: '28px 28px 0', flexShrink: 0, marginBottom: 24 }}>
      <h2
        onClick={() => navigator.clipboard.writeText(task.title || 'Untitled Project')}
        title="Click to copy project name"
        style={{
          fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)',
          margin: '0 0 14px', letterSpacing: '-0.8px', lineHeight: 1.2,
          cursor: 'pointer', transition: 'color 0.2s',
          display: 'inline-block'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-info)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
      >
        {task.title || 'Untitled Project'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--card-bg)', padding: '14px', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '800' }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={13} color="var(--text-secondary)" />
          </div>
          <span>{task.client || 'No client assigned'}</span>
          {task.clientEmail && (
            <>
              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
              <a href={`mailto:${task.clientEmail}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: '700' }} onMouseOver={e=>e.currentTarget.style.color='var(--color-info)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}>{task.clientEmail}</a>
            </>
          )}
        </div>
        {task.clientPhone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 34 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>{task.clientPhone}</span>
            <a href={`https://wa.me/${(() => {
              const raw = task.clientPhone.trim();
              const d = raw.replace(/\D/g, '');
              // Already has country code (10+ digits not starting with 0)
              if (d.length >= 10 && !d.startsWith('0')) return d;
              // BD local format: 01XXXXXXXX → 8801XXXXXXXX
              if (d.startsWith('0') && d.length === 11) return '880' + d.slice(1);
              // Already starts with 880
              if (d.startsWith('880')) return d;
              return d;
            })()}?text=${encodeURIComponent(buildWaMessage())}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, background: '#25D36615', color: '#25D366', padding: '4px 10px', borderRadius: 12, textDecoration: 'none', fontWeight: 800, textTransform: 'uppercase', boxShadow: 'none' }}>
              <MessageSquare size={12} /> WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
