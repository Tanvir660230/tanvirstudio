import { Global, css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <>
      <Global styles={css`
        @keyframes fadeInUp { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
        .stt-btn { position:fixed;bottom:90px;right:28px;z-index:8500;width:42px;height:42px;border-radius:50%;background:rgba(20,20,20,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(217,173,98,0.3);color:#d9ad62;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.25);transition:transform 0.2s,opacity 0.2s;animation:fadeInUp 0.25s ease both; }
        .stt-btn:hover,.stt-btn:active { transform:translateY(-2px) scale(1.08); }
        @media(max-width:768px){ .stt-btn { bottom:calc(82px + env(safe-area-inset-bottom,0px));right:16px; } }
      `} />
      <button
        className="stt-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <ChevronUp size={18} strokeWidth={2.5} />
      </button>
    </>
  );
}
