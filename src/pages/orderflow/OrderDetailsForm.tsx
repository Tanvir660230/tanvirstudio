import type { CSSProperties, ChangeEvent } from 'react';

import { ArrowRight, Check, FileText, Link2, Mail, Music, Phone, User } from 'lucide-react';

import { Spinner } from '../../components/Spinner';

import { font } from './theme';
import type { TColors } from './theme';

export interface OrderFormFields {
  name: string;
  phone: string;
  email: string;
  songName: string;
  referenceLink: string;
  notes: string;
}

export interface OrderDetailsFormProps {
  postLogin: boolean;
  wasPreFilled: boolean;
  userData: { photoURL?: string; email?: string } | null;
  form: OrderFormFields;
  set: (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  initials: (n: string) => string;
  setFocused: (id: string) => void;
  errors: Record<string, string>;
  inputStyle: (id: string) => CSSProperties;
  iconC: (id: string) => string;
  honeypot: string;
  setHoneypot: (v: string) => void;
  couponCode: string;
  setCouponCode: (v: string) => void;
  appliedCoupon: any;
  setAppliedCoupon: (v: any) => void;
  couponError: string;
  setCouponError: (v: string) => void;
  couponApplying: boolean;
  handleApplyCoupon: () => void;
  selectedPkg: any;
  getDiscountedPrice: (basePrice: number) => number;
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  settings: { studioName: string };
  submitError: string;
  submitting: boolean;
  handleAction: () => void;
  T: TColors;
}

export function OrderDetailsForm({
  postLogin, wasPreFilled, userData, form, set, initials, setFocused, errors,
  inputStyle, iconC, honeypot, setHoneypot,
  couponCode, setCouponCode, appliedCoupon, setAppliedCoupon, couponError, setCouponError, couponApplying, handleApplyCoupon,
  selectedPkg, getDiscountedPrice,
  agreeTerms, setAgreeTerms, settings,
  submitError, submitting, handleAction, T,
}: OrderDetailsFormProps) {
  return (
    <div className="of-form-panel" style={{ padding: '44px 52px', display: 'flex', flexDirection: 'column' }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: T.accent }}>
        {postLogin ? 'Step 2 of 2' : 'Step 1 of 2'}
      </p>
      <h2 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 900, color: T.text, letterSpacing: '-.025em' }}>
        {postLogin ? 'Your Project' : 'Your Details'}
      </h2>
      <p style={{ margin: '0 0 28px', fontSize: 15, color: T.muted, lineHeight: 1.6, maxWidth: 440 }}>
        {postLogin
          ? wasPreFilled
            ? 'Your contact info is pre-filled. Just tell us about this release.'
            : 'Fill in your details and tell us about this release.'
          : 'Fill in your details and continue to create your account.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 500 }}>
        {/* honeypot — bots fill this, humans don't */}
        <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />

        {/* ── Welcome back card (postLogin + prefilled) ── */}
        {postLogin && wasPreFilled && (
          <div style={{ marginBottom: 26, borderRadius: 13, border: `1px solid ${T.accentBorder}`, background: T.accentBg, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: T.accent, color: 'var(--bg-color)', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: font, overflow: 'hidden' }}>
              {userData?.photoURL
                ? <img src={userData.photoURL} alt="User avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(form.name || userData?.email || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.name || 'Welcome back'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[form.email, form.phone].filter(Boolean).join('  · ')}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
              <Check size={10} color={T.green} strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.green, whiteSpace: 'nowrap' }}>Pre-filled</span>
            </div>
          </div>
        )}

        {/* ── Contact info ── */}
        <div style={{ marginBottom: 20 }}>
          {postLogin && <p className="of-sec-label">Contact Info</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <div>
                <label className="of-label">Your Name *</label>
                <div className="of-field">
                  <User size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: iconC('name') }} />
                  <input type="text" required placeholder="Full name" value={form.name}
                    autoComplete="name" maxLength={80}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                    onChange={set('name')} style={inputStyle('name')} />
                </div>
                {errors.name && <p className="of-err">{errors.name}</p>}
              </div>
              <div>
                <label className="of-label">Phone *</label>
                <div className="of-field">
                  <Phone size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: iconC('phone') }} />
                  <input type="tel" required placeholder="+880 1X-XXXX-XXXX" value={form.phone}
                    autoComplete="tel" maxLength={20}
                    onFocus={() => setFocused('phone')} onBlur={() => setFocused('')}
                    onChange={set('phone')} style={inputStyle('phone')} />
                </div>
                {errors.phone && <p className="of-err">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label className="of-label">Email</label>
              <div className="of-field">
                <Mail size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: iconC('email') }} />
                <input type="email" placeholder="your@email.com" value={form.email}
                  autoComplete="email" maxLength={100}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                  onChange={set('email')} style={inputStyle('email')} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Project details ── */}
        <div style={{ marginBottom: 20 }}>
          {postLogin && <p className="of-sec-label">Your Project</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              <div>
                <label className="of-label">Song / Project Title *</label>
                <div className="of-field">
                  <Music size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: iconC('songName') }} />
                  <input type="text" required placeholder="Song name" value={form.songName}
                    maxLength={120}
                    onFocus={() => setFocused('songName')} onBlur={() => setFocused('')}
                    onChange={set('songName')} style={inputStyle('songName')}
                    autoFocus={postLogin} />
                </div>
                {errors.songName && <p className="of-err">{errors.songName}</p>}
              </div>
              <div>
                <label className="of-label">Reference / Demo Link</label>
                <div className="of-field">
                  <Link2 size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: iconC('referenceLink') }} />
                  <input type="url" placeholder="Drive or YouTube link" value={form.referenceLink}
                    autoComplete="url" maxLength={500}
                    onFocus={() => setFocused('referenceLink')} onBlur={() => setFocused('')}
                    onChange={set('referenceLink')} style={inputStyle('referenceLink')} />
                </div>
              </div>
            </div>
            <div>
              <label className="of-label">Creative Direction</label>
              <div className="of-field">
                <FileText size={14} style={{ position: 'absolute', left: 13, top: 13, color: iconC('notes') }} />
                <textarea rows={4} placeholder="Describe your vision, mood, preferred style, reference tracks…"
                  value={form.notes} onFocus={() => setFocused('notes')} onBlur={() => setFocused('')}
                  onChange={set('notes')} maxLength={2000}
                  style={{ ...inputStyle('notes'), padding: '12px 14px 12px 40px', resize: 'vertical', minHeight: 100 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Coupon Code (postLogin only) ── */}
        {postLogin && (
          <div style={{ marginBottom: 16 }}>
            <label className="of-label">Promo / Coupon Code</label>
            {appliedCoupon ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.green }}>{appliedCoupon.code}</span>
                  <span style={{ fontSize: 12, color: T.green, marginLeft: 8, fontWeight: 600 }}>
                    {appliedCoupon.type === 'percent' ? `${appliedCoupon.value}% off` : `৳${appliedCoupon.value} off`} applied!
                  </span>
                </div>
                <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.green, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Enter code" style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${couponError ? T.errBorder : T.border}`, background: T.card, color: T.text, fontSize: 14, fontFamily: font, outline: 'none', letterSpacing: '.08em', fontWeight: 700 }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} />
                <button onClick={handleApplyCoupon} disabled={!couponCode.trim() || couponApplying}
                  style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${T.accentBorder}`, background: T.accentBg, color: T.accent, fontSize: 13, fontWeight: 800, cursor: !couponCode.trim() || couponApplying ? 'not-allowed' : 'pointer', fontFamily: font, whiteSpace: 'nowrap', opacity: !couponCode.trim() ? 0.5 : 1 }}>
                  {couponApplying ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="of-err">{couponError}</p>}
          </div>
        )}

        {/* ── Price summary (postLogin) ── */}
        {postLogin && (() => {
          const basePrice = parseInt((selectedPkg.price || '').replace(/[^\d]/g, ''), 10) || 0;
          const finalPrice = getDiscountedPrice(basePrice);
          return basePrice > 0 ? (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: appliedCoupon ? 6 : 0 }}>
                <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{selectedPkg.name} Package</span>
                <span style={{ fontSize: 13, color: T.muted, fontWeight: 600, textDecoration: appliedCoupon ? 'line-through' : 'none' }}>{selectedPkg.price}</span>
              </div>
              {appliedCoupon && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>Coupon ({appliedCoupon.code})</span>
                    <span style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>-৳{(basePrice - finalPrice).toLocaleString()}</span>
                  </div>
                  <div style={{ height: 1, background: T.divider, marginBottom: 8 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: T.text, fontWeight: 800 }}>Total</span>
                    <span style={{ fontSize: 16, color: T.accent, fontWeight: 900 }}>৳{finalPrice.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          ) : null;
        })()}

        {/* ── T&C Agreement (postLogin) ── */}
        {postLogin && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
              I agree to {settings?.studioName || 'Tanvir Studio'}'s{' '}
              <a href="/terms" target="_blank" style={{ color: T.accent, textDecoration: 'none', fontWeight: 700 }}>Terms & Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" style={{ color: T.accent, textDecoration: 'none', fontWeight: 700 }}>Privacy Policy</a>.
            </span>
          </label>
        )}

        {submitError && (
          <div style={{ marginBottom: 16, padding: '11px 14px', borderRadius: 9, background: T.errBg, border: `1px solid ${T.errBorder}`, color: 'var(--color-danger)', fontSize: 13.5 }}>
            {submitError}
          </div>
        )}

        <button onClick={handleAction} disabled={submitting || (postLogin && !agreeTerms)}
          style={{ width: '100%', background: submitting ? T.surface : T.accentGrad, color: submitting ? T.muted : 'var(--card-bg)', border: submitting ? `1px solid ${T.border}` : 'none', padding: '17px 28px', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: submitting ? 'none' : '0 8px 28px rgba(196,154,82,0.28)', fontFamily: font, transition: 'opacity .18s, transform .18s' }}
          onMouseOver={e => { if (!submitting) { e.currentTarget.style.opacity = '.9'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >
          {submitting
            ? <><Spinner size={17} color="white" /> Confirming…</>
            : postLogin
              ? <>Confirm Order <Check size={18} /></>
              : <>Continue to Account <ArrowRight size={18} /></>
          }
        </button>
        {!postLogin && (
          <p style={{ textAlign: 'center', color: T.muted, fontSize: 13, marginTop: 12 }}>
            You'll sign in or create a free account on the next step.
          </p>
        )}

      </div>
    </div>
  );
}
