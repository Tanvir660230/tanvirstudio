import React from 'react';
import { CreditCard, ChevronRight } from 'lucide-react';

interface PanelFooterProps {
  task: any;
  isAdmin: boolean;
  onClose: () => void;
  onOpenFull: (task: any) => void;
  onGenerateInvoice?: (task: any) => void;
}

export function PanelFooter({ task, isAdmin, onClose, onOpenFull, onGenerateInvoice }: PanelFooterProps) {
  return (
    <div style={{
      padding: '20px 28px', borderTop: '1px solid var(--border-color)',
      background: 'var(--card-bg)', flexShrink: 0, display: 'flex', gap: 12,
      position: 'relative', zIndex: 10,
      boxShadow: 'none'
    }}>

      {onGenerateInvoice && isAdmin && (
        <button
          onClick={() => { onClose(); onGenerateInvoice(task); }}
          style={{
            padding: '14px 18px', borderRadius: '14px',
            background: 'rgba(175,82,222,0.1)', color: 'var(--accent-purple)',
            border: '1px solid rgba(175,82,222,0.25)', cursor: 'pointer',
            fontSize: '14px', fontWeight: '800',
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseOver={e => { e.currentTarget.style.background='rgba(175,82,222,0.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}
          onMouseOut={e => { e.currentTarget.style.background='rgba(175,82,222,0.1)'; e.currentTarget.style.transform='translateY(0)'; }}
        >
          <CreditCard size={16} /> Invoice
        </button>
      )}
      <button
        onClick={() => { onClose(); onOpenFull(task); }}
        style={{
          flex: 1, padding: '14px 0', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--text-primary), #444)', color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: '14px', fontWeight: '800', letterSpacing: '-0.2px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseOver={e => {e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 24px rgba(0,0,0,0.2)'}}
        onMouseOut={e => {e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)'}}
        onMouseDown={e => {e.currentTarget.style.transform='scale(0.98)'}}
        onMouseUp={e => {e.currentTarget.style.transform='translateY(-2px)'}}
      >
        Open Full Project Intel <ChevronRight size={16} />
      </button>
    </div>
  );
}
