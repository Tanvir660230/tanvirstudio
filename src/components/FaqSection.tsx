/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';

const font = "var(--font-sans)";
const FAQS = [
  { q: 'What does the price include?', a: 'All prices shown are starting rates. Your final quote will include everything discussed in your brief — mixing, mastering, revisions, and final file formats. No hidden fees.' },
  { q: 'How many revisions do I get?', a: 'It depends on your package. Basic includes 1 revision, Premium includes 3, and Elite includes unlimited revisions. Additional revisions can be added as an add-on.' },
  { q: 'What file formats will I receive?', a: 'We deliver WAV (lossless), MP3 (320kbps), and any platform-specific format you need (e.g. FLAC, AIFF). Stems are available on Elite packages.' },
  { q: 'Do you work with non-Islamic artists?', a: 'Yes! While we specialise in Islamic and Nasheed production, we welcome any artist who values premium sound quality and ethical production values.' },
  { q: 'How do I share my vocals or footage?', a: 'After ordering, you receive a private upload link. You can share files via Google Drive, WeTransfer, or any link-based service.' },
  { q: 'Can I track my project progress?', a: 'Absolutely. Every client gets access to our dashboard where you can view project status, send messages, and approve deliverables at each stage.' },
];

export function FaqSection({ dark, C }: { dark: boolean; C: any }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ padding:'100px 24px', borderTop:'1px solid var(--border-color)' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.6 }} style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--accent-gold-light)', marginBottom:14 }}>FAQ</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.1, margin:0, color:'var(--text-primary)' }}>Common <span style={{ background:'linear-gradient(135deg,#d9ad62,#f0c870)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>questions.</span></h2>
        </motion.div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.06, duration:0.4 }}
              style={{ background:'var(--card-bg)', border:`1px solid ${open===i?'rgba(217,173,98,0.35)':'var(--border-color)'}`, borderRadius:16, overflow:'hidden', transition:'border-color 0.2s' }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', background:'transparent', border:'none', cursor:'pointer', fontFamily:font, textAlign:'left', gap:12 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', letterSpacing:'-0.01em', lineHeight:1.4 }}>{faq.q}</span>
                <span style={{ fontSize:18, color:'var(--accent-gold-light)', flexShrink:0, transform:open===i?'rotate(45deg)':'rotate(0deg)', transition:'transform 0.22s ease', display:'inline-block' }}>+</span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25, ease:[0.4,0,0.2,1] }}>
                    <div style={{ padding:'0 22px 20px', fontSize:14, color:'var(--text-secondary)', lineHeight:1.75 }}>{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

