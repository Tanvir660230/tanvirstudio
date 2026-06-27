import React from 'react';
import { motion } from 'framer-motion';
import { BeforeAfterPlayer } from '../../components/BeforeAfterPlayer';

interface BeforeAfterSectionProps {
  activeComparison: any;
  studioName: string;
}

export function BeforeAfterSection({ activeComparison, studioName }: BeforeAfterSectionProps) {
  if (!activeComparison) return null;

  return (
    <section id="testimonials" className="section" style={{ background: 'var(--surface-1)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'var(--card-bg)',
      }} />
      <div className="section-inner" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <span className="eyebrow">Audio Quality</span>
          <h2 className="h2">Hear the difference.</h2>
          <p className="lead">Toggle between the raw recording and our studio master.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8 }}>
          <BeforeAfterPlayer
            title={activeComparison.title || 'Nasheed Production Example'}
            artist={activeComparison.artist || studioName}
            rawUrl={activeComparison.raw_url}
            masteredUrl={activeComparison.mastered_url}
          />
        </motion.div>
      </div>
    </section>
  );
}
