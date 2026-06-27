import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Global, css } from '@emotion/react';
import { SEO } from '../components/SEO';
import { Check, Info, ArrowRight, Calculator as CalcIcon } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const font = "var(--font-sans)";

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'Audio' | 'Video' | 'Add-ons';
}

const OPTIONS: ServiceOption[] = [
  { id: 'vocal_rec', name: 'Vocal Recording Session', price: 2000, description: '1 Hour professional studio recording with engineer.', category: 'Audio' },
  { id: 'mix_master', name: 'Mixing & Mastering', price: 4500, description: 'Industry standard mix and master for 1 track.', category: 'Audio' },
  { id: 'music_comp', name: 'Original Composition', price: 8000, description: 'Custom backing track/music production.', category: 'Audio' },
  { id: 'humming', name: 'Backing Vocals/Humming', price: 3000, description: 'Professional background vocalists added to your track.', category: 'Audio' },
  
  { id: 'lyric_video', name: 'Lyric Video', price: 3500, description: 'Dynamic animated lyric video (up to 4 mins).', category: 'Video' },
  { id: 'music_video', name: 'Music Video Edit', price: 7000, description: 'Color grading and editing for your music video.', category: 'Video' },
  { id: 'thumbnail', name: 'YouTube Thumbnail', price: 1000, description: 'Click-optimized custom thumbnail design.', category: 'Video' },
  
  { id: 'rush', name: 'Rush Delivery (48 hrs)', price: 2000, description: 'Priority delivery ahead of the normal queue.', category: 'Add-ons' },
  { id: 'stems', name: 'Project Stems Delivery', price: 500, description: 'Get all individual raw tracks (stems).', category: 'Add-ons' },
];

export function Calculator() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const toggleOption = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedOptions = OPTIONS.filter(o => selectedIds.includes(o.id));
  const total = selectedOptions.reduce((sum, item) => sum + item.price, 0);

  const handleProceed = () => {
    const serviceNames = selectedOptions.map(o => o.name).join(', ');
    navigate(`/booking?services=${encodeURIComponent(serviceNames)}`);
  };

  const categories = ['Audio', 'Video', 'Add-ons'] as const;

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', fontFamily: font, color: 'var(--text-primary)', paddingTop: 80 }}>
      <Global styles={css`
        .calc-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .calc-card:hover {
          border-color: rgba(217,173,98,0.4);
        }
        .calc-card.active {
          border-color: var(--accent-gold-light);
          background: rgba(217,173,98,0.05);
        }
        .calc-summary {
          position: sticky;
          top: 100px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
        }
        @media (max-width: 900px) {
          .calc-grid {
            grid-template-columns: 1fr !important;
          }
          .calc-summary {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            border-radius: 24px 24px 0 0;
            border-bottom: none;
            z-index: 100;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
            padding: 20px;
          }
          .calc-content {
            padding-bottom: 240px;
          }
        }
      `} />

      <SEO title="Pricing Calculator | Tanvir Studio" description="Estimate the cost of your audio or video production project instantly." url="https://tanvir.studio/calculator" />

      <div className="calc-content calc-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40 }}>
        
        {/* Left Col: Options */}
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(217,173,98,0.1)', color: 'var(--accent-gold-light)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              <CalcIcon size={14} /> Instant Quote
            </div>
            <h1 className="apple-h1" style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: 16 }}>Project Cost Estimator</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
              Select the services you need below to get a real-time estimate for your project. This helps us understand your needs better before we begin.
            </p>
          </motion.div>

          {categories.map((cat, i) => (
            <motion.div key={cat} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>{cat} Services</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {OPTIONS.filter(o => o.category === cat).map(opt => {
                  const isActive = selectedIds.includes(opt.id);
                  return (
                    <div key={opt.id} className={`calc-card ${isActive ? 'active' : ''}`} onClick={() => toggleOption(opt.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, paddingRight: 10 }}>{opt.name}</div>
                        <div style={{ 
                          width: 20, height: 20, borderRadius: 6, border: `2px solid ${isActive ? 'var(--accent-gold-light)' : 'var(--border-color)'}`, 
                          background: isActive ? 'var(--accent-gold-light)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {isActive && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4, minHeight: 36 }}>{opt.description}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? 'var(--accent-gold-light)' : 'var(--text-primary)' }}>
                        {settings?.currency || 'BDT'} {opt.price.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right Col: Summary */}
        <div style={{ position: 'relative' }}>
          <motion.div className="calc-summary" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              Estimated Total
            </h3>
            
            <div style={{ minHeight: 120, maxHeight: '30vh', overflowY: 'auto', marginBottom: 24 }}>
              {selectedOptions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.6 }}>
                  <CalcIcon size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <div style={{ fontSize: 13 }}>No services selected</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedOptions.map(opt => (
                    <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-secondary)', flex: 1, paddingRight: 12 }}>{opt.name}</span>
                      <span style={{ fontWeight: 600 }}>{opt.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>Total Cost:</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginRight: 6 }}>{settings?.currency || 'BDT'}</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent-gold-light)', letterSpacing: '-0.02em' }}>{total.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handleProceed}
              disabled={selectedOptions.length === 0}
              style={{
                width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                background: selectedOptions.length === 0 ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-gold-light), #8a6422)',
                color: selectedOptions.length === 0 ? 'var(--text-secondary)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: selectedOptions.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s'
              }}
            >
              Book these Services <ArrowRight size={18} />
            </button>
            
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Info size={12} /> This is an estimate, actual costs may vary.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
