import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function TestimonialsCarousel({ testimonials }: { testimonials: any[]; }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => setActive(i => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const t = testimonials[active];

  return (
    <section className="section" style={{ background: 'var(--surface-1)' }}>
      <div className="section-inner">
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <span className="eyebrow">Testimonials</span>
          <h2 className="h2">What artists say.</h2>
        </motion.div>

        <div style={{ position: 'relative', minHeight: 180 }}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
            className="testi-feature"
          >
            <div style={{ fontSize: '60px', color: 'var(--accent-gold)', lineHeight: 0.6, marginBottom: '24px', opacity: 0.65, fontFamily: 'Georgia, serif' }}>"</div>
            <p style={{ fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, fontStyle: 'italic', margin: '0 0 32px', maxWidth: '700px' }}>
              {t.text || t.quote}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {t.img
                ? <img src={t.img} alt={t.name} loading="lazy" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>{(t.name || t.author || '?')[0]}</div>
              }
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name || t.author}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.org || t.role}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {testimonials.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
            {testimonials.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Testimonial ${i + 1}`}
                style={{
                  width: i === active ? 24 : 8, height: 8, borderRadius: 100,
                  background: i === active ? 'var(--accent-gold)' : 'var(--border-color)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
