import { Check, Clock } from 'lucide-react';

import type { TColors } from './theme';

export interface PackagePanelProps {
  selectedPkg: any;
  setSelectedPkg: (pkg: any) => void;
  isServiceOrder: boolean;
  allPkgs: any[];
  T: TColors;
}

export function PackagePanel({ selectedPkg, setSelectedPkg, isServiceOrder, allPkgs, T }: PackagePanelProps) {
  return (
    <div className="of-pkg-panel" style={{ borderRight: `1px solid ${T.divider}`, padding: '40px 32px', background: T.panel, display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Package switcher / service card */}
      {isServiceOrder ? (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 12px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: T.mutedSoft }}>Selected Service</p>
          <div style={{ borderRadius: 11, border: `1.5px solid ${T.pkgActiveBorder}`, background: T.pkgActive, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${T.accent}`, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-color)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{selectedPkg?.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: T.mutedSoft, lineHeight: 1 }}>{selectedPkg?.delivery}</p>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: T.accent, letterSpacing: '-.02em', flexShrink: 0 }}>{selectedPkg?.price}</p>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 12px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: T.mutedSoft }}>Choose Package</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allPkgs.map((p: any) => {
              const active = p.name === selectedPkg?.name;
              return (
                <button key={p.name} className={`of-pkg-btn${active ? ' active' : ''}`} onClick={() => setSelectedPkg(p)}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-color)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: active ? T.text : T.muted, lineHeight: 1.2, transition: 'color .15s' }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: T.mutedSoft, lineHeight: 1 }}>{p.delivery}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: active ? T.accent : T.muted, letterSpacing: '-.02em', transition: 'color .15s' }}>{p.price}</p>
                    {p.originalPrice && (
                      <p style={{ margin: 0, fontSize: 11, color: T.mutedSoft, textDecoration: 'line-through', lineHeight: 1.2 }}>{p.originalPrice}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: T.divider, marginBottom: 28 }} />

      {/* Selected package details */}
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: T.accent }}>Package Details</p>
      <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: T.text, letterSpacing: '-.03em' }}>{selectedPkg?.name}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: T.muted, lineHeight: 1.55 }}>{selectedPkg?.line}</p>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: 8, padding: '7px 13px', marginBottom: 22, alignSelf: 'flex-start' }}>
        <Clock size={13} color={T.accent} />
        <span style={{ color: T.accent, fontSize: 13, fontWeight: 700 }}>Delivery in {selectedPkg?.delivery}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(selectedPkg?.features || []).map((f: string) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.greenBg, border: `1px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Check size={8} color={T.green} />
            </div>
            <span style={{ color: T.muted, fontSize: 13, lineHeight: 1.45 }}>{f}</span>
          </div>
        ))}
        {selectedPkg?.bonus && (
          <div style={{ marginTop: 4, padding: '9px 13px', borderRadius: 8, border: `1px solid ${T.accentBorder}`, background: T.accentBg, color: T.accent, fontSize: 13, fontWeight: 600 }}>
            + Bonus: {selectedPkg.bonus}
          </div>
        )}
      </div>
    </div>
  );
}
