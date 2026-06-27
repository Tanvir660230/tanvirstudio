import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail } from 'lucide-react';

interface HomeCtaProps {
  studioName: string;
  waLink: string;
  settings: any;
  scrollTo: (id: string) => void;
}

export function HomeCta({ studioName, waLink, settings, scrollTo }: HomeCtaProps) {
  return (
    <section className="section" style={{ textAlign: 'center', background: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '300px', background: `radial-gradient(ellipse, rgba(217,173,98,0.3) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 800, letterSpacing: '-0.035em', margin: '0 0 16px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
          Ready to elevate your sound?
        </h2>
        <p style={{ fontSize: '17px', color: 'var(--text-secondary)', margin: '0 auto 44px', lineHeight: 1.6, maxWidth: '420px' }}>
          Join artists who trust {studioName} for world-class Nasheed and vocal production.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => scrollTo('packages')}
            className="btn-primary hover-scale"
          >Start a Project</button>
          {waLink ? (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="hover-scale"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#25d366', color: '#FFFFFF', borderRadius: '100px', padding: '14px 26px', fontSize: '15px', fontWeight: 700, boxShadow: 'none', letterSpacing: '-0.01em' }}
            ><MessageCircle size={16} /> Chat on WhatsApp</a>
          ) : settings.studioEmail ? (
            <a href={`mailto:${settings.studioEmail}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--text-primary)', color: 'var(--bg-color)', borderRadius: '100px', padding: '14px 26px', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              <Mail size={16} /> Email Us
            </a>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}
