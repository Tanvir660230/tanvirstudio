import { Global, css } from '@emotion/react';

import { useState, useEffect } from 'react';

import type { CSSProperties, ChangeEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, ArrowRight, Check, CheckCircle, Music, Phone, User, Link2, FileText, Mail, Clock } from 'lucide-react';

import { Spinner } from '../components/Spinner';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { sendNewOrderNotification, sendOrderConfirmationToClient } from '../utils/emailApi';

import { sendOrderReceivedSMS } from '../utils/smsApi';

import { cloudValidateCoupon, functions } from '../lib/firebase';

import { httpsCallable } from 'firebase/functions';



const T = {

  bg: 'var(--bg-color)', panel: 'var(--surface-1)', card: 'var(--card-bg)',

  border: 'var(--border-color)', borderFocus: 'var(--accent-gold)',

  text: 'var(--text-primary)', muted: 'var(--text-secondary)', mutedSoft: 'var(--text-tertiary)',

  accent: 'var(--accent-gold)', accentGrad: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%)',

  accentBg: 'var(--accent-gold-glow)', accentBorder: 'rgba(196,154,82,0.2)',

  green: 'var(--color-success)', greenBg: 'rgba(16, 185, 129, 0.1)', greenBorder: 'rgba(16, 185, 129, 0.22)',

  errBg: 'rgba(239, 68, 68, 0.08)', errBorder: 'rgba(239, 68, 68, 0.2)',

  divider: 'var(--border-color)', surface: 'var(--surface-2)',

  pkgActive: 'var(--accent-gold-glow)', pkgActiveBorder: 'rgba(196,154,82,0.45)',

};



const font = "var(--font-sans)";



const makeFallbackPackages = (currency: string) => [

  {

    name: 'Starter', price: `${currency}2,999`, originalPrice: `${currency}4,500`,

    line: 'Simple, clean production for first releases.',

    delivery: '3 Days',

    features: ['Basic Mixing & Mastering', 'Vocal Cleaning & Tuning', 'Basic Background Arrangement', '1 Revision', 'MP3 + WAV Delivery'],

  },

  {

    name: 'Signature', price: `${currency}4,999`, originalPrice: `${currency}7,000`,

    line: 'Professional detail for YouTube-ready releases.',

    delivery: '5 Days',

    features: ['Advanced Mixing & Mastering', 'Professional Vocal Processing', 'Custom Background Arrangement', '3 Revisions', 'Priority Support'],

    highlight: true,

  },

  {

    name: 'Elite', price: `${currency}7,999`, originalPrice: `${currency}10,000`,

    line: 'Premium cinematic production for official releases.',

    delivery: '7 Days',

    features: ['Full Premium Audio Production', 'Cinematic Mixing & Mastering', 'Unlimited Priority Revisions', 'WAV + MP3 Final Delivery'],

    bonus: 'Complimentary Promotional Video',

  },

];



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

    // CF returns discountAmount — use it directly

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

      // Rate limit: 60 s between submissions (sessionStorage — per-tab, not shared across users)

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



      {/* â”€â”€ Top bar â”€â”€ */}

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

        /* â”€â”€ Success â”€â”€ */

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

            <button onClick={() => { onClose(); navigate('/dashboard'); }}

              style={{ background: T.accentGrad, color: 'var(--card-bg)', border: 'none', padding: '16px 36px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font, boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>

              Go to Dashboard <ArrowRight size={16} />

            </button>

          </div>

        </div>

      ) : (

        <div className="of-layout">



          {/* â”€â”€ Left: Package selector + summary â”€â”€ */}

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



          {/* â”€â”€ Right: Form â”€â”€ */}

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

              {/* honeypot — bots fill this, humans don't */}

              <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />



              {/* â”€â”€ Welcome back card (postLogin + prefilled) â”€â”€ */}

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



              {/* â”€â”€ Contact info â”€â”€ */}

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



              {/* â”€â”€ Project details â”€â”€ */}

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



              {/* â”€â”€ Coupon Code (postLogin only) â”€â”€ */}

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



              {/* â”€â”€ Price summary (postLogin) â”€â”€ */}

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



              {/* â”€â”€ T&C Agreement (postLogin) â”€â”€ */}

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

        </div>

      )}

    </div>

  );

}



type TColors = typeof T;



function StepDot({ n, label, active, done, T }: { n: number; label: string; active: boolean; done?: boolean; T: TColors }) {

  const bg = done ? T.green : active ? T.accent : 'transparent';

  const border = done ? T.green : active ? T.accent : T.divider;

  const textColor = (done || active) ? 'var(--bg-color)' : T.muted;

  return (

    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>

      <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, border: `1.5px solid ${border}`, color: textColor, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

        {done ? <Check size={11} strokeWidth={3} /> : n}

      </div>

      <span style={{ fontSize: 12.5, fontWeight: 600, color: (active || done) ? T.text : T.muted }}>{label}</span>

    </div>

  );

}



