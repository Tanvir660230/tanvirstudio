import { Global, css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const WA_ICON = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.117 1.532 5.843L0 24l6.305-1.654A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.869 0-3.607-.5-5.112-1.372l-.366-.218-3.743.981.999-3.648-.238-.376A9.956 9.956 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
  </svg>
);

export function FloatingChat() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const phone = settings?.studioPhone;
  if (!phone) return null;

  const waNumber = phone.replace(/[^0-9]/g, '');
  if (!waNumber) return null;

  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hello! I'd like to inquire about Tanvir Studio's services.")}`;

  return (
    <>
      <Global styles={css`
        .wa-floating-btn {
          bottom: 28px;
          right: 28px;
        }
        @media (max-width: 768px) {
          .wa-floating-btn {
            bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            right: 16px;
          }
        }
      `} />
      <a
        className="wa-floating-btn"
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'whatsapp_click', { event_category: 'engagement', event_label: 'floating_chat' });
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          touchAction: 'manipulation',
          position: 'fixed',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#25d366',
          color: '#fff',
          borderRadius: 100,
          padding: hovered ? '13px 20px 13px 16px' : '13px',
          boxShadow: 'none',
          textDecoration: 'none',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
          fontSize: 14,
          fontWeight: 700,
          transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
          transform: visible ? (hovered ? 'translateY(-3px) scale(1.04)' : 'translateY(0) scale(1)') : 'translateY(80px) scale(0.8)',
          opacity: visible ? 1 : 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          maxWidth: hovered ? 220 : 52,
        }}
      >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <WA_ICON />
      </span>
      <span style={{
        overflow: 'hidden',
        maxWidth: hovered ? 160 : 0,
        opacity: hovered ? 1 : 0,
        transition: 'max-width 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s',
      }}>
        Chat with us
      </span>
    </a>
    </>
  );
}
