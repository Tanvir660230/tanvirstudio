import { ArrowRight, CheckCircle, Mail, Phone } from 'lucide-react';

import { font } from './theme';
import type { TColors } from './theme';

export interface SuccessScreenProps {
  form: { name: string };
  selectedPkg: any;
  orderRef: string;
  settings: { socialWhatsapp: string; studioEmail: string };
  onGoToDashboard: () => void;
  T: TColors;
}

export function SuccessScreen({ form, selectedPkg, orderRef, settings, onGoToDashboard, T }: SuccessScreenProps) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.greenBg, border: `1px solid ${T.greenBorder}`, color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <CheckCircle size={42} strokeWidth={1.8} />
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: T.text, letterSpacing: '-.025em', margin: '0 0 14px' }}>Order Confirmed!</h2>
        <p style={{ color: T.muted, fontSize: 15.5, lineHeight: 1.7, margin: '0 0 10px' }}>
          Thank you, <span style={{ color: T.text, fontWeight: 700 }}>{form.name}</span>.
        </p>
        <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.65, margin: '0 0 20px' }}>
          Your <span style={{ color: T.accent, fontWeight: 700 }}>{selectedPkg?.name}</span> order is live in your dashboard.
        </p>
        {orderRef && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: 10, padding: '10px 18px', marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, letterSpacing: '.04em' }}>ORDER REF</span>
            <span style={{ fontSize: 15, color: T.accent, fontWeight: 900, letterSpacing: '.08em' }}>{orderRef}</span>
          </div>
        )}
        {/* Contact info */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 32, textAlign: 'left' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: T.mutedSoft }}>What happens next</p>
          <p style={{ margin: '0 0 8px', fontSize: 13.5, color: T.muted, lineHeight: 1.6 }}>
            We'll review your order and reach out <span style={{ color: T.text, fontWeight: 600 }}>within 24 hours</span> to confirm details.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {settings.socialWhatsapp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={13} style={{ color: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.muted }}>WhatsApp: <span style={{ color: T.text, fontWeight: 600 }}>{settings.socialWhatsapp}</span></span>
              </div>
            )}
            {settings.studioEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={13} style={{ color: T.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.muted }}>Email: <span style={{ color: T.text, fontWeight: 600 }}>{settings.studioEmail}</span></span>
              </div>
            )}
          </div>
        </div>
        <button onClick={onGoToDashboard}
          style={{ background: T.accentGrad, color: '#fff', border: 'none', padding: '16px 36px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font, boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Go to Dashboard <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
