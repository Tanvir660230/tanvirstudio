import React from 'react';
import { motion } from 'framer-motion';
import { CountUp, RawStat } from '../ui/StatsUI';

interface StatsSectionProps {
  settings: any;
}

export function StatsSection({ settings }: StatsSectionProps) {
  return (
    <section className="section" style={{ background: 'var(--surface-1)' }}>
      <div className="section-inner">
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }} style={{ marginBottom: '44px' }}>
          <span className="eyebrow">Impact</span>
          <h2 className="h2">{settings.statsTrustLabel || '10 years of trust.'}</h2>
        </motion.div>
        <div className="stats-band">
          {[
            { val: settings.statsProjects || 999, suffix: '+', label: 'Projects Completed', isNum: true as const },
            { val: settings.statsArtists || 99, suffix: '+', label: 'Partnered Artists', isNum: true as const },
            { raw: settings.statsViews || '1B+', label: 'Global Streams & Views', isNum: false as const },
            { raw: (() => { const n = new Date(); const y = n.getFullYear() - 2018 - (n.getMonth() < 9 ? 1 : 0); return `${y}+`; })(), label: 'Years Experience', isNum: false as const },
          ].map((s, i) => (
            <motion.div
              key={i} className="stat-cell"
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: i * 0.11, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ fontSize: 'clamp(34px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '8px' }}>
                {s.isNum
                  ? <CountUp value={s.val} suffix={s.suffix} delay={i * 110} />
                  : <RawStat value={s.raw} delay={i * 110} />}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
