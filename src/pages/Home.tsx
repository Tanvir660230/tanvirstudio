import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { SEO } from '../components/SEO';
import { TestimonialsCarousel } from '../components/home/TestimonialsCarousel';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { HomeHero } from '../components/home/HomeHero';
import { FeaturedServices } from '../components/home/FeaturedServices';
import { BeforeAfterSection } from '../components/home/BeforeAfterSection';
import { HowItWorks } from '../components/home/HowItWorks';
import { StatsSection } from '../components/home/StatsSection';
import { CaseStudyProof } from '../components/home/CaseStudyProof';
import { ArtistShowcase } from '../components/home/ArtistShowcase';
import { HomeFaq } from '../components/home/HomeFaq';
import { HomeCta } from '../components/home/HomeCta';

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const fallbackFaqs = [
  { q: 'How does the process work?', a: 'Select a package, send your raw vocals and references, and we handle the rest. You can track progress right from your client dashboard.' },
  { q: 'What is the turnaround time?', a: 'Standard delivery is 3–7 days depending on the package. You can also request faster priority delivery.' },
  { q: 'Do I own the final master?', a: 'Yes. 100% of the rights remain with you. We just make sure it sounds incredible.' },
];

export function Home() {
  const location = useLocation();
  const { settings } = useSettings();
  const {
    websitePackages,
    websiteTestimonials,
    websiteComparisons,
    websiteShowcase,
    websiteFaqs,
    websiteShowcaseLoading,
    websiteTestimonialsLoading,
  } = useData();

  const studioName = settings.studioName || 'Tanvir Studio';

  const [heroBgLoaded, setHeroBgLoaded] = useState(false);
  const [hasHeroCached] = useState(() => localStorage.getItem('ts_has_hero') === '1');
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    if (!settings.heroBgImage) return;
    localStorage.setItem('ts_has_hero', '1');
    setHeroBgLoaded(false);
    const img = new Image();
    img.onload = () => setHeroBgLoaded(true);
    img.src = settings.heroBgImage;
  }, [settings.heroBgImage]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  const font = settings.fontFamily || 'var(--font-sans)';
  const effectiveHasBg = !!settings.heroBgImage || hasHeroCached;
  const whatsapp = settings.socialWhatsapp || settings.studioPhone || '';
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${studioName}, I want to start a production project.`)}`
    : '';

  const activeComparison = websiteComparisons?.[0] ?? null;
  const displayFaqs = websiteFaqs?.length ? websiteFaqs : fallbackFaqs;

  return (
    <div className="home-container" style={{ fontFamily: font, minHeight: '100vh', transition: 'background 0.4s ease' }}>

      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, var(--accent-gold), var(--color-success))`, transformOrigin: '0%', scaleX: scrollYProgress, zIndex: 9999 }} />

      <SEO
        title="Tanvir Studio - Where Creativity speaks"
        description="Premier Islamic audio and video production studio in Dhaka. Expert nasheed recording, mixing, mastering, and cinematic video production."
        url="https://tanvir.studio"
        canonical="https://tanvir.studio"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "MusicStore",
          "name": "Tanvir Studio",
          "url": "https://tanvir.studio",
          "logo": "https://tanvir.studio/Logo.jpg",
          "description": "Premier Islamic audio and video production studio in Dhaka, Bangladesh.",
          "telephone": settings.studioPhone || "",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "West Shanarpar, Demra",
            "addressLocality": "Dhaka",
            "postalCode": "1361",
            "addressCountry": "BD"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "23.7104",
            "longitude": "90.4795"
          },
          "openingHours": "Mo-Sa 09:00-21:00",
          "priceRange": "৳৳",
          "sameAs": ["https://www.facebook.com/TanvirStudio"]
        }}
      />

      <HomeHero
        heroBgImage={settings.heroBgImage}
        effectiveHasBg={effectiveHasBg}
        heroBgLoaded={heroBgLoaded}
        activeComparison={activeComparison}
        scrollTo={scrollTo}
      />

      <FeaturedServices
        websitePackages={websitePackages}
        studioName={studioName}
        studioLogo={settings?.studioLogo}
      />

      <BeforeAfterSection
        activeComparison={activeComparison}
        studioName={studioName}
      />

      <HowItWorks />

      <StatsSection settings={settings} />

      <CaseStudyProof />

      <ArtistShowcase
        websiteShowcaseLoading={websiteShowcaseLoading}
        websiteShowcaseItems={websiteShowcase}
        studioName={studioName}
      />

      {websiteTestimonialsLoading ? (
        <section className="section" style={{ background: 'var(--surface-1)' }}>
          <div className="section-inner">
            <div style={{ height: 28, width: 180, borderRadius: 8, background: 'var(--surface-1)', opacity: 0.4, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 80, borderRadius: 14, background: 'var(--surface-1)', opacity: 0.3, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </section>
      ) : websiteTestimonials?.filter((t: any) => t.approved !== false)?.length > 0 && (
        <TestimonialsCarousel testimonials={websiteTestimonials.filter((t: any) => t.approved !== false)} />
      )}

      <HomeFaq displayFaqs={displayFaqs} />

      <HomeCta
        studioName={studioName}
        waLink={waLink}
        settings={settings}
        scrollTo={scrollTo}
      />

    </div>
  );
}
