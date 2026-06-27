import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomeHeroProps {
  heroBgImage: string;
  effectiveHasBg: boolean;
  heroBgLoaded: boolean;
  activeComparison: any;
  scrollTo: (id: string) => void;
}

export function HomeHero({ heroBgImage, effectiveHasBg, heroBgLoaded, activeComparison, scrollTo }: HomeHeroProps) {
  const { t } = useLanguage();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 400]);

  return (
    <header id="top" style={{ position: 'relative', width: '100%', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div className="hero-breathing-bg" />
      {/* Background Image */}
      <motion.img 
        src={heroBgImage || "/hero-bg.webp"} alt="" role="presentation" 
        style={{ 
          y,
          position: 'absolute', zIndex: 0, width: '100%', height: '120%', top: '-10%', 
          objectFit: 'cover', opacity: effectiveHasBg && !heroBgLoaded ? 0 : 1, transition: 'opacity 0.6s ease' 
        }} 
      />
      
      {/* Dark Overlay */}
      <div style={{ position: 'absolute', zIndex: 10, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)' }}></div>

      {/* Hero Content */}
      <div style={{ position: 'relative', zIndex: 20, textAlign: 'center', padding: '0 16px', maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          dangerouslySetInnerHTML={{ __html: t('home.heroTitle') }}
          style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '24px' }}>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          style={{ fontSize: 'clamp(18px, 2.5vw, 20px)', color: '#e5e7eb', marginBottom: '40px', maxWidth: '672px', fontWeight: 300, lineHeight: 1.5 }}>
          {t('home.heroSubtitle')}
        </motion.p>
        <motion.div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
          <button onClick={() => scrollTo('packages')} className="hover-scale" style={{ padding: '14px 32px', background: '#FFFFFF', color: '#000000', borderRadius: '999px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '16px', boxShadow: 'none' }}>
            {t('home.bookBtn')}
          </button>
          {activeComparison && (
            <button onClick={() => scrollTo('testimonials')} className="hover-scale" style={{ padding: '14px 32px', background: 'transparent', border: '1px solid #fff', color: '#FFFFFF', borderRadius: '999px', fontWeight: 600, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={14} fill="currentColor" /> {t('home.hearBtn')}
            </button>
          )}
        </motion.div>
      </div>
    </header>
  );
}
