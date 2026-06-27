import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface LogoutConfirmDialogProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmDialog({ show, onClose, onConfirm }: LogoutConfirmDialogProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'none',
              width: '360px', maxWidth: 'calc(100vw - 32px)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color="var(--accent-red)" />
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Sign out of Tanvir Studio?</span>
            </div>
            {/* Body */}
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                You'll be signed out of your account. Any unsaved changes will be lost.
              </p>
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 20px 16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--surface-1)')}
              >Cancel</button>
              <button
                onClick={onConfirm}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent-red)', color: 'var(--card-bg)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'filter 0.12s' }}
                onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseOut={e => (e.currentTarget.style.filter = 'none')}
              >Sign Out</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
