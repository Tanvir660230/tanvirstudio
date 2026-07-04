import { Global, css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const STORAGE_KEY = 'ts_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Block GA tracking until user consents
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
        });
      }
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    } else if (stored === 'accepted') {
      // Already consented — re-enable GA
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
        });
      }
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
    // Enable GA if consent given
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
      });
    }
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9000, width: 'min(540px, calc(100vw - 32px))',
        background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, padding: '20px 22px',
        boxShadow: 'none',
        display: 'flex', gap: 16, alignItems: 'flex-start',
        animation: 'slideUpIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      <Global styles={css`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateX(-50%) translateY(24px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `} />

      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
          We use cookies
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          We use analytics cookies to improve our website. No personal data is sold or shared.{' '}
          <Link to="/privacy" style={{ color: 'var(--accent-gold-light)', textDecoration: 'none' }}>Learn more</Link>.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={accept}
            style={{
              padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #d9ad62, #a87428)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            Accept
          </button>
          <button
            onClick={decline}
            style={{
              padding: '8px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer', background: 'transparent',
              color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Decline
          </button>
        </div>
      </div>

      <button
        onClick={decline}
        aria-label="Dismiss cookie notice"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
          padding: 4, flexShrink: 0, marginTop: 2,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
