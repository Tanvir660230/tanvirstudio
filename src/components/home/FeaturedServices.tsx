import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Video, Code, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeaturedServicesProps {
  websitePackages: any[];
  studioName: string;
  studioLogo: string;
}

const CATEGORY_META: Record<string, { gradient: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }> = {
  Audio:    { gradient: 'linear-gradient(135deg, #1c1408 0%, #3d2a0a 60%, #261b08 100%)', Icon: Mic },
  Video:    { gradient: 'linear-gradient(135deg, #080f1c 0%, #0d1f40 60%, #091528 100%)', Icon: Video },
  Software: { gradient: 'linear-gradient(135deg, #071410 0%, #0b2d20 60%, #081a14 100%)', Icon: Code },
  Content:  { gradient: 'linear-gradient(135deg, #130a1c 0%, #2c1040 60%, #1b0928 100%)', Icon: TrendingUp },
};

export function FeaturedServices({ websitePackages, studioName, studioLogo }: FeaturedServicesProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('Audio');

  const getCategory = (name: string = '') => {
    const l = name.toLowerCase();
    if (l.includes('mix') || l.includes('master') || l.includes('audio') || l.includes('record') || l.includes('nasheed') || l.includes('vocal')) return 'Audio';
    if (l.includes('video') || l.includes('edit') || l.includes('cinematic') || l.includes('visual')) return 'Video';
    if (l.includes('web') || l.includes('app') || l.includes('seo') || l.includes('software')) return 'Software';
    if (l.includes('design') || l.includes('content') || l.includes('thumbnail') || l.includes('social') || l.includes('legal')) return 'Content';
    return 'Audio';
  };

  const allPackages = websitePackages?.length ? websitePackages : [];
  const filteredPackages = allPackages.filter((pkg: any) =>
    activeCategory === 'All' ? true : getCategory(pkg.name) === activeCategory
  );

  return (
    <>
      {/* Category filter bar */}
      <div style={{
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        position: 'sticky',
        top: '76px',
        zIndex: 40,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div className="custom-scrollbar" style={{
          display: 'inline-flex',
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '100px',
          padding: '6px',
          gap: '4px',
          overflowX: 'auto',
          maxWidth: '100%'
        }}>
          {[
            { id: 'Audio',    label: 'Audio Production', icon: Mic },
            { id: 'Video',    label: 'Cinematic Video',  icon: Video },
            { id: 'Software', label: 'Web & Software',   icon: Code },
            { id: 'Content',  label: 'Content & SEO',    icon: TrendingUp },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  position: 'relative',
                  padding: '10px 24px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  fontSize: '14.5px',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? 'var(--bg-color)' : 'var(--text-secondary)',
                  transition: 'color 0.3s ease',
                  zIndex: 1,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--text-primary)',
                      borderRadius: '100px',
                      zIndex: -1,
                    }}
                  />
                )}
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'transform 0.3s', transform: isActive ? 'scale(1.05)' : 'scale(1)' }} />
                {cat.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Services grid */}
      <section id="packages" className="section">
        <div className="section-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 className="h2" style={{ margin: 0, textAlign: 'left' }}>Featured Services</h2>
            <button onClick={() => navigate('/services')} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-gold)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}>
              See all →
            </button>
          </div>

          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            <AnimatePresence mode="popLayout">
              {filteredPackages.map((pkg: any, i: number) => {
                const category = getCategory(pkg.name);
                const meta = CATEGORY_META[category] || CATEGORY_META.Audio;
                const CategoryIcon = meta.Icon;

                return (
                  <motion.div
                    layout
                    key={pkg.name || i}
                    onClick={() => navigate(`/services/${category.toLowerCase()}/${pkg.slug || pkg.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="pkg-card"
                    style={{ overflow: 'hidden', cursor: 'pointer', padding: 0 }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderTopLeftRadius: '17px', borderTopRightRadius: '17px' }}>
                      {pkg.image ? (
                        <img
                          src={pkg.image}
                          alt={pkg.name}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                          {/* Subtle radial glow */}
                          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, rgba(196,154,82,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
                          <CategoryIcon size={52} color="rgba(196,154,82,0.35)" strokeWidth={1.2} />
                        </div>
                      )}

                      {pkg.highlight && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '5px 10px', borderRadius: '6px', letterSpacing: '0.06em' }}>
                          PRO
                        </div>
                      )}
                      {pkg.discountText && (
                        <div style={{ position: 'absolute', top: '12px', left: pkg.highlight ? '58px' : '12px', background: 'var(--accent-gold)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '5px 10px', borderRadius: '6px', letterSpacing: '0.06em' }}>
                          BESTSELLER
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        {studioLogo ? (
                          <img src={studioLogo} alt="Logo" loading="lazy" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--bg-color)', fontWeight: 800 }}>
                            {(studioName || 'TS').charAt(0)}
                          </div>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{studioName}</span>
                      </div>

                      <h3 style={{ fontWeight: 800, fontSize: '17px', lineHeight: 1.35, margin: '4px 0 16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {pkg.name}
                      </h3>

                      {pkg.sampleUrl && (
                        <a
                          href={pkg.sampleUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#FF0000', textDecoration: 'none', background: 'rgba(255,0,0,0.08)', padding: '6px 12px', borderRadius: 100, transition: 'background 0.2s', alignSelf: 'flex-start', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,0,0,0.15)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,0,0,0.08)')}
                        >
                          ▶ See Sample
                        </a>
                      )}
                    </div>

                    {/* Footer / Price */}
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '2px', fontWeight: 700 }}>Starting at</span>
                        <span style={{ display: 'block', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{pkg.price}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {filteredPackages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>No services in this category yet.</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
