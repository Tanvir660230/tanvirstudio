export const T = {
  bg: 'var(--bg-color)', panel: 'var(--surface-1)', card: 'var(--card-bg)',
  border: 'var(--border-color)', borderFocus: 'var(--accent-gold)',
  text: 'var(--text-primary)', muted: 'var(--text-secondary)', mutedSoft: 'var(--text-tertiary)',
  accent: 'var(--accent-gold)', accentGrad: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%)',
  accentBg: 'var(--accent-gold-glow)', accentBorder: 'rgba(196,154,82,0.2)',
  green: 'var(--color-success)', greenBg: 'rgba(16, 185, 129, 0.1)', greenBorder: 'rgba(16, 185, 129, 0.22)',
  errBg: 'rgba(239, 68, 68, 0.08)', errBorder: 'rgba(239, 68, 68, 0.2)',
  divider: 'var(--border-color)', surface: 'var(--surface-2)',
  pkgActive: 'var(--accent-gold-glow)', pkgActiveBorder: 'rgba(196,154,82,0.45)',
};

export const font = "var(--font-sans)";

export type TColors = typeof T;
