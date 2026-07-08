import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, subtitle, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="collapsible-section-header"
        aria-expanded={isOpen}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        <ChevronDown
          size={18}
          style={{ flexShrink: 0, color: 'var(--text-tertiary)', transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {isOpen && <div className="collapsible-section-body">{children}</div>}
    </div>
  );
}
