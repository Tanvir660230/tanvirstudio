import { Global, css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useSettings } from '../contexts/SettingsContext';
import { sendContactFormNotification } from '../utils/emailApi';
import { SEO } from '../components/SEO';
import { PremiumDatePicker } from '../components/PremiumDatePicker';
import { MessageSquare, Check, ArrowRight, Mic, Video, Monitor, Palette, Tag } from 'lucide-react';

const muted = 'var(--text-secondary)';
const font = "var(--font-sans)";

const SERVICES = [
  { id: 'audio',    icon: Mic,     label: 'Audio Production',   desc: 'Mixing, mastering, nasheed production' },
  { id: 'video',    icon: Video,   label: 'Video & Editing',     desc: 'Lyric videos, reels, cinematic edits' },
  { id: 'software', icon: Monitor, label: 'Software & Web',      desc: 'Studio websites, automation systems' },
  { id: 'content',  icon: Palette, label: 'Content & Branding',  desc: 'Thumbnails, scripts, channel branding' },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  budget: string;
  message: string;
  referralCode?: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  service?: string;
  date?: string;
  message?: string;
}

function validate(form: FormData): FieldErrors {
  const errs: FieldErrors = {};
  if (!form.name.trim()) errs.name = 'Name is required';
  if (!form.email.trim()) errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
  if (!form.service) errs.service = 'Please select a service';
  if (!form.date) errs.date = 'Please choose a preferred date';
  if (!form.message.trim()) errs.message = 'Tell us a bit about your project';
  else if (form.message.trim().length > 2000) errs.message = 'Message must be under 2000 characters.';
  return errs;
}

export function Booking() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledServices = searchParams.get('services');

  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem('ts_booking_draft');
      const base = saved ? JSON.parse(saved) : { name: '', email: '', phone: '', service: '', date: '', time: '10:00', budget: '', message: '', referralCode: '' };
      if (prefilledServices) {
        base.message = `I would like to book the following services:\n${prefilledServices}\n\n` + (base.message || '');
      }
      return base;
    } catch {
      return { name: '', email: '', phone: '', service: '', date: '', time: '10:00', budget: '', message: prefilledServices ? `I would like to book the following services:\n${prefilledServices}\n\n` : '', referralCode: '' };
    }
  });

  const parseDateTime = (d: string, t: string) => {
    if (!d) return null;
    const date = new Date(d);
    if (t) {
      const [h, m] = t.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    }
    return date;
  };

  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(() => parseDateTime(form.date, form.time));

  useEffect(() => {
    if (selectedDateTime) {
      const d = selectedDateTime.toISOString().split('T')[0];
      const t = selectedDateTime.toTimeString().substring(0, 5);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(f => ({ ...f, date: d, time: t }));
    }
  }, [selectedDateTime]);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    localStorage.setItem('ts_booking_draft', JSON.stringify(form));
  }, [form]);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (touched[k]) setErrors(prev => ({ ...prev, ...validate({ ...form, [k]: e.target.value }) }));
  };

  const blur = (k: keyof FormData) => () => {
    setTouched(t => ({ ...t, [k]: true }));
    setErrors(prev => ({ ...prev, ...validate(form) }));
  };

  const inputStyle = (field: keyof FieldErrors | string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 12,
    border: `1.5px solid ${touched[field as keyof FormData] && errors[field as keyof FieldErrors] ? 'var(--color-danger)' : 'var(--border-color)'}`,
    background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 16, fontFamily: font, outline: 'none',
    transition: 'border-color 0.2s',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    const allTouched = Object.fromEntries(Object.keys(form).map(k => [k, true]));
    setTouched(allTouched as any);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus('loading');
    try {
      const submitPublicBooking = httpsCallable(functions, 'submitPublicBooking');
      await submitPublicBooking({
        ...form,
        studioName: settings?.studioName || 'Tanvir Studio',
      });
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'booking_submit', { event_category: 'conversion', event_label: form.service });
      }
      setStatus('success');
      localStorage.removeItem('ts_booking_draft');
      const adminEmail = settings?.studioEmail || '';
      if (adminEmail) {
        sendContactFormNotification(adminEmail, form.name, form.email, form.phone, form.service, form.message).catch(() => {});
      }
    } catch {
      setStatus('error');
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: font, color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 24px', textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,209,138,0.15)', border: '2px solid #34d18a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Check size={32} color="#34d18a" />
            </div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0 0 14px' }}>Booking Received!</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 420, margin: '0 auto 32px' }}>
              We'll review your request and reach out within a few hours to confirm your session.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/')} className="apple-btn">Back to Home</button>
              <button
                onClick={() => { setForm({ name: '', email: '', phone: '', service: '', date: '', time: '10:00', budget: '', message: '', referralCode: '' }); setStatus('idle'); setTouched({}); setErrors({}); }}
                className="apple-btn apple-btn-secondary"
              >
                Book Another
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: font, color: 'var(--text-primary)' }}>
      <SEO title="Book a Session | Tanvir Studio" description="Book a free consultation or production session with Tanvir Studio. Tell us about your project and we'll get back within hours." url="https://tanvir.studio/booking" canonical="https://tanvir.studio/booking" />

      {/* Hero */}
      <section style={{ padding: '120px 24px 64px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'block', marginBottom: 16 }}>Free Consultation</span>
          <h1 className="apple-h1" style={{ margin: '0 0 18px' }}>Book Your Session</h1>
          <p className="apple-subtitle" style={{ maxWidth: 480, margin: '0 auto' }}>
            Tell us about your project. We'll review and confirm your session within a few hours.
          </p>
        </motion.div>
      </section>

      {/* Form */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 96px' }}>
        <Global styles={css`.bk-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}@media(max-width:600px){.bk-grid{grid-template-columns:1fr}}`} />

        <motion.form
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={handleSubmit} noValidate
          style={{ background: 'var(--card-bg)', border: `1px solid var(--border-color)`, borderRadius: 24, padding: '40px' }}
        >
          {/* Honeypot — hidden from real users, bots fill it */}
          <input
            type="text" name="website_url" value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            tabIndex={-1} aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          {/* Service selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 12 }}>
              What service do you need? <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {SERVICES.map(({ id, icon: Icon, label, desc }) => {
                const active = form.service === id;
                return (
                  <button
                    key={id} type="button"
                    onClick={() => { setForm(f => ({ ...f, service: id })); setErrors(prev => ({ ...prev, service: undefined })); }}
                    aria-pressed={active}
                    style={{
                      padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${active ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      background: active ? '' : 'var(--surface-1)',
                      transition: 'all 0.18s',
                    }}
                  >
                    <Icon size={18} color={active ? 'var(--accent-gold)' : 'var(--text-secondary)'} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--accent-gold)' : 'var(--text-primary)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
                  </button>
                );
              })}
            </div>
            {touched.service && errors.service && (
              <p role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{errors.service}</p>
            )}
          </div>

          {/* Name + Email */}
          <div className="bk-grid">
            <div>
              <label htmlFor="bk-name" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                Full Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input id="bk-name" type="text" value={form.name} onChange={set('name')} onBlur={blur('name')}
                placeholder="Your name" required aria-required="true"
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={touched.name && errors.name ? 'bk-name-err' : undefined}
                style={inputStyle('name')} />
              {touched.name && errors.name && <p id="bk-name-err" role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="bk-email" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input id="bk-email" type="email" value={form.email} onChange={set('email')} onBlur={blur('email')}
                placeholder="you@email.com" required aria-required="true"
                aria-invalid={touched.email && !!errors.email}
                aria-describedby={touched.email && errors.email ? 'bk-email-err' : undefined}
                style={inputStyle('email')} />
              {touched.email && errors.email && <p id="bk-email-err" role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.email}</p>}
            </div>
          </div>

          {/* Phone + Budget */}
          <div className="bk-grid">
            <div>
              <label htmlFor="bk-phone" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Phone / WhatsApp</label>
              <input id="bk-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+880..." style={inputStyle('name')} />
            </div>
            <div>
              <label htmlFor="bk-budget" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Budget Range</label>
              <select id="bk-budget" value={form.budget} onChange={set('budget')}
                style={{ ...inputStyle('name'), appearance: 'none' as any }}>
                <option value="">Select budget…</option>
                <option value="under-5k">Under ৳5,000</option>
                <option value="5k-15k">৳5,000 – ৳15,000</option>
                <option value="15k-30k">৳15,000 – ৳30,000</option>
                <option value="30k-plus">৳30,000+</option>
                <option value="discuss">Prefer to discuss</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 12 }}>
              Preferred Date & Time <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${touched.date && errors.date ? 'var(--color-danger)' : 'var(--border-color)'}` }}>
              <PremiumDatePicker
                selected={selectedDateTime}
                onChange={(date: Date | null) => {
                  setSelectedDateTime(date);
                  setTouched(t => ({ ...t, date: true, time: true }));
                }}
                showTimeSelect
                placeholderText="Select date and time"
                workHoursStart={10}
                workHoursEnd={20}
                sessionDuration={60}
              />
            </div>
            {touched.date && errors.date && <p role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8 }}>{errors.date}</p>}
          </div>

          {/* Message */}
          <div style={{ marginBottom: 28 }}>
            <label htmlFor="bk-msg" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Project Details <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <MessageSquare size={14} color={muted} style={{ position: 'absolute', left: 13, top: 14, pointerEvents: 'none' }} />
              <textarea id="bk-msg" value={form.message} onChange={set('message')} onBlur={blur('message')}
                placeholder="Tell us about your project — what you need, your timeline, any references…"
                required aria-required="true"
                aria-invalid={touched.message && !!errors.message}
                aria-describedby={touched.message && errors.message ? 'bk-msg-err' : undefined}
                rows={4}
                style={{ ...inputStyle('message'), paddingLeft: 36, resize: 'vertical', minHeight: 110 }} />
            </div>
            {touched.message && errors.message && <p id="bk-msg-err" role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.message}</p>}
          </div>

          {/* Referral Code */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="bk-ref" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Referral Code <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={14} color="var(--accent-gold)" style={{ position: 'absolute', left: 13, top: 15, pointerEvents: 'none' }} />
              <input id="bk-ref" type="text" value={form.referralCode} onChange={set('referralCode')} onBlur={blur('referralCode')}
                placeholder="Enter a friend's referral code to get a discount"
                style={{ ...inputStyle('referralCode'), paddingLeft: 38 }}
              />
            </div>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div role="alert" style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)', fontSize: 13, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span>⚠️</span> Something went wrong. Please try again or <Link to="/contact" style={{ color: 'var(--color-danger)', fontWeight: 700 }}>contact us directly</Link>.
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={status === 'loading'}
            onClick={() => { if (status === 'error') setStatus('idle'); }}
            className="apple-btn"
            style={{ width: '100%', opacity: status === 'loading' ? 0.7 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {status === 'loading' ? 'Submitting…' : <><span>Request Session</span><ArrowRight size={16} /></>}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 16 }}>
            No payment required. We'll confirm availability and send details.
          </p>
        </motion.form>
      </section>
    </div>
  );
}
