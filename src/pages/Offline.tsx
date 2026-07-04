import { WifiOff, RefreshCw } from 'lucide-react';

const font = "var(--font-sans)";

export function Offline() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', fontFamily: font, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(217,173,98,0.1)', border: '1px solid rgba(217,173,98,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <WifiOff size={30} color="var(--accent-gold-light)" strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 12px' }}>
          You're offline
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-tertiary)', lineHeight: 1.7, margin: '0 0 32px' }}>
          No internet connection. Check your network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 100, background: 'linear-gradient(135deg,#d9ad62,#a87428)', color: 'var(--text-primary)', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font }}
        >
          <RefreshCw size={14} strokeWidth={2.5} /> Try Again
        </button>
      </div>
    </div>
  );
}
