import { Global, css } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'G', description: 'Go to Dashboard' },
  { key: 'W', description: 'Go to Work / Projects' },
  { key: 'F', description: 'Go to Finance' },
  { key: 'N', description: 'Go to New Orders' },
  { key: 'C', description: 'Go to Clients' },
  { key: 'Ctrl+K', description: 'Global search' },
  { key: '/', description: 'Quick search' },
  { key: 'Ctrl+B', description: 'Open Booking page' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close modals / panels' },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === '?') setOpen(v => !v);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus the close button when modal opens
  useEffect(() => {
    if (open) setTimeout(() => closeBtnRef.current?.focus(), 50);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" style={{
        background: 'var(--panel-bg, #141414)', border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: 20, padding: '32px 32px 28px', minWidth: 360, maxWidth: 440, width: '100%',
        position: 'relative',
        animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <Global styles={css`@keyframes scaleIn { from { opacity:0;transform:scale(0.92) } to { opacity:1;transform:scale(1) } }`} />

        <button ref={closeBtnRef} onClick={() => setOpen(false)} style={{
          position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.07)',
          border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
        }}><X size={14} /></button>

        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Keyboard Shortcuts
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>{description}</span>
              <kbd style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-primary)', letterSpacing: '0.05em',
              }}>{key}</kbd>
            </div>
          ))}
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 12, color: 'var(--text-tertiary, #555)', textAlign: 'center' }}>
          Press <kbd style={{ padding: '1px 6px', borderRadius: 4, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>?</kbd> to toggle this panel
        </p>
      </div>
    </div>
  );
}
