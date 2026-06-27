import React from 'react';
import { motion } from 'framer-motion';

import { Link } from 'react-router-dom';

export function CaseStudyProof() {
  return (
    <section className="section">
      <div className="section-inner">
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <span className="eyebrow">Proven Results</span>
          <h2 className="h2">Numbers that speak.</h2>
          <p className="lead">Real outcomes from real client projects — not estimates.</p>
        </motion.div>

        <div className="proof-grid">
          {([
            { value: '420K', label: 'Views in 30 days', sub: 'Nasheed EP from raw vocal to YouTube premiere', category: 'Audio Production', color: 'var(--accent-gold-light)' },
            { value: '+61%', label: 'CTR improvement', sub: 'Channel rebrand and thumbnail system for dawah creator', category: 'Video & Content', color: '#5b9fff' },
            { value: '12+', label: 'Admin hours saved/week', sub: 'Studio booking platform replacing WhatsApp chaos', category: 'Software', color: '#34d18a' },
          ] as const).map(({ value, label, sub, category, color }, i) => (
            <Link
              key={category}
              to="/portfolio"
              style={{ textDecoration: 'none', '--card-glow': `${color}22` } as React.CSSProperties}
            >
              <motion.div
                className="proof-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                style={{
                  background: `${color}08`,
                  borderColor: `${color}28`,
                  boxShadow: 'none',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{category}</span>
                <div style={{ fontSize: 'clamp(38px, 5vw, 54px)', fontWeight: 900, letterSpacing: '-0.04em', color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sub}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 4 }}>Read full case study →</div>
              </motion.div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/portfolio" className="hover-opacity-75" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >View our portfolio →</Link>
        </div>
      </div>
    </section>
  );
}
