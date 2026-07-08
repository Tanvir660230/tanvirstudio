import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderPlus, ReceiptText, UserPlus } from 'lucide-react';

interface MobileQuickCreateFabProps {
  onNewProject: () => void;
  onNewInvoice: () => void;
  onNewClient: () => void;
}

const ACTIONS = [
  { key: 'project', label: 'New Project', desc: 'Add to production pipeline', icon: <FolderPlus size={20} />, color: 'var(--accent-gold)' },
  { key: 'invoice', label: 'Record Income', desc: 'Quick entry to Finance ledger', icon: <ReceiptText size={20} />, color: 'var(--color-success)' },
  { key: 'client', label: 'Add Client', desc: 'Create a new client profile', icon: <UserPlus size={20} />, color: 'var(--color-info)' },
] as const;

export function MobileQuickCreateFab({ onNewProject, onNewInvoice, onNewClient }: MobileQuickCreateFabProps) {
  const [open, setOpen] = useState(false);

  const handlers: Record<(typeof ACTIONS)[number]['key'], () => void> = {
    project: onNewProject,
    invoice: onNewInvoice,
    client: onNewClient,
  };

  return (
    <>
      <motion.button
        className="mobile-quick-create-fab"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        aria-label="Quick create"
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1501, background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', padding: '0 0 calc(24px + env(safe-area-inset-bottom)) 0', border: '1px solid var(--border-color)', borderBottom: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-color)' }} />
              </div>
              <div style={{ padding: '4px 16px 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Quick Create
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ACTIONS.map(action => (
                  <button
                    key={action.key}
                    onClick={() => { setOpen(false); handlers[action.key](); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: `color-mix(in srgb, ${action.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, flexShrink: 0 }}>
                      {action.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{action.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
