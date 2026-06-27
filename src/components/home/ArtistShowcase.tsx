import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ArtistShowcaseProps {
  websiteShowcaseLoading: boolean;
  websiteShowcaseItems: any[];
  studioName: string;
}

export function ArtistShowcase({ websiteShowcaseLoading, websiteShowcaseItems, studioName }: ArtistShowcaseProps) {
  const navigate = useNavigate();

  if (websiteShowcaseLoading) {
    return (
      <section className="section" style={{ background: 'var(--surface-1)' }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 100, height: 16, background: 'var(--surface-1)', margin: '0 auto 12px', borderRadius: 4 }} />
            <div style={{ width: 200, height: 40, background: 'var(--border-color)', margin: '0 auto', borderRadius: 8 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ aspectRatio: '1/1', background: 'var(--surface-1)', borderRadius: '16px', animation: 'pulse 2s infinite' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (websiteShowcaseItems.length === 0) {
    return null;
  }

  return (
    <section className="section" style={{ background: 'var(--surface-1)', position: 'relative' }}>
      <div className="section-inner">
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="eyebrow" style={{ color: 'var(--accent-gold)' }}>Hall of Fame</span>
          <h2 className="h2" style={{ margin: '0 0 16px' }}>Artists who trust us.</h2>
          <p className="lead" style={{ margin: '0 auto' }}>A showcase of chart-topping talent powered by {studioName}.</p>
        </motion.div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {websiteShowcaseItems.slice(0, 3).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.15, type: 'spring', bounce: 0.2 }}
              className="showcase-card"
              style={{ background: '#000' }}
              onMouseEnter={(e: any) => { e.currentTarget.querySelector('.showcase-overlay').style.opacity = '1'; }}
              onMouseLeave={(e: any) => { e.currentTarget.querySelector('.showcase-overlay').style.opacity = '0'; }}
            >
              <img src={item.imageUrl} alt={item.artistName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
              <div className="showcase-overlay" style={{
                position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px',
                opacity: 0, transition: 'opacity 0.3s ease'
              }}>
                {item.youtubeUrl && (
                  <a href={item.youtubeUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', color: '#fff', padding: '8px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Play size={14} fill="currentColor" /> Watch
                  </a>
                )}
                <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{item.artistName}</h3>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>{item.projectTitle}</div>
                {item.stats && (
                  <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(255,255,255,0.1)', color: 'var(--accent-gold-light)', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.stats}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {websiteShowcaseItems.length > 3 && (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <button 
              onClick={() => navigate('/portfolio')}
              className="btn btn-secondary" 
              style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              View full showcase
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
