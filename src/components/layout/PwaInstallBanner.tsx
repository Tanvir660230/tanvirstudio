import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, X } from 'lucide-react';

interface PwaInstallBannerProps {
  show: boolean;
  onClose: () => void;
  deferredInstallPrompt: any;
  setDeferredInstallPrompt: (val: any) => void;
}

export function PwaInstallBanner({ show, onClose, deferredInstallPrompt, setDeferredInstallPrompt }: PwaInstallBannerProps) {
  const handleInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
        onClose();
      }
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2500, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'none', minWidth: 320, maxWidth: 'calc(100vw - 40px)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Music2 size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Install Tanvir Studio</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>Add to your home screen for quick access</div>
          </div>
          <button onClick={handleInstall} style={{ background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Install</button>
          <button onClick={() => { onClose(); localStorage.setItem('pwaPromptDismissed', 'true'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}><X size={14} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
