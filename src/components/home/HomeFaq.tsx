import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface HomeFaqProps {
  displayFaqs: any[];
}

export function HomeFaq({ displayFaqs }: HomeFaqProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const muted = 'var(--text-secondary)';

  if (!displayFaqs || displayFaqs.length === 0) {
    return null;
  }

  return (
    <section id="faq" className="section">
      <div className="section-inner" style={{ maxWidth: '680px' }}>
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }}>
          <span className="eyebrow">FAQ</span>
          <h2 className="h2">Questions?</h2>
        </motion.div>
        <div style={{ marginTop: '40px' }}>
          {displayFaqs.map((faq: any, index: number) => (
            <div key={index} style={{ borderBottom: `1px solid var(--border-color)` }}>
              <button className="faq-btn" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <span>{faq.q}</span>
                {openFaq === index ? <ChevronUp size={17} color={muted} /> : <ChevronDown size={17} color={muted} />}
              </button>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}>
                    <p style={{ paddingBottom: '24px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
