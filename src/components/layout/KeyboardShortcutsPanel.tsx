import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface KeyboardShortcutsPanelProps {
  show: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsPanel({ show, onClose }: KeyboardShortcutsPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3001, background: 'var(--card-bg)', borderRadius: 24, border: '1px solid var(--border-color)', boxShadow: 'none', width: 480, maxWidth: 'calc(100vw - 32px)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Keyboard Shortcuts</div>
              <button onClick={onClose} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Ctrl / Cmd + K', 'Focus search'],
                ['?', 'Toggle this panel'],
                ['Esc', 'Close panel / modal'],
                ['G → H', 'Go to Dashboard'],
                ['G → W', 'Go to Work'],
                ['G → C', 'Go to Clients'],
                ['G → F', 'Go to Finance'],
                ['G → N', 'Go to Notes'],
                ['G → R', 'Go to Reminders'],
                ['G → S', 'Go to Settings'],
                ['Ctrl+Enter', 'Save (in forms)'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'var(--bg-color)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{desc}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '3px 10px', borderRadius: 7, letterSpacing: '0.3px', fontFamily: 'monospace' }}>{key}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
