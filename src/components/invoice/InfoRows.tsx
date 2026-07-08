import React from 'react';
import { deep, accent, accentGold, muted, metaLabelStyle } from './theme';

export function MetaRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr>
      <td style={metaLabelStyle}>{label}</td>
      <td style={{ padding: '7px 0', color: deep, fontSize: strong ? 13.5 : 13, fontWeight: strong ? 900 : 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </div>
  );
}

export function ContactRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: accentGold, display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: muted }}>{text}</span>
    </div>
  );
}

export function PaymentLine({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: accentGold, display: 'inline-flex', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ color: deep, fontWeight: 800 }}>{title}</div>
        <div style={{ color: muted, fontWeight: 700, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{detail}</div>
      </div>
    </div>
  );
}

export function SummaryRow({ label, value, valueColor = deep }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, padding: '8px 0', fontSize: 13.5 }}>
      <span style={{ color: muted, fontWeight: 700 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
