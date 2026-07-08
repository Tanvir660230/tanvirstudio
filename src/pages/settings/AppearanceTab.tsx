import type { Dispatch, SetStateAction } from 'react';

interface AppearanceTabProps {
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  accentColor: string;
  setAccentColor: Dispatch<SetStateAction<string>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export function AppearanceTab({ theme, setTheme, accentColor, setAccentColor, setIsDirty }: AppearanceTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Theme</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[{ id: 'light', emoji: '☀️', label: 'Light Mode' }, { id: 'dark', emoji: '🌙', label: 'Dark Mode' }].map(t => (
            <button key={t.id} onClick={() => { setTheme(t.id); setIsDirty(true); }}
              style={{ flex: 1, padding: '16px', borderRadius: 8, border: `1px solid ${theme === t.id ? 'var(--color-info)' : 'var(--border-color)'}`,
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: theme === t.id ? 'rgba(0,122,255,0.06)' : 'var(--surface-1)',
                color: theme === t.id ? 'var(--color-info)' : 'var(--text-primary)',
                transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 10, paddingLeft: 4 }}>Accent color</div>
        <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '16px', border: '1px solid var(--border-color)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ color: 'var(--color-info)', name: 'Blue' }, { color: 'var(--color-success)', name: 'Green' }, { color: 'var(--color-danger)', name: 'Red' }, { color: 'var(--color-warning)', name: 'Orange' }, { color: 'var(--accent-purple)', name: 'Purple' }].map(t => (
            <button key={t.name} onClick={() => { setAccentColor(t.color); setIsDirty(true); }} title={t.name}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: t.color, border: accentColor === t.color ? '4px solid var(--text-primary)' : '4px solid transparent', boxShadow: accentColor === t.color ? `0 0 0 2px ${t.color}40, 0 8px 24px ${t.color}60` : `0 4px 12px ${t.color}40`, transition: 'all 0.2s ease-out', transform: accentColor === t.color ? 'scale(1.1)' : 'scale(1)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: accentColor === t.color ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
