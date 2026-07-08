import { Global, css } from '@emotion/react';

import { useState, useEffect } from 'react';

import type { CSSProperties, ChangeEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft } from 'lucide-react';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { sendNewOrderNotification, sendOrderConfirmationToClient } from '../utils/emailApi';

import { sendOrderReceivedSMS } from '../utils/smsApi';

import { cloudValidateCoupon, functions } from '../lib/firebase';

import { httpsCallable } from 'firebase/functions';

import { T, font } from './orderflow/theme';

import { makeFallbackPackages } from './orderflow/fallbackPackages';

import { StepDot } from './orderflow/StepDot';

import { PackagePanel } from './orderflow/PackagePanel';

import { OrderDetailsForm } from './orderflow/OrderDetailsForm';

import { SuccessScreen } from './orderflow/SuccessScreen';

export interface OrderFlowProps {
  pkg: any;
  postLogin?: boolean;
  onClose: () => void;
}

const empty = { name: '', phone: '', email: '', songName: '', referenceLink: '', notes: '' };
const LS_DRAFT_KEY = 'ts_order_draft';

export function OrderFlow({ pkg, postLogin = false, onClose }: OrderFlowProps) {
  const navigate = useNavigate();
  const { tasks, websitePackages } = useData();
  const { settings } = useSettings();
  const { user, userData } = useAuth();

  const currency = settings.currency || '৳';
  const allPkgs = websitePackages?.length ? websitePackages : makeFallbackPackages(currency);
  const [selectedPkg, setSelectedPkg] = useState(pkg);
  const isServiceOrder = !!pkg && !allPkgs.some((p: any) => p.name === pkg?.name);

  const [form, setForm] = useState<typeof empty>(() => {
    if (postLogin) return empty; // postLogin restores from sessionStorage below
    try {
      const saved = localStorage.getItem(LS_DRAFT_KEY);
      if (saved) return { ...empty, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return empty;
  });
  const [focused, setFocused] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [wasPreFilled, setWasPreFilled] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Pre-fill contact info from account on postLogin mount; restore pre-login form data if available
  useEffect(() => {
    if (!postLogin) return;
    const name = userData?.name || user?.displayName || '';
    const email = userData?.email || user?.email || '';
    const phone = userData?.phone || '';

    const prevTask = (!phone && email)
      ? [...(tasks || [])]
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .find((t: any) => t.clientEmail === email || t.client === name)
      : null;

    const resolvedPhone = phone || prevTask?.clientPhone || '';

    // Restore form data user filled before being redirected to login
    let savedForm: Partial<typeof empty> = {};
    try {
      const raw = sessionStorage.getItem('pendingOrderForm');
      if (raw) { savedForm = JSON.parse(raw); sessionStorage.removeItem('pendingOrderForm'); }
    } catch { /* ignore parse errors */ }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f => ({
      ...f,
      name: name || savedForm.name || f.name,
      email: email || savedForm.email || f.email,
      phone: resolvedPhone || savedForm.phone || f.phone,
      songName: savedForm.songName || f.songName,
      referenceLink: savedForm.referenceLink || f.referenceLink,
      notes: savedForm.notes || f.notes,
    }));
    if (name || email || resolvedPhone || Object.keys(savedForm).length > 0) {
      setWasPreFilled(true);
    }

  }, [postLogin, tasks, user?.displayName, user?.email, userData?.email, userData?.name, userData?.phone]);

  // Auto-save draft to localStorage so form survives page refresh
  useEffect(() => {
    if (success) { localStorage.removeItem(LS_DRAFT_KEY); return; }
    try { localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore quota errors */ }
  }, [form, success]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else { const d = form.phone.replace(/\D/g, ''); if (d.length < 5 || d.length > 15) e.phone = 'Enter a valid phone number'; }
    if (postLogin && !form.email.trim()) e.email = 'Email is required';
    else if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.songName.trim()) e.songName = 'Song / project title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponApplying(true);
    setCouponError('');
    try {
      const basePrice = parseInt((selectedPkg?.price || '').replace(/[^\d]/g, ''), 10) || 0;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
      );
      const result = await Promise.race([
        cloudValidateCoupon({ code, packageId: selectedPkg?.id || selectedPkg?.name, amount: basePrice }),
        timeout,
      ]) as any;
      const data = result.data as any;
      setAppliedCoupon({ code, ...data });
    } catch (err: any) {
      const raw: string = err?.message || 'Invalid coupon code.';
      setCouponError(raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(functions\/[^)]+\)\s*$/, '').trim());
      setAppliedCoupon(null);
    } finally {
      setCouponApplying(false);
    }
  };

  const getDiscountedPrice = (basePrice: number) => {
    if (!appliedCoupon) return basePrice;
    // CF returns discountAmount — use it directly
    if (typeof appliedCoupon.discountAmount === 'number') {
      return Math.max(0, basePrice - appliedCoupon.discountAmount);
    }
    return basePrice;
  };

  const handleAction = async () => {
    if (honeypot) return; // bot trap
    if (!validate()) return;
    if (postLogin && !agreeTerms) { setSubmitError('Please agree to the Terms & Conditions to continue.'); return; }
    const basePrice = parseInt((selectedPkg.price || '').replace(/[^\d]/g, ''), 10) || 0;
    const price = getDiscountedPrice(basePrice);

    if (postLogin) {
      // Rate limit: 60 s between submissions (sessionStorage — per-tab, not shared across users)
      const rlKey = 'ts_order_rl';
      const lastAt = parseInt(sessionStorage.getItem(rlKey) || '0', 10) || 0;
      const wait = Math.ceil((lastAt + 60000 - Date.now()) / 1000);
      if (wait > 0) {
        setSubmitError(`Please wait ${wait} seconds before submitting again.`);
        return;
      }

      const phone = form.phone.replace(/\D/g, '');
      const duplicate = (tasks || []).some((t: any) =>
        t.publicOrder && t.status === 'pending' && (
          (form.email && t.clientEmail === form.email) ||
          (phone && (t.clientPhone || '').replace(/\D/g, '') === phone)
        )
      );
      if (duplicate) {
        setSubmitError('You already have a pending order with us. We\'ll be in touch soon!');
        return;
      }
      setSubmitting(true);
      setSubmitError('');

      // Apply coupon server-side (atomic validate + increment usedCount)
      let finalPrice = price;
      let couponDiscount = basePrice - price;
      if (appliedCoupon) {
        try {
          const applyRes = await cloudValidateCoupon({
            code: appliedCoupon.code,
            packageId: selectedPkg?.id || selectedPkg?.name,
            amount: basePrice,
            apply: true,
          });
          const applyData = applyRes.data as any;
          finalPrice    = Math.max(0, applyData.finalAmount ?? finalPrice);
          couponDiscount = basePrice - finalPrice;
        } catch {
          setSubmitError('Coupon is no longer valid. Please remove it and try again.');
          setSubmitting(false);
          return;
        }
      }

      const ref = `TSN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      try {
        const submitPublicOrder = httpsCallable(functions, 'submitPublicOrder');
        await submitPublicOrder({
          title: `TSN-${form.name} - ${form.songName}`,
          client: form.name.trim(), clientEmail: form.email.trim().toLowerCase(), clientPhone: form.phone,
          songName: form.songName,
          description: `Package: ${selectedPkg.name}\nReference: ${form.referenceLink}\nNotes:\n${form.notes}`,
          budget: finalPrice, advance: 0, status: 'pending', priority: 'normal',
          needsHumming: false, hasRecording: false,
          createdAt: new Date().toISOString(), publicOrder: true, packageName: selectedPkg.name,
          orderRef: ref,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code, couponDiscount } : {}),
        });
        sessionStorage.setItem('ts_order_rl', Date.now().toString());
        localStorage.removeItem(LS_DRAFT_KEY);
        setOrderRef(ref);
        setSuccess(true);
        const adminEmail = settings.studioEmail || '';
        if (adminEmail) {
          sendNewOrderNotification(
            adminEmail, form.name, form.email, form.phone,
            form.songName, selectedPkg.name, form.referenceLink, form.notes
          ).catch(() => {});
        }
        if (form.email) {
          sendOrderConfirmationToClient(
            form.email, form.name, selectedPkg.name, form.songName, selectedPkg.price || ''
          ).catch(() => {});
        }
        if (form.phone) {
          sendOrderReceivedSMS(form.phone, form.name, selectedPkg.name, ref).catch(() => {});
        }
      } catch {
        setSubmitError('Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Save package for App.tsx to restore (key must match App.tsx getItem call)
      sessionStorage.setItem('pendingPackage', JSON.stringify(selectedPkg));
      // Save form data so it can be restored after login
      sessionStorage.setItem('pendingOrderForm', JSON.stringify({
        name: form.name, email: form.email, phone: form.phone,
        songName: form.songName, referenceLink: form.referenceLink, notes: form.notes,
      }));
      navigate('/login');
    }
  };

  const inputStyle = (id: string): CSSProperties => ({
    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, fontFamily: font,
    border: `1.5px solid ${errors[id] ? T.errBorder : focused === id ? T.borderFocus : T.border}`,
    background: focused === id ? T.accentBg : T.card,
    color: T.text, fontSize: 16, fontWeight: 500, outline: 'none',
    transition: 'border-color .18s, background .18s',
    boxShadow: focused === id ? '0 0 0 3px rgba(196,154,82,0.1)' : 'none',
    boxSizing: 'border-box',
  });

  const iconC = (id: string) => focused === id ? T.accent : errors[id] ? 'var(--color-danger)' : T.muted;
  const initials = (n: string) => n.trim().split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: T.bg, fontFamily: font, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Global styles={css`
        .of-layout { display: grid; grid-template-columns: 420px 1fr; min-height: calc(100vh - 58px); }
        .of-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: ${T.muted}; margin-bottom: 7px; }
        .of-field { position: relative; }
        .of-err { font-size: 12px; color: var(--color-danger); margin-top: 4px; font-weight: 600; }
        .of-sec-label { font-size: 10.5px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; color: ${T.mutedSoft}; margin: 0 0 14px; display: flex; align-items: center; gap: 10px; }
        .of-sec-label::after { content: ''; flex: 1; height: 1px; background: ${T.divider}; }
        .of-pkg-btn { width: 100%; text-align: left; background: none; border: 1.5px solid ${T.border}; border-radius: 11px; padding: 11px 14px; cursor: pointer; font-family: ${font}; transition: border-color .15s, background .15s; display: flex; align-items: center; gap: 12px; }
        .of-pkg-btn:hover { border-color: ${T.accentBorder}; background: ${T.accentBg}; }
        .of-pkg-btn.active { border-color: ${T.pkgActiveBorder}; background: ${T.pkgActive}; }
        @media (max-width: 900px) {
          .of-layout { grid-template-columns: 1fr; }
          .of-pkg-panel { border-right: none !important; border-bottom: 1px solid ${T.divider} !important; padding: 28px 24px !important; }
          .of-form-panel { padding: 32px 24px !important; }
        }
      `} />

      {/* ── Top bar ── */}
      <div style={{ height: 58, borderBottom: `1px solid ${T.divider}`, background: T.bg, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: T.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font, padding: 0, transition: 'color .15s' }}
          onMouseOver={e => (e.currentTarget.style.color = T.text)}
          onMouseOut={e => (e.currentTarget.style.color = T.muted)}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ height: 18, width: 1, background: T.divider }} />
        <span style={{ fontSize: 13, color: T.muted }}>
          Order  · <span style={{ color: T.accent, fontWeight: 700 }}>{selectedPkg?.name}{isServiceOrder ? '' : ' Package'}</span>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <StepDot n={1} label="Account" done={postLogin} active={!postLogin} T={T} />
          <div style={{ width: 24, height: 1, background: postLogin ? T.accent : T.divider }} />
          <StepDot n={2} label="Details" done={success} active={postLogin} T={T} />
        </div>
      </div>

      {success ? (
        <SuccessScreen
          form={form}
          selectedPkg={selectedPkg}
          orderRef={orderRef}
          settings={settings}
          onGoToDashboard={() => { onClose(); navigate('/dashboard'); }}
          T={T}
        />
      ) : (
        <div className="of-layout">

          <PackagePanel
            selectedPkg={selectedPkg}
            setSelectedPkg={setSelectedPkg}
            isServiceOrder={isServiceOrder}
            allPkgs={allPkgs}
            T={T}
          />

          <OrderDetailsForm
            postLogin={postLogin}
            wasPreFilled={wasPreFilled}
            userData={userData}
            form={form}
            set={set}
            initials={initials}
            setFocused={setFocused}
            errors={errors}
            inputStyle={inputStyle}
            iconC={iconC}
            honeypot={honeypot}
            setHoneypot={setHoneypot}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            appliedCoupon={appliedCoupon}
            setAppliedCoupon={setAppliedCoupon}
            couponError={couponError}
            setCouponError={setCouponError}
            couponApplying={couponApplying}
            handleApplyCoupon={handleApplyCoupon}
            selectedPkg={selectedPkg}
            getDiscountedPrice={getDiscountedPrice}
            agreeTerms={agreeTerms}
            setAgreeTerms={setAgreeTerms}
            settings={settings}
            submitError={submitError}
            submitting={submitting}
            handleAction={handleAction}
            T={T}
          />
        </div>
      )}
    </div>
  );
}
