import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Sliders, Headphones } from 'lucide-react';

export function HowItWorks() {
  return (
    <section className="section">
      <div className="section-inner">
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <span className="eyebrow">Process</span>
          <h2 className="h2">How it works.</h2>
          <p className="lead">From your raw recording to a worldwide release — a seamless 3-step journey.</p>
        </motion.div>
        <div className="steps-grid">
          {([
            { n: '01', Icon: Mic, title: 'Send Your Vocals', desc: "Upload your raw recording and any reference tracks. Tell us your vision — we'll take it from there." },
            { n: '02', Icon: Sliders, title: 'We Produce', desc: 'Our engineers handle mixing, mastering, arrangement, and sound design to bring out the best in your voice.' },
            { n: '03', Icon: Headphones, title: 'Ready to Release', desc: 'Download your pristine studio master, ready for Spotify, YouTube, and every major platform.' },
          ] as const).map(({ n, Icon, title, desc }, i) => (
            <motion.div
              key={n} className="step-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--surface-1)', border: `1px solid var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <Icon size={22} color="var(--accent-gold)" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{n}</div>
              <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
