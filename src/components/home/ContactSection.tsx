import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { Link } from 'react-router-dom';
import { Check, Phone, Mail, MapPin, Clock, MessageCircle, Send, User } from 'lucide-react';
import { IconFacebook, IconYoutube, IconInstagram } from '../icons/SocialIcons';
import { cloudSubmitContact } from '../../lib/firebase';

const SERVICE_OPTIONS = ['Vocal Mixing & Mastering', 'Nasheed Production', 'Quran Tilawat Processing', 'Sound Design', 'Podcast Editing', 'Background Score', 'Video Editing', 'Lyric Video', 'Motion Graphics', 'Studio Website', 'Content Strategy', 'Other'];

export function ContactSection({ settings, waLink }: { dark: boolean; settings: any; waLink: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [formErrors, setFormErrors] = useState<{name?: string, email?: string, message?: string}>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const accent = 'var(--accent-gold)';
  const accentD = '#8a5c1a';
  const panel   = 'var(--card-bg)';
  const border  = 'var(--border-color)';
  const inputBg = 'var(--surface-1)';
  const glow    = 'rgba(196,154,82,0.13)';
  const font = "var(--font-sans)";

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 14,
    border: `1px solid ${border}`, background: inputBg,
    color: 'var(--text-primary)', fontSize: 16, fontFamily: font, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;
    
    const errors: any = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Valid email is required';
    if (!form.message.trim()) errors.message = 'Message is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setStatus('loading');
    try {
      await cloudSubmitContact({ name: form.name, email: form.email, phone: form.phone, subject: form.service || 'General Inquiry', message: form.message, honeypot: '' });
    } catch {
      setStatus('error');
      return;
    }
    setStatus('success');
    setForm({ name: '', email: '', phone: '', service: '', message: '' });
    setTimeout(() => setStatus('idle'), 6000);
  };

  const socials = [
    { icon: <IconFacebook size={15} color={ accent } />, label: 'Facebook', href: settings?.socialFacebook },
    { icon: <IconYoutube  size={15} color={ accent } />, label: 'YouTube',  href: settings?.socialYoutube },
    { icon: <IconInstagram size={15} color={ accent } />, label: 'Instagram', href: settings?.socialInstagram },
  ].filter(s => s.href);

  return (
    <section id="contact" style={{ padding: '96px 24px', background: 'var(--card-bg)', borderTop: `1px solid ${border}` }}>
      <div style={{ maxWidth: 1020, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: 72 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'block', marginBottom: 14 }}>Get In Touch</span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, margin: '0 0 18px', color: 'var(--text-primary)' }}>
            Let's build something<br />
            <span style={{ background: `linear-gradient(135deg, ${ accent }, #e8c678)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              extraordinary.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Tell us about your vision and we'll craft the perfect sound for it.
          </p>
        </motion.div>


        <div className="home-contact-grid">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${border}`, background: panel, boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ background: `linear-gradient(135deg, ${ accent }, ${accentD})`, padding: '28px 28px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Contact Information</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--card-bg)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{settings?.studioName || 'Tanvir Studio'}</div>
                {settings?.studioAddress && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{settings.studioAddress.split(',').slice(-3).join(',').trim()}</div>}
              </div>

              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { icon: <Phone size={16} color={ accent } />, label: 'Phone / WhatsApp', value: settings?.studioPhone || '', href: waLink || (settings?.studioPhone ? `tel:${settings.studioPhone}` : null) },
                  { icon: <Mail size={16} color={ accent } />, label: 'Email', value: settings?.studioEmail || '', href: settings?.studioEmail ? `mailto:${settings.studioEmail}` : null },
                  { icon: <MapPin size={16} color={ accent } />, label: 'Studio Address', value: settings?.studioAddress || '', href: settings?.studioAddress ? `https://maps.google.com/maps?q=${encodeURIComponent(settings.studioAddress)}` : null },
                  { icon: <Clock size={16} color={ accent } />, label: 'Working Hours', value: `${settings?.workHoursStart ?? 9}:00 AM – ${settings?.workHoursEnd ?? 10}:00 PM`, href: null },
                ].filter(item => item.value).map(({ icon, label, value, href }) => (
                  <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: glow, border: `1px solid rgba(196,154,82,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                      {href ? (
                        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                          className="hover-opacity-75"
                          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.5, wordBreak: 'break-word', transition: 'color 0.15s' }}
                        >
                          {value}
                        </a>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{value}</div>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ height: 1, background: border, margin: '4px 0' }} />

                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="hover-opacity-75"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#25d366', color: 'var(--card-bg)', borderRadius: 14, padding: '13px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: 'none', transition: 'opacity 0.15s, transform 0.15s' }}
                  >
                    <MessageCircle size={17} /> Chat on WhatsApp
                  </a>
                )}

                {socials.length > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {socials.map(s => (
                      <a key={s.label} href={s.href!} target="_blank" rel="noreferrer" title={s.label}
                        className="hover-opacity-75"
                        style={{ width: 38, height: 38, borderRadius: 10, background: glow, border: `1px solid rgba(196,154,82,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'background 0.15s, transform 0.15s' }}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                )}

                <div style={{ padding: '14px 16px', borderRadius: 12, background: glow, border: `1px solid rgba(196,154,82,0.18)` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 4 }}>⚡ Typical Response Time</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>We reply within <strong style={{ color: 'var(--text-primary)' }}>a few hours</strong> during working hours. For urgent matters, WhatsApp is fastest.</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.08 }}>
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 20, padding: 'clamp(28px, 4vw, 44px)', boxShadow: 'var(--shadow-xs)' }}>
              {status === 'success' ? (
                <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', border: '1.5px solid rgba(52,199,89,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
                    <Check size={30} color="var(--color-success)" strokeWidth={2.5} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.03em' }}>Message Sent!</div>
                  <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28, maxWidth: 320, margin: '0 auto 28px' }}>Thank you for reaching out. We'll get back to you very soon.</div>
                  <button onClick={() => setStatus('idle')} style={{ padding: '11px 28px', borderRadius: 100, border: `1px solid ${border}`, background: 'transparent', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Send Another</button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 6 }}>Send us a message</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fill in the details below and we'll be in touch shortly.</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7 }}><User size={11} /> Full Name *</label>
                      <input style={{...inputStyle, borderColor: formErrors.name ? 'var(--color-danger)' : inputStyle.borderColor}} value={form.name} onChange={e => {setForm(f => ({ ...f, name: e.target.value })); setFormErrors(e => ({...e, name: ''}))}} placeholder="Your name" required
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = `0 0 0 3px ${glow}`; }}
                        onBlur={e => { e.currentTarget.style.borderColor = formErrors.name ? 'var(--color-danger)' : border; e.currentTarget.style.boxShadow = 'none'; }} />
                      {formErrors.name && <div style={{color: 'var(--color-danger)', fontSize: 11, marginTop: 4, fontWeight: 500}}>{formErrors.name}</div>}
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7 }}><Mail size={11} /> Email *</label>
                      <input type="email" style={{...inputStyle, borderColor: formErrors.email ? 'var(--color-danger)' : inputStyle.borderColor}} value={form.email} onChange={e => {setForm(f => ({ ...f, email: e.target.value })); setFormErrors(e => ({...e, email: ''}))}} placeholder="you@example.com" required
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = `0 0 0 3px ${glow}`; }}
                        onBlur={e => { e.currentTarget.style.borderColor = formErrors.email ? 'var(--color-danger)' : border; e.currentTarget.style.boxShadow = 'none'; }} />
                      {formErrors.email && <div style={{color: 'var(--color-danger)', fontSize: 11, marginTop: 4, fontWeight: 500}}>{formErrors.email}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 7 }}><Phone size={11} /> Phone</label>
                      <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+880…"
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = `0 0 0 3px ${glow}`; }}
                        onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label htmlFor="home-service" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Service Needed</label>
                      <select id="home-service" style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }} value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = `0 0 0 3px ${glow}`; }}
                        onBlur={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}>
                        <option value="">Select a service</option>
                        {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Your Message *</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6, borderColor: formErrors.message ? 'var(--color-danger)' : inputStyle.borderColor }} value={form.message} onChange={e => {setForm(f => ({ ...f, message: e.target.value })); setFormErrors(e => ({...e, message: ''}))}} placeholder="Tell us about your project — genre, reference tracks, deadline, any special requirements…" required rows={4}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = `0 0 0 3px ${glow}`; }}
                      onBlur={e => { e.currentTarget.style.borderColor = formErrors.message ? 'var(--color-danger)' : border; e.currentTarget.style.boxShadow = 'none'; }} />
                    {formErrors.message && <div style={{color: 'var(--color-danger)', fontSize: 11, marginTop: 4, fontWeight: 500}}>{formErrors.message}</div>}
                  </div>

                  {status === 'error' && (
                    <div style={{ padding: '11px 15px', borderRadius: 12, background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)', fontSize: 13, color: 'var(--color-danger)' }}>
                      Something went wrong. Please try WhatsApp or email us directly.
                    </div>
                  )}

                  <button type="submit" disabled={status !== 'idle'}
                    className="hover-scale"
                    style={{ padding: '15px', borderRadius: 14, background: `linear-gradient(135deg, ${ accent }, ${accentD})`, color: 'var(--card-bg)', border: 'none', fontSize: 15, fontWeight: 800, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: status === 'loading' ? 0.7 : 1, transition: 'opacity 0.2s, transform 0.15s', boxShadow: 'none', marginTop: 4 }}
                  >
                    {status === 'loading' ? 'Sending…' : <><Send size={15} /> Send Message</>}
                  </button>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                    By submitting, you agree to our <Link to="/privacy" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>Privacy Policy</Link>. We never share your information.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
