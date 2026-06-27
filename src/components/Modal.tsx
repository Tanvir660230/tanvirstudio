import { Global, css } from '@emotion/react';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noPadding?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', noPadding }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const maxWidth = size === 'xl' ? '1300px' : size === 'lg' ? '820px' : size === 'sm' ? '440px' : '560px';

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay-wrap" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: size === 'xl' ? '16px' : '20px',
          }} 
          onClick={onClose}
        >
          <motion.div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              width: '100%',
              height: size === 'xl' ? '95vh' : undefined,
              maxHeight: size === 'xl' ? '95vh' : '90vh',
              display: 'flex',
              flexDirection: 'column',
              maxWidth,
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--glass-border)',
              position: 'relative',
              overflow: 'hidden',
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Header — hidden when noPadding + empty title (custom header inside body) */}
            {!(noPadding && !title) && (
              <div style={{
                padding: size === 'xl' ? '20px 24px' : '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'transparent',
                flexShrink: 0,
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
                <button onClick={onClose} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  transition: 'background 0.12s, color 0.12s',
                }}
                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: noPadding ? 0 : '20px 24px' }} className="custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <Global styles={css`
      @keyframes modalSlideUpMobile {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      .form-group { margin-bottom: 16px; }
      .form-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 6px;
        letter-spacing: 0;
      }
      .form-input, .form-select {
        width: 100%;
        padding: 9px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        background: var(--input-bg);
        color: var(--text-primary);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.12s, box-shadow 0.12s;
        outline: none;
        appearance: none;
      }
      .form-input:focus, .form-select:focus {
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
      }
      @media (max-width: 768px) {
        .modal-overlay-wrap { align-items: flex-end !important; padding: 0 !important; }
        .modal-sheet {
          border-radius: 12px 12px 0 0 !important;
          max-height: 92vh !important;
          height: auto !important;
          animation: modalSlideUpMobile 0.28s cubic-bezier(0.16,1,0.3,1) !important;
          width: 100% !important;
        }
        .modal-2col-grid  { grid-template-columns: 1fr !important; }
        .modal-team-grid  { grid-template-columns: 1fr !important; }
      }
    `} />
    </>
  );
}
