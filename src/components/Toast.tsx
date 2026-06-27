import { Global, css } from '@emotion/react';

import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';



type ToastType = 'success' | 'error' | 'warning' | 'info';



const CONFIG: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {

  success: { icon: <CheckCircle2 size={18} />, color: 'var(--color-success)', bg: 'rgba(52,199,89,0.08)', border: 'rgba(52,199,89,0.2)' },

  error:   { icon: <AlertCircle   size={18} />, color: 'var(--color-danger)', bg: 'rgba(255,59,48,0.08)',  border: 'rgba(255,59,48,0.2)'  },

  warning: { icon: <AlertTriangle size={18} />, color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.08)', border: 'rgba(255,149,0,0.2)'  },

  info:    { icon: <Info          size={18} />, color: 'var(--color-info)', bg: 'rgba(0,122,255,0.08)', border: 'rgba(0,122,255,0.2)'  },

};



export function Toast({ message, type = 'success', onClose, onUndo }: { message: string; type?: ToastType; onClose: () => void; onUndo?: () => void }) {

  const cfg = CONFIG[type as ToastType] ?? CONFIG.success;

  const duration = onUndo ? 5000 : (type === 'error' ? 5000 : 3000);



  // Use a ref so the timer is never reset when the parent re-renders with a new inline onClose function

  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);



  useEffect(() => {

    const timer = setTimeout(() => onCloseRef.current(), duration);

    return () => clearTimeout(timer);

  }, [duration]); // only re-run if duration changes (i.e. a new toast type), NOT on every render



  return (

    <div style={{

      position: 'fixed',

      bottom: '32px',

      left: '50%',

      transform: 'translateX(-50%)',

      background: 'rgba(20, 20, 22, 0.75)',

      backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',

      border: `1px solid ${cfg.border}`,

      padding: '12px 16px',

      borderRadius: '16px',

      display: 'flex',

      alignItems: 'center',

      gap: '10px',

      boxShadow: '0 16px 32px rgba(0,0,0,0.4)',

      zIndex: 9000,

      

      minWidth: '280px',

      maxWidth: 'calc(100vw - 32px)',

      borderLeft: `4px solid ${cfg.color}`,

    }}>

      <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>

      <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', flex: 1, lineHeight: 1.5 }}>{message}</div>

      {onUndo && (

        <button onClick={onUndo} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>

          Undo

        </button>

      )}

      <button onClick={onClose} style={{ marginLeft: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0, padding: 2 }}>

        <X size={15} />

      </button>

      <Global styles={css`

        @keyframes toastSlideUp {

          from { transform: translate(-50%, 16px); opacity: 0; }

          to   { transform: translate(-50%, 0);    opacity: 1; }

        }

      `} />

    </div>

  );

}

