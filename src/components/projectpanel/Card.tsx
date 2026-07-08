import React from 'react';

export const Card = ({ children, title, icon, color }: { children: React.ReactNode, title?: string, icon?: React.ReactNode, color?: string }) => (
  <div style={{ flexShrink: 0, background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', opacity: 0.5 }} />

    {title && (
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
        {icon && (
          <div style={{ background: `${color}1A`, width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
            {icon}
          </div>
        )}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{title}</span>
      </div>
    )}
    <div style={{ padding: title ? '16px' : '0' }}>
      {children}
    </div>
  </div>
);
