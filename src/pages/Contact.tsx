import { FaqSection } from '../components/FaqSection';
import { Global, css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageCircle, User, Send, Check, Zap, Shield, Star } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { cloudSubmitContact } from '../lib/firebase';
import { SEO } from '../components/SEO';
import { IconFacebook, IconYoutube, IconInstagram } from '../components/icons/SocialIcons';

const font = "var(--font-sans)";

const SERVICE_OPTIONS = [
  'Vocal Mixing & Mastering', 'Nasheed Production', 'Quran Tilawat Processing',
  'Sound Design', 'Podcast Editing', 'Background Score', 'Video Editing',
  'Lyric Video', 'Motion Graphics', 'Studio Website', 'Content Strategy', 'Other',
];

const C = { panel: 'var(--card-bg)', border: 'var(--border-color)', surf: 'var(--surface-1)' };

export function Contact() {

  const { settings } = useSettings();  const EMPTY_FORM = { name: '', email: '', phone: '', service: '', budget: '', deadline: '', message: '' };

  const [form, setForm] = useState(() => {

    try {

      const saved = localStorage.getItem('ts_contact_draft');

      return saved ? { ...EMPTY_FORM, ...JSON.parse(saved) } : EMPTY_FORM;

    } catch { return EMPTY_FORM; }

  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const [honeypot, setHoneypot] = useState('');



  const validate = (f: typeof form) => {

    const e: Record<string, string> = {};

    if (!f.name.trim()) e.name = 'Full name is required.';

    if (!f.email.trim()) e.email = 'Email is required.';

    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';

    if (!f.message.trim()) e.message = 'Message is required.';

    else if (f.message.trim().length < 10) e.message = 'Message must be at least 10 characters.';

    else if (f.message.trim().length > 2000) e.message = 'Message must be under 2000 characters.';

    return e;

  };



  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {

    localStorage.setItem('ts_contact_draft', JSON.stringify(form));

  }, [form]);

  useEffect(() => {

    document.body.style.backgroundColor = '';

    return () => { document.body.style.backgroundColor = ''; };

  }, []);

  const accent = 'var(--accent-gold-light)';

  const accentD = '#8a5c1a';

  const glow    = 'rgba(217,173,98,0.12)';

  const phone   = settings?.studioPhone  || '';

  const email   = settings?.studioEmail  || '';

  const address = settings?.studioAddress || '';

  const waNumber = phone.replace(/[^0-9]/g, '');

  const waLink   = waNumber ? `https://wa.me/${waNumber}` : '';



  const inputStyle: React.CSSProperties = {

    width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14,

    border: `1.5px solid var(--border-color)`, background: 'var(--input-bg)',

    color: 'var(--text-primary)', fontSize: 16, fontFamily: font, outline: 'none',

    transition: 'border-color 0.2s, box-shadow 0.2s',

  };



  const handleBlur = (field: string) => {

    setTouched(t => ({ ...t, [field]: true }));

    setFieldErrors(validate({ ...form }));

  };



  const handleChange = (field: string, value: string) => {

    const next = { ...form, [field]: value };

    setForm(next);

    if (touched[field]) setFieldErrors(validate(next));

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (honeypot) return; // bot detected

    if (status !== 'idle') return;

    const allTouched = { name: true, email: true, message: true };

    setTouched(prev => ({ ...prev, ...allTouched }));

    const errors = validate(form);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;



    // Rate limit: max 3 submissions per hour

    const RL_KEY = 'ts_contact_rl';

    const now = Date.now();

    const prev: number[] = JSON.parse(localStorage.getItem(RL_KEY) || '[]').filter((t: number) => now - t < 3_600_000);

    if (prev.length >= 3) { setStatus('error'); return; }

    localStorage.setItem(RL_KEY, JSON.stringify([...prev, now]));



    setStatus('loading');

    try {

      await cloudSubmitContact({

        name: form.name, email: form.email, phone: form.phone,

        subject: form.service || 'General Inquiry', message: form.message,

        honeypot,

      });

    } catch (err: any) {

      const msg: string = err?.message || '';

      if (msg.includes('Too many')) { setStatus('error'); return; }

      setStatus('error'); return;

    }

    setStatus('success');

    setForm(EMPTY_FORM);

    setTouched({});

    setFieldErrors({});

    localStorage.removeItem('ts_contact_draft');

    if (typeof window !== 'undefined' && (window as any).gtag) {

      (window as any).gtag('event', 'contact_form_submit', { event_category: 'engagement', event_label: form.service || 'General' });

    }

    setTimeout(() => setStatus('idle'), 6000);

  };



  const socials = [

    { icon: <IconFacebook size={16} color={ accent } />,  label: 'Facebook',  href: settings?.socialFacebook  },

    { icon: <IconYoutube  size={16} color={ accent } />,  label: 'YouTube',   href: settings?.socialYoutube   },

    { icon: <IconInstagram size={16} color={ accent } />, label: 'Instagram', href: settings?.socialInstagram },

  ].filter(s => s.href);



  const TRUST = [

    { Icon: Zap,    label: 'Fast Response',   value: 'Within a few hours' },

    { Icon: Shield, label: 'Secure & Private', value: 'Your data is safe' },

    { Icon: Star,   label: 'Premium Support',  value: 'Dedicated engineer' },

  ];



  return (

    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: font, color: 'var(--text-primary)' }}>

      <Global styles={css`

        @keyframes cFloat { 0%,100%{transform:translateY(0);opacity:.55} 50%{transform:translateY(-18px);opacity:.9} }

        .ct-grid { display:grid; grid-template-columns:1fr 1.6fr; gap:32px; align-items:start; }

        .ct-trust { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }

        .ct-info-row { transition: background 0.18s; border-radius:14px; padding:14px; }

        .ct-info-row:hover,.ct-info-row:active { background: ${glow}; }

        .ct-info-link:hover,.ct-info-link:active { color:${ accent } !important; }

        .ct-social-btn:hover,.ct-social-btn:active { background:rgba(217,173,98,0.2) !important; transform:translateY(-2px); }

        @media(max-width:900px){

          .ct-grid  { grid-template-columns:1fr !important; }

          .ct-trust { grid-template-columns:repeat(3,1fr) !important; }

        }

        @media(max-width:680px){

          .ct-trust { grid-template-columns:1fr !important; }

          .ct-form-row { grid-template-columns:1fr !important; }

        }

        @media(max-width:768px){ .ct-form-row { grid-template-columns:1fr !important; } }

        @keyframes spin{to{transform:rotate(360deg)}}

      `} />



      <SEO title="Contact | Tanvir Studio" description="Get in touch with Tanvir Studio. Send a message, book a session, or visit us at West Shanarpar, Demra, Dhaka-1361." url="https://tanvir.studio/contact" />



      {/* ── HERO ── */}

      <section style={{ position:'relative', padding:'130px 24px 80px', textAlign:'center', overflow:'hidden' }}>

        {/* Glows */}

        <div style={{ position:'absolute', top:'0%', left:'50%', transform:'translateX(-50%)', width:800, height:500, background:`radial-gradient(ellipse,

 0%,transparent 70%)`, filter:'blur(90px)', pointerEvents:'none' }} />

        <div style={{ position:'absolute', bottom:'0', left:'15%', width:400, height:300, background:`radial-gradient(ellipse,

 0%,transparent 70%)`, filter:'blur(70px)', pointerEvents:'none' }} />

        {/* Grid */}

        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient( 1px,transparent 1px),linear-gradient(90deg,${''} 1px,transparent 1px)`, backgroundSize:'64px 64px', pointerEvents:'none' }} />

        {/* Floating dots */}

        {[...Array(7)].map((_,i) => (

          <div key={i} style={{ position:'absolute', borderRadius:'50%', width:i%2===0?4:3, height:i%2===0?4:3, background:`rgba(217,173,98,0.35)`, left:`${8+i*13}%`, top:`${20+(i%3)*22}%`, animation:`cFloat ${3+i*0.5}s ease-in-out ${i*0.38}s infinite` }} />

        ))}



        <motion.div initial={{ opacity:0, y:36 }} animate={{ opacity:1, y:0 }} transition={{ duration:1, ease:[0.16,1,0.3,1] }}

          style={{ position:'relative', zIndex:1, maxWidth:680, margin:'0 auto' }}>

          {/* Badge */}

          <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.15, duration:0.6 }}

            style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(217,173,98,0.1)', border:'1px solid rgba(217,173,98,0.28)', borderRadius:100, padding:'7px 18px', marginBottom:28 }}>

            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent-gold)', boxShadow: 'none' }} />

            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--accent-gold)' }}>Premium Support</span>

          </motion.div>



          <h1 className="apple-h1" style={{ margin: '0 0 24px' }}>

            Let's build something<br />

            <span style={{ background:'linear-gradient(135deg,#c49040 0%,#f0d080 40%,#d9ad62 70%,#a87428 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>

              extraordinary.

            </span>

          </h1>

          <p className="apple-subtitle" style={{ margin:'0 auto', maxWidth:480 }}>

            Tell us about your vision and we'll craft the perfect sound for it. Our team responds within hours.

          </p>

        </motion.div>

      </section>



      {/* ── TRUST STRIP ── */}

      <div style={{ padding:'0 24px 56px' }}>

        <div className="ct-trust" style={{ maxWidth:760, margin:'0 auto' }}>

          {TRUST.map(({ Icon, label, value }, i) => (

            <motion.div key={label} initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.1, duration:0.5 }}

              style={{ textAlign:'center', padding:'20px 16px', background:'var(--surface-1)', border:`1px solid var(--border-color)')`, borderRadius:18 }}>

              <div style={{ width:40, height:40, borderRadius:12, background:glow, border:'1px solid rgba(217,173,98,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>

                <Icon size={18} color={ accent } strokeWidth={1.8} />

              </div>

              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.01em', marginBottom:4 }}>{label}</div>

              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{value}</div>

            </motion.div>

          ))}

        </div>

      </div>



      {/* ── MAIN GRID ── */}

      <section style={{ padding:'0 24px 120px' }}>

        <div className="ct-grid" style={{ maxWidth:1060, margin:'0 auto' }}>



          {/* ── LEFT — INFO PANEL ── */}

          <motion.div initial={{ opacity:0, x:-24 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.65 }}>

            <div style={{ borderRadius:28, overflow:'hidden', border:`1px solid var(--border-color)')`, background:'var(--card-bg)', boxShadow: 'none' }}>



              {/* Gold header bar */}

              <div style={{ background:`linear-gradient(135deg,${ accent } 0%,#c49040 40%,${accentD} 100%)`, padding:'30px 28px 26px', position:'relative', overflow:'hidden' }}>

                <div style={{ position:'absolute', top:'-30%', right:'-10%', width:180, height:180, background:'rgba(255,255,255,0.07)', borderRadius:'50%' }} />

                <div style={{ position:'absolute', bottom:'-40%', left:'5%', width:120, height:120, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />

                <div style={{ position:'relative', zIndex:1 }}>

                  <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:10 }}>Contact Information</div>

                  <div style={{ fontSize:24, fontWeight:900, color:'var(--card-bg)', letterSpacing:'-0.04em', lineHeight:1.15 }}>{settings?.studioName || 'Tanvir Studio'}</div>

                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.68)', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>

                    <MapPin size={12} /> {settings?.studioAddress?.split(',').slice(-3).join(',').trim() || ''}

                  </div>

                </div>

              </div>



              {/* Info list */}

              <div style={{ padding:'20px 20px 8px' }}>

                {[

                  { Icon: Phone,  label:'Phone / WhatsApp', value:phone,   href:waLink||(phone?`tel:${phone}`:null) },

                  { Icon: Mail,   label:'Email',            value:email,   href:email?`mailto:${email}`:null },

                  { Icon: MapPin, label:'Studio Address',   value:address, href:'https://maps.app.goo.gl/P7rFTzLM2bxbRbP37' },

                  { Icon: Clock,  label:'Working Hours',    value:`${settings?.workHoursStart??9}:00 AM – ${settings?.workHoursEnd??10}:00 PM`, href:null },

                ].filter(item => item.value).map(({ Icon, label, value, href }) => (

                  <div key={label} className="ct-info-row" style={{ display:'flex', gap:14, alignItems:'flex-start' }}>

                    <div style={{ width:38, height:38, borderRadius:11, background:glow, border:'1px solid rgba(217,173,98,0.22)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>

                      <Icon size={16} color={ accent } strokeWidth={1.8} />

                    </div>

                    <div style={{ minWidth:0, paddingTop:2 }}>

                      <div style={{ fontSize:10, fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>{label}</div>

                      {href ? (

                        <a href={href} target={href.startsWith('http')?'_blank':undefined} rel="noreferrer"

                          className="ct-info-link"

                          style={{ fontSize:13.5, fontWeight:600, color:'var(--text-primary)', textDecoration:'none', lineHeight:1.55, wordBreak:'break-word', transition:'color 0.15s' }}>

                          {value}

                        </a>

                      ) : (

                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-primary)', lineHeight:1.55 }}>{value}</div>

                      )}

                    </div>

                  </div>

                ))}

              </div>



              <div style={{ height:1, background:'var(--border-color)', margin:'4px 20px 16px' }} />



              <div style={{ padding:'0 20px 20px', display:'flex', flexDirection:'column', gap:14 }}>

                {/* WhatsApp */}

                {waLink && (

                  <a href={waLink} target="_blank" rel="noreferrer"

                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#25d366', color:'var(--card-bg)', borderRadius:14, padding:'14px 20px', fontSize:14, fontWeight:800, textDecoration:'none', boxShadow: 'none', transition:'opacity 0.15s,transform 0.15s' }}>

                    <MessageCircle size={18} strokeWidth={2} /> Chat on WhatsApp

                  </a>

                )}



                {/* Socials */}

                {socials.length > 0 && (

                  <div style={{ display:'flex', gap:10 }}>

                    {socials.map(s => (

                      <a key={s.label} href={s.href!} target="_blank" rel="noreferrer" title={s.label}

                        className="ct-social-btn"

                        style={{ flex:1, height:42, borderRadius:12, background:'var(--surface-1)', border:`1px solid var(--border-color)')`, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', transition:'background 0.15s,transform 0.15s', gap:7, fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>

                        {s.icon}

                        <span>{s.label}</span>

                      </a>

                    ))}

                  </div>

                )}



                {/* Response callout */}

                <div style={{ padding:'14px 16px', borderRadius:14, background:`linear-gradient(135deg,${glow},rgba(217,173,98,0.06))`, border:'1px solid rgba(217,173,98,0.2)', display:'flex', gap:12, alignItems:'flex-start' }}>

                  <div style={{ fontSize:20, lineHeight:1 }}>⚡</div>

                  <div>

                    <div style={{ fontSize:12, fontWeight:800, color:'var(--accent-gold)', marginBottom:3 }}>Typical Response Time</div>

                    <div style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.65 }}>We reply within <strong style={{ color:'var(--text-primary)' }}>a few hours</strong> during working hours. For urgent matters, WhatsApp is fastest.</div>

                  </div>

                </div>

              </div>

            </div>

          </motion.div>



          {/* ── RIGHT — FORM ── */}

          <motion.div initial={{ opacity:0, x:24 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.65, delay:0.1 }}>

            <div style={{ background:'var(--card-bg)', border:`1px solid var(--border-color)')`, borderRadius:28, padding:'clamp(28px,4vw,48px)', boxShadow: 'none' }}>



              {status === 'success' ? (

                <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} style={{ textAlign:'center', padding:'52px 0' }}>

                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.1, type:'spring', stiffness:220 }}

                    style={{ width:80, height:80, borderRadius:'50%', background:'rgba(52,199,89,0.1)', border:'2px solid rgba(52,199,89,0.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>

                    <Check size={34} color="var(--color-success)" strokeWidth={2.5} />

                  </motion.div>

                  <div style={{ fontSize:26, fontWeight:900, color:'var(--text-primary)', marginBottom:12, letterSpacing:'-0.04em' }}>Message Sent!</div>

                  <div style={{ fontSize:15, color:'var(--text-secondary)', lineHeight:1.75, maxWidth:340, margin:'0 auto 32px' }}>

                    Thank you for reaching out. Our team will get back to you within a few hours.

                  </div>

                  <button onClick={() => setStatus('idle')} style={{ padding:'12px 32px', borderRadius:100, border:`1.5px solid var(--border-color)')`, background:'transparent', color:'var(--text-primary)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:font, transition:'border-color 0.15s' }}>

                    Send Another Message

                  </button>

                </motion.div>

              ) : (

                <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:16 }}>

                  {/* Honeypot — hidden from real users, bots fill it */}

                  <input type="text" name="website_url" value={honeypot} onChange={e => setHoneypot(e.target.value)}

                    tabIndex={-1} aria-hidden="true" style={{ position:'absolute', left:'-9999px', width:1, height:1, opacity:0 }} />



                  {/* Form header */}

                  <div style={{ marginBottom:4, paddingBottom:20, borderBottom:`1px solid var(--border-color)')` }}>

                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>

                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent-gold)', boxShadow: 'none' }} />

                      <span style={{ fontSize:11, fontWeight:700, color:'var(--accent-gold)', letterSpacing:'0.12em', textTransform:'uppercase' }}>New Message</span>

                    </div>

                    <div style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.04em', color:'var(--text-primary)', marginBottom:6 }}>Send us a message</div>

                    <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>Fill in the details below and we'll be in touch shortly.</div>

                  </div>



                  {/* Name + Email */}

                  <div className="ct-form-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                    <div>

                      <label htmlFor="ct-name" style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}><User size={11} strokeWidth={2.5} /> Full Name <span style={{ color:'var(--color-danger)' }} aria-hidden="true">*</span></label>

                      <input id="ct-name" style={{ ...inputStyle, borderColor: touched.name && fieldErrors.name ? 'var(--color-danger)' : 'var(--border-color)' }}

                        value={form.name} onChange={e => handleChange('name', e.target.value)}

                        onBlur={() => handleBlur('name')}

                        placeholder="Your name"

                        aria-required="true" aria-invalid={touched.name && !!fieldErrors.name}

                        aria-describedby={touched.name && fieldErrors.name ? 'ct-name-err' : undefined}

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                      />

                      {touched.name && fieldErrors.name && <p id="ct-name-err" role="alert" style={{ margin:'5px 0 0', fontSize:11.5, color:'var(--color-danger)', fontWeight:600 }}>{fieldErrors.name}</p>}

                    </div>

                    <div>

                      <label htmlFor="ct-email" style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}><Mail size={11} strokeWidth={2.5} /> Email <span style={{ color:'var(--color-danger)' }} aria-hidden="true">*</span></label>

                      <input id="ct-email" type="email" style={{ ...inputStyle, borderColor: touched.email && fieldErrors.email ? 'var(--color-danger)' : 'var(--border-color)' }}

                        value={form.email} onChange={e => handleChange('email', e.target.value)}

                        onBlur={() => handleBlur('email')}

                        placeholder="you@example.com"

                        aria-required="true" aria-invalid={touched.email && !!fieldErrors.email}

                        aria-describedby={touched.email && fieldErrors.email ? 'ct-email-err' : undefined}

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                      />

                      {touched.email && fieldErrors.email && <p id="ct-email-err" role="alert" style={{ margin:'5px 0 0', fontSize:11.5, color:'var(--color-danger)', fontWeight:600 }}>{fieldErrors.email}</p>}

                    </div>

                  </div>



                  {/* Phone + Service */}

                  <div className="ct-form-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                    <div>

                      <label htmlFor="ct-phone" style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}><Phone size={11} strokeWidth={2.5} /> Phone</label>

                      <input id="ct-phone" style={inputStyle} value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+880…"

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                        onBlur={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.boxShadow='none'; }} />

                    </div>

                    <div>

                      <label htmlFor="ct-service" style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Service Needed</label>

                      <select id="ct-service" style={{ ...inputStyle, cursor:'pointer', appearance:'none' as const }} value={form.service} onChange={e => handleChange('service', e.target.value)}

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                        onBlur={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.boxShadow='none'; }}>

                        <option value="">Select a service</option>

                        {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}

                      </select>

                    </div>

                  </div>



                  {/* Budget + Deadline */}

                  <div className="ct-form-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

                    <div>

                      <label htmlFor="ct-budget" style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Budget Range</label>

                      <select id="ct-budget" style={{ ...inputStyle, cursor:'pointer', appearance:'none' as const }} value={form.budget} onChange={e => handleChange('budget', e.target.value)}

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                        onBlur={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.boxShadow='none'; }}>

                        <option value="">Select budget</option>

                        <option value="Under ৳3,000">Under ৳3,000</option>

                        <option value="৳3,000 – ৳5,000">৳3,000 – ৳5,000</option>

                        <option value="৳5,000 – ৳10,000">৳5,000 – ৳10,000</option>

                        <option value="৳10,000+">৳10,000+</option>

                        <option value="Flexible">Flexible / Discuss</option>

                      </select>

                    </div>

                    <div>

                      <label htmlFor="ct-deadline" style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Deadline</label>

                      <select id="ct-deadline" style={{ ...inputStyle, cursor:'pointer', appearance:'none' as const }} value={form.deadline} onChange={e => handleChange('deadline', e.target.value)}

                        onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                        onBlur={e => { e.currentTarget.style.borderColor='var(--border-color)'; e.currentTarget.style.boxShadow='none'; }}>

                        <option value="">Select timeline</option>

                        <option value="ASAP">ASAP (urgent)</option>

                        <option value="Within 1 week">Within 1 week</option>

                        <option value="2–4 weeks">2–4 weeks</option>

                        <option value="1–2 months">1–2 months</option>

                        <option value="Flexible">Flexible</option>

                      </select>

                    </div>

                  </div>



                  {/* Message */}

                  <div>

                    <label htmlFor="ct-message" style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Your Message <span style={{ color:'var(--color-danger)' }} aria-hidden="true">*</span></label>

                    <textarea id="ct-message" style={{ ...inputStyle, resize:'vertical', minHeight:140, lineHeight:1.7, borderColor: touched.message && fieldErrors.message ? 'var(--color-danger)' : 'var(--border-color)' }}

                      value={form.message} onChange={e => handleChange('message', e.target.value)}

                      onBlur={() => handleBlur('message')}

                      placeholder="Tell us about your project — genre, reference tracks, deadline, special requirements…" rows={5}

                      aria-required="true" aria-invalid={touched.message && !!fieldErrors.message}

                      aria-describedby={touched.message && fieldErrors.message ? 'ct-message-err' : undefined}

                      onFocus={e => { e.currentTarget.style.borderColor='var(--accent-gold)'; e.currentTarget.style.boxShadow=`0 0 0 3px rgba(217,173,98,0.15)`; }}

                    />

                    {touched.message && fieldErrors.message && <p id="ct-message-err" role="alert" style={{ margin:'5px 0 0', fontSize:11.5, color:'var(--color-danger)', fontWeight:600 }}>{fieldErrors.message}</p>}

                  </div>



                  {status === 'error' && (

                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}

                      style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,59,48,0.07)', border:'1px solid rgba(255,59,48,0.2)', fontSize:13.5, color:'var(--color-danger)', display:'flex', alignItems:'center', gap:8 }}>

                      <span style={{ fontSize:16 }}>âš ️</span> Something went wrong. Please try WhatsApp or email us directly.

                    </motion.div>

                  )}



                  <button type="submit" disabled={status !== 'idle'}

                    className="apple-btn"

                    style={{ width: '100%', padding:'16px', marginTop:4 }}

                  >

                    {status === 'loading' ? (

                      <span style={{ display:'flex', alignItems:'center', gap:8 }}>

                        <span style={{ width:16, height:16, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,0.35)', borderTopColor:'var(--card-bg)', display:'inline-block', animation:'spin 0.7s linear infinite' }} />

                        Sending…

                      </span>

                    ) : (

                      <><Send size={16} strokeWidth={2.5} /> Send Message</>

                    )}

                  </button>



                  <p style={{ fontSize:12, color:'var(--text-secondary)', textAlign:'center', margin:0, lineHeight:1.7 }}>

                    By submitting, you agree to our <Link to="/privacy" style={{ color:'var(--accent-gold)', textDecoration:'none', fontWeight:600 }}>Privacy Policy</Link>. We never share your information.

                  </p>

                </form>

              )}

            </div>

          </motion.div>



        </div>

      </section>



      <FaqSection dark={false} C={C} />



    </div>

  );

}





