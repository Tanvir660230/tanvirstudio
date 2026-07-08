/* eslint-disable @typescript-eslint/no-unused-vars */
import { Global, css } from '@emotion/react';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  ArrowLeft, Check, Copy, ShoppingCart, MessageCircle,
  Mic, Sliders, Headphones, Music2, Video, Film, Monitor,
  Scissors, Palette, FileText, Zap, Layers, Code2, BookOpen,
  ArrowRight, Clock, RefreshCw, X, ChevronUp, Star, Award, ShieldCheck
} from 'lucide-react';
import { SEO } from '../components/SEO';

const font = "var(--font-sans)";

type LIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const ICON_MAP: Record<string, LIcon> = {
  Mic, Sliders, Headphones, Music2, Video, Film, Monitor,
  Scissors, Palette, FileText, Zap, Layers, Code2, BookOpen,
};
const resolveIcon = (name: string): LIcon => ICON_MAP[name] ?? Sliders;

const toSlug = (s: string) =>
  (s || '').toLowerCase().replace(/[&']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

const CAT_COLOR: Record<string, { d: string; l: string; bg: string; border: string }> = {
  audio:    { d: 'var(--accent-gold-light)', l: 'var(--accent-gold)', bg: 'rgba(217,173,98,0.08)', border: 'rgba(217,173,98,0.2)' },
  video:    { d: '#5b9fff', l: '#1a6fd4', bg: 'rgba(91,159,255,0.08)', border: 'rgba(91,159,255,0.2)' },
  software: { d: '#34d18a', l: '#1a7a4d', bg: 'rgba(52,209,138,0.08)', border: 'rgba(52,209,138,0.2)' },
  content:  { d: '#d06adc', l: '#8c2d9c', bg: 'rgba(208,106,220,0.08)', border: 'rgba(208,106,220,0.2)' },
};

const CAT_LABEL: Record<string, string> = {
  audio: 'Audio Production', video: 'Video & Content', software: 'Software & Automation', content: 'Creative & Content',
};

const SERVICE_FEATURES: Record<string, string[]> = {
  mixing:     ['Professional vocal EQ & compression', 'De-essing & breath control', 'Spatial reverb & depth design', 'Mastering to streaming loudness standards', 'WAV + MP3 delivery', 'Revisions included'],
  sound:      ['Custom cinematic textures & atmospheres', 'Brand-specific sound identity', 'High-resolution audio source files', 'Multiple variation exports', 'Commercial use license'],
  podcast:    ['Noise reduction & room treatment removal', 'Breath, pause & filler cleanup', 'Intro/outro polishing', 'Loudness normalization', 'MP3 delivery for all platforms'],
  score:      ['Original composition from your brief', 'Full orchestral or minimal arrangement', 'Sync-ready stems per instrument', 'Unlimited revisions on Elite tier', 'Licensed for video use'],
  islamicfx:  ['Curated reverb & atmosphere packs', 'Maqam-specific vocal layers', 'Ready to use in any DAW', 'Organized by mood & tempo', 'Lifetime access included'],
  'nasheed-vid': ['Cinematic color grading', 'Cuts synchronized to music', 'Arabic & English text overlays', '4K export ready', 'Vertical + horizontal formats'],
  lyric:      ['Kinetic typography animation', 'Arabic & English text support', 'Brand color palette applied', 'Smooth transitions & motion', 'YouTube-optimized export'],
  trailer:    ['High-impact opening sequence', 'Dynamic cinematic transitions', 'Soundtrack & SFX integration', '4K resolution output', 'Multiple aspect ratios'],
  reels:      ['Optimized 60-second cut', 'Captions & subtitles included', 'Trending transitions applied', 'Audio optimized for social media', 'MP4 ready to post'],
  motion:     ['Animated logo & intro sequence', 'Lower thirds & name tags', 'Brand color system applied', 'Multiple format exports', 'After Effects source file'],
  website:    ['Custom React or Next.js build', 'Client portal & CMS dashboard', 'Firebase realtime backend', 'Mobile-responsive design', 'SEO optimized structure', 'Domain & hosting guidance'],
  automation: ['WhatsApp & email automation', 'Custom order tracking system', 'Google Drive integration', 'No-code or full-code solutions', 'Training & documentation'],
  presets:    ['Professional-grade preset library', 'Vocal mixing & mastering chains', 'Compatible with major DAWs', 'PDF installation guide included'],
  workflow:   ['Built for studio operations', 'Exportable templates & tools', 'Custom branding applied', 'Ongoing support package'],
  systems:    ['Full production infrastructure', 'Custom software & automation', 'Team onboarding & training', 'SLA support contract', 'Scalable architecture'],
  thumb:      ['High-CTR composition design', 'Face + text overlay system', 'A/B testing variants provided', 'PSD + PNG delivery'],
  script:     ['Research-backed Islamic content', 'Authentic language & references', 'SEO-optimized structure', 'Multiple format exports'],
  branding:   ['Complete visual identity system', 'Channel art, profile, banner', 'Color palette & typography guide', 'Full social media kit'],
  youtube:    ['Channel SEO audit & optimization', 'Keyword research for Islamic content', 'Upload checklist & growth strategy', 'Monthly reporting'],
};

const CAT_PROCESS: Record<string, { n: string; title: string; desc: string }[]> = {
  audio: [
    { n: '1', title: 'Send Raw Files', desc: 'Upload your vocals, reference tracks, and any notes about your vision using our secure link.' },
    { n: '2', title: 'We Produce', desc: 'Our engineers craft your sound using industry-grade tools with attention to detail.' },
    { n: '3', title: 'Review & Revise', desc: 'Listen to the draft, share your feedback, and we perfect it together until you love it.' },
    { n: '4', title: 'Final Delivery', desc: 'Receive your master in WAV, MP3, and any platform-specific format you need.' },
  ],
  video: [
    { n: '1', title: 'Brief & Footage', desc: 'Share your footage, concept notes, and reference videos through our upload link.' },
    { n: '2', title: 'Edit & Grade', desc: 'Our team crafts your video with cinematic precision, color grading, and sound design.' },
    { n: '3', title: 'Review & Refine', desc: 'Watch the draft, give notes, and we polish every cut until it is exactly right.' },
    { n: '4', title: 'Export & Deliver', desc: 'Receive your video in the resolution and format you need for every platform.' },
  ],
  software: [
    { n: '1', title: 'Discovery', desc: 'We map your requirements, goals, and technical constraints in a briefing session.' },
    { n: '2', title: 'Design & Build', desc: 'We design, develop, and test your custom solution using modern technology.' },
    { n: '3', title: 'Review & Refine', desc: 'Test the product yourself, share feedback, and we refine until everything is perfect.' },
    { n: '4', title: 'Launch', desc: 'We launch your product, provide full documentation, and hand over all source files.' },
  ],
  content: [
    { n: '1', title: 'Brief & Research', desc: 'We research your niche, audience, and craft a targeted content strategy just for you.' },
    { n: '2', title: 'Create & Design', desc: 'We produce your content assets with creativity, precision, and authentic values.' },
    { n: '3', title: 'Review & Revise', desc: 'Review the work, share your thoughts, and we make any adjustments you need.' },
    { n: '4', title: 'Deliver & Support', desc: 'We deliver all files in your preferred format and support your implementation.' },
  ],
};

const AUDIO_GRID = [
  { id: 'mixing',    icon: 'Sliders',   title: 'Vocal Mixing & Mastering', desc: 'Industry-grade processing for pristine, radio-ready vocals.',    from: 1999 },
  { id: 'sound',     icon: 'Music2',    title: 'Sound Design',             desc: 'Cinematic textures, ambiences and signature sonic identities.', from: 2500 },
  { id: 'podcast',   icon: 'Mic',       title: 'Podcast Editing',          desc: 'Clean, polished episodes ready for every major platform.',      from: 999  },
  { id: 'score',     icon: 'Headphones',title: 'Background Score',         desc: 'Custom instrumental compositions for any visual production.',   from: 3000 },
  { id: 'islamicfx', icon: 'Layers',    title: 'Islamic FX Pack',          desc: 'Curated reverbs, atmospheres and authentic production elements.', from: 799 },
];
const VIDEO_GRID = [
  { id: 'nasheed-vid', icon: 'Film',    title: 'Nasheed Video Editing',  desc: 'Cinematic edits that elevate your music and message visually.',      from: 3500 },
  { id: 'lyric',       icon: 'FileText',title: 'Lyric Video',            desc: 'Premium kinetic typography and animated lyric experiences.',         from: 2500 },
  { id: 'trailer',     icon: 'Video',   title: 'Cinematic Trailer',       desc: 'High-impact teasers and trailers for releases and campaigns.',       from: 4500 },
  { id: 'reels',       icon: 'Scissors',title: 'Reels Editing',          desc: 'Viral-optimized short-form content for every social platform.',      from: 1500 },
  { id: 'motion',      icon: 'Zap',     title: 'Motion Graphics',        desc: 'Animated logos, intros, lower thirds and brand motion elements.',    from: 2000 },
];
const SOFTWARE_GRID = [
  { id: 'website',    icon: 'Monitor', title: 'Studio Website',       desc: 'Premium artist websites with booking, portfolio and CMS systems.',  from: 15000 },
  { id: 'automation', icon: 'Zap',     title: 'Automation Systems',   desc: 'Custom workflow automation built for modern content creators.',     from: 8000  },
  { id: 'presets',    icon: 'Sliders', title: 'Audio Presets',        desc: 'Professional mixing and mastering preset libraries.',               from: 1200  },
  { id: 'workflow',   icon: 'Code2',   title: 'Workflow Tools',       desc: 'Purpose-built digital tools for efficient studio operations.',      from: 5000  },
  { id: 'systems',    icon: 'Layers',  title: 'Creative Systems',     desc: 'End-to-end creative production infrastructure for studios.',        from: 20000 },
];
const CONTENT_GRID = [
  { id: 'thumb',    icon: 'Palette',  title: 'Thumbnail Design',       desc: 'High-CTR thumbnails engineered for maximum visual impact.',       from: 800  },
  { id: 'script',   icon: 'BookOpen', title: 'Islamic Script Writing', desc: 'Authentic, researched content written for Islamic media.',        from: 1500 },
  { id: 'branding', icon: 'Layers',   title: 'Channel Branding',       desc: 'Complete visual identity and branding systems for channels.',     from: 5000 },
  { id: 'youtube',  icon: 'Film',     title: 'YouTube Optimization',   desc: 'SEO, content strategy and growth systems for creator channels.', from: 3000 },
];
const ALL_FALLBACK: Record<string, typeof AUDIO_GRID> = {
  audio: AUDIO_GRID, video: VIDEO_GRID, software: SOFTWARE_GRID, content: CONTENT_GRID,
};

type Tier = 'basic' | 'standard' | 'premium';

export function ServiceDetail() {
  const { cat = 'audio', slug = '' } = useParams<{ cat: string; slug: string }>();
  const navigate = useNavigate();
  const { websiteServices, websiteServicesLoading } = useData();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const [copied, setCopied] = useState(false);
  const [activeTier, setActiveTier] = useState<Tier>('basic');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--bg-color)';
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { document.body.style.backgroundColor = ''; window.removeEventListener('scroll', handleScroll); };
  }, []);


  const themeAccent = CAT_COLOR[cat]?.d ?? 'var(--accent-gold-light)';
  const themeLight = CAT_COLOR[cat]?.bg ?? 'rgba(217,173,98,0.08)';
  const catLabel = CAT_LABEL[cat] ?? 'Production';
  const bg     = 'var(--bg-color)';
  const panel  = 'var(--surface-1)';
  const border = 'var(--border-color)';

  const allFirestore = websiteServices.filter((s: any) => s.category === cat && s.active !== false && s.active !== 'false');
  const fsService = allFirestore.find((s: any) => (s.slug ?? toSlug(s.title ?? '')) === slug || s.id === slug);
  const fbGrid = ALL_FALLBACK[cat] ?? AUDIO_GRID;
  const fbService = fbGrid.find(s => s.id === slug || toSlug(s.title) === slug);

  const getPackages = (src: any, isFb = false) => {
    const rawPrice = src.price || src.from;
    const basePrice = typeof rawPrice === 'number' ? rawPrice : parseInt(String(rawPrice ?? '0').replace(/[^0-9]/g, ''), 10) || 0;
    const feat = isFb ? (SERVICE_FEATURES[src.id] ?? SERVICE_FEATURES[slug] ?? []) : (Array.isArray(src.features) ? src.features : (typeof src.features === 'string' ? src.features.split('\n').filter(Boolean) : []));

    if (src.packages?.basic && src.packages?.standard && src.packages?.premium) {
      const p = { ...src.packages };
      (['basic', 'standard', 'premium'] as Tier[]).forEach(t => {
        if (p[t]) {
          p[t].featuresList = Array.isArray(p[t].features) ? p[t].features : (typeof p[t].features === 'string' ? p[t].features.split('\n').filter(Boolean) : []);
          p[t].sampleUrl = p[t].sampleUrl || '';
        } else {
          p[t] = { name: t.charAt(0).toUpperCase() + t.slice(1), price: basePrice, originalPrice: '', delivery: '5 Days', revisions: '3', desc: '', featuresList: feat, sampleUrl: '' };
        }
      });
      return p;
    }
    
    return {
      basic:    { name: 'Basic',    price: basePrice,                    originalPrice: '', delivery: '3 Days', revisions: '1',         desc: 'Essential entry-level package.',                         featuresList: feat.slice(0, 3),                                                        sampleUrl: '' },
      standard: { name: 'Standard', price: Math.floor(basePrice * 1.5), originalPrice: '', delivery: '5 Days', revisions: '3',         desc: 'The most popular choice with advanced features.',        featuresList: [...feat, 'Source Files'],                                               sampleUrl: '' },
      premium:  { name: 'Premium',  price: Math.floor(basePrice * 2.5), originalPrice: '', delivery: '7 Days', revisions: 'Unlimited', desc: 'Full VIP experience with priority support.',              featuresList: [...feat, 'Source Files', 'Priority Support', 'Commercial License'],    sampleUrl: '' },
    };
  };

  const service = useMemo(() => fsService
    ? {
        id: fsService.id,
        slug: fsService.slug ?? toSlug(fsService.title || ''),
        title: fsService.title,
        desc: fsService.description || fsService.desc || '',
        about: fsService.about || '',
        metaTitle: fsService.metaTitle || '',
        metaDesc: fsService.metaDesc || '',
        Icon: resolveIcon(fsService.icon || ''),
        coverImage: fsService.coverImage || '',
        packages: getPackages(fsService),
      }
    : fbService
    ? {
        id: fbService.id,
        slug: slug || '',
        title: fbService.title || '',
        desc: fbService.desc || '',
        about: '',
        Icon: resolveIcon(fbService.icon || ''),
        coverImage: '',
        packages: getPackages(fbService, true),
      }
    : null, [fsService, fbService, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const relatedFb = fbGrid.filter(s => s.id !== (service?.id ?? slug)).slice(0, 3);
  const relatedFs = allFirestore.filter((s: any) => (s.slug ?? toSlug(s.title ?? '')) !== slug && s.id !== (service?.id ?? '')).slice(0, 3);
  const related = relatedFs.length >= 2 ? relatedFs : relatedFb;

  // Redirect to /services if service not found (must be after service is computed)
  useEffect(() => {
    if (!websiteServicesLoading && !service) navigate('/services', { replace: true });
  }, [websiteServicesLoading, service, navigate]);

  const process = CAT_PROCESS[cat] ?? CAT_PROCESS.audio;
  const waNumber = (settings?.socialWhatsapp || settings?.studioPhone || '').replace(/[^0-9]/g, '');
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in your ${service?.title ?? 'service'}. Can we discuss the details?`)}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/services/${cat}/${slug}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const placeOrder = (tier: Tier) => {
    if (!service) return;
    const p = service.packages[tier];
    const pkg = { name: `${service.title} (${p.name})`, price: `৳${Number(p.price).toLocaleString()}`, features: p.featuresList, delivery: p.delivery, line: p.desc };
    sessionStorage.setItem('pendingPackage', JSON.stringify(pkg));
    navigate(user ? '/dashboard' : '/login');
  };

  if (websiteServicesLoading) {
    return (
      <div style={{ background: bg, minHeight: '100vh', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!service) return null;

  const Icon = service.Icon;
  const activePkg = service.packages[activeTier];
  const featuresUnion = Array.from(new Set([
    ...(service.packages.basic.featuresList ?? []),
    ...(service.packages.standard.featuresList ?? []),
    ...(service.packages.premium.featuresList ?? []),
  ]));

  const renderPricingCard = (isMobile = false) => (
    <div style={{ background: `linear-gradient(160deg, var(--surface-1), var(--bg-color))`, borderRadius: isMobile ? '28px 28px 0 0' : 24, border: isMobile ? 'none' : `1px solid var(--border-color)`, padding: '32px 28px', boxShadow: isMobile ? 'none' : `0 24px 48px rgba(0,0,0,0.1)`, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
      
      {/* Decorative Glow */}
      <div style={{ position: 'absolute', top: -100, left: -100, width: 200, height: 200, background: `radial-gradient(circle, ${themeAccent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 12, padding: 4, marginBottom: 24, position: 'relative', border: `1px solid ${border}` }}>
        {(['basic', 'standard', 'premium'] as Tier[]).map((t) => (
          <button key={t} onClick={() => setActiveTier(t)}
            style={{ flex: 1, padding: '12px 0', border: 'none', background: 'transparent', color: activeTier === t ? 'var(--card-bg)' : 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', position: 'relative', zIndex: 2, transition: 'color 0.3s ease' }}>
            {t}
            {t === 'standard' && (
              <span style={{ position: 'absolute', top: -8, right: '50%', transform: 'translateX(50%)', background: 'var(--color-warning)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 100, letterSpacing: '0.05em' }}>POPULAR</span>
            )}
          </button>
        ))}
        <motion.div
          layoutId={isMobile ? "activeTierMobile" : "activeTierDesktop"}
          initial={false}
          animate={{ x: activeTier === 'basic' ? '0%' : activeTier === 'standard' ? '100%' : '200%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          style={{ position: 'absolute', top: 4, left: 4, width: 'calc(33.333% - 2.66px)', height: 'calc(100% - 8px)', background: `linear-gradient(135deg, ${themeAccent}, ${themeAccent}dd)`, borderRadius: 10, zIndex: 1, boxShadow: 'none' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTier} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{activePkg.name}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{activePkg.desc}</p>
              {activePkg.sampleUrl && (
                <div style={{ marginTop: 16 }}>
                  {(activePkg.sampleUrl.includes('youtube.com') || activePkg.sampleUrl.includes('youtu.be')) ? (
                    <iframe
                      width="100%"
                      height="200"
                      src={
                        activePkg.sampleUrl.includes('list=') 
                          ? `https://www.youtube.com/embed/videoseries?list=${activePkg.sampleUrl.split('list=')[1].split('&')[0]}`
                          : activePkg.sampleUrl.includes('v=')
                          ? `https://www.youtube.com/embed/${activePkg.sampleUrl.split('v=')[1].split('&')[0]}`
                          : activePkg.sampleUrl.includes('youtu.be/')
                          ? `https://www.youtube.com/embed/${activePkg.sampleUrl.split('youtu.be/')[1].split('?')[0]}`
                          : `https://www.youtube.com/embed/${activePkg.sampleUrl.split('/').pop()?.split('?')[0] || ''}`
                      }
                      onError={(e) => { (e.currentTarget as HTMLIFrameElement).style.display = 'none'; }}
                      title="Sample"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ borderRadius: 12, border: '1px solid var(--border-color)' }}
                    ></iframe>
                  ) : (
                    <a href={activePkg.sampleUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#FF0000', textDecoration: 'none', background: 'rgba(255,0,0,0.1)', padding: '6px 12px', borderRadius: 100, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,0,0,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'}>
                      â–¶ See Sample
                    </a>
                  )}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Price</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
                {activePkg.originalPrice && Number(activePkg.originalPrice) > Number(activePkg.price) && (
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>৳{Number(activePkg.originalPrice).toLocaleString()}</span>
                )}
                <span>৳{Number(activePkg.price).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, padding: '16px', background: themeLight, borderRadius: 12, border: `1px solid ${themeAccent}33` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              <Clock size={16} color={themeAccent} /> {activePkg.delivery} Delivery
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              <RefreshCw size={16} color={themeAccent} /> {activePkg.revisions} Revisions
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              Included Features <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activePkg.featuresList.filter((f: string) => f.trim()).map((f: string, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${themeAccent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={12} color={themeAccent} strokeWidth={4} />
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.4, fontWeight: 500 }}>{f}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <button onClick={() => placeOrder(activeTier)}
            style={{ width: '100%', padding: '18px', borderRadius: 14, background: `linear-gradient(135deg, ${themeAccent}, ${themeAccent}dd)`, color: '#ffffff', border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 8px 24px ${themeAccent}40`, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative', overflow: 'hidden' }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${themeAccent}66`; }} 
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 24px ${themeAccent}40`; }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')} onMouseUp={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
          >
            <div className="sd-btn-shimmer" style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', zIndex: 1, pointerEvents: 'none' }} />
            <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingCart size={20} /> Book a Session
            </span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: font, color: 'var(--text-primary)' }}>
      <Global styles={css`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 ${themeAccent}66; } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes shimmer-sweep { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(100%) skewX(-15deg); } }
        
        .sd-btn-shimmer { animation: shimmer-sweep 3s infinite; }
        
        .sd-nav { position: fixed; top: 0; left: 0; right: 0; padding: 20px 24px; z-index: 50; transition: background 0.3s, border 0.3s; }
        .sd-nav.scrolled { background: rgba(var(--bg-color-rgb, 10,10,10), 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); }

        @media (max-width: 1024px) {
          .sd-desktop-sidebar { display: none !important; }
          .sd-main-col { width: 100% !important; max-width: 100% !important; }
        }
        @media (min-width: 1025px) {
          .sd-mobile-action-bar { display: none !important; }
        }
        @media (max-width: 768px) {
          .sd-process-grid { display: flex !important; flex-direction: column !important; gap: 24px !important; }
          .sd-process-line { display: none !important; }
          .sd-related-grid { grid-template-columns: 1fr !important; }
          .sd-comparison-table { overflow-x: auto; }
        }
        
        /* Table enhancements */
        .sd-table-row { transition: background 0.2s; }
        .sd-table-row:hover { background: var(--surface-1); }
      `} />
      
      <SEO 
        title={service.metaTitle || `${service.title} | Tanvir Studio`} 
        description={service.metaDesc || service.desc} 
        url={`https://tanvir.studio/services/${cat}/${slug}`} 
        image={service.coverImage || undefined}
      />

      {/* Top Navigation */}
      <div className={`sd-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate(`/services/${cat}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, padding: 0, transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: panel, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${border}` }}>
              <ArrowLeft size={16} />
            </div>
            Back to {catLabel}
          </button>
          <button onClick={copyLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 100, border: `1px solid ${copied ? themeAccent : border}`, background: copied ? `${themeAccent}14` : panel, color: copied ? themeAccent : 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            {copied ? 'Link Copied!' : 'Share Gig'}
          </button>
        </div>
      </div>

      {/* Hero Background Mesh */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 600, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -150, left: '20%', width: 600, height: 600, background: `radial-gradient(circle, ${themeAccent}11 0%, transparent 70%)`, filter: 'blur(60px)' }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '140px 24px 120px', display: 'flex', gap: 48, position: 'relative', zIndex: 1 }}>
        
        {/* â”€â”€ LEFT COLUMN (65%) â”€â”€ */}
        <div className="sd-main-col" style={{ width: '65%' }}>
          
          {/* Title & Ratings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: themeLight, color: themeAccent, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, border: `1px solid ${themeAccent}33` }}>
              <Icon size={14} strokeWidth={2.5} /> {catLabel}
            </div>
            <h1 style={{ margin: '0 0 24px', fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{service.title}</h1>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-warning)', fontSize: 15, fontWeight: 800 }}>
                <Star size={18} fill="currentColor" /> 5.0 <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>(Trusted Studio)</span>
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 14, fontWeight: 700 }}>
                <Award size={16} /> Top Rated Seller
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
                <ShieldCheck size={16} /> Secure Payment
              </div>
            </div>

            {/* Premium Visual Frame */}
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 28, background: `linear-gradient(145deg, ${panel}, var(--bg-color))`, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 56, position: 'relative', overflow: 'hidden', boxShadow: 'none', cursor: service.coverImage ? 'pointer' : 'default' }}>
              {service.coverImage ? (
                <img src={service.coverImage} alt={service.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
              ) : (
                <>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `radial-gradient(${themeAccent}33 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, transparent 0%, var(--bg-color) 100%)` }} />
                  
                  <div style={{ width: 100, height: 100, borderRadius: 32, background: `${themeAccent}1a`, border: `1px solid ${themeAccent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: 'none', animation: 'pulse-glow 3s infinite', zIndex: 1 }}>
                    <Icon size={48} color={themeAccent} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8, zIndex: 1, textAlign: 'center' }}>{service.title}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: themeAccent, letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 1 }}>Professional Service</div>
                </>
              )}
            </div>
          </motion.div>

          {/* About */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ marginBottom: 64 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>About This Gig</h2>
            <div style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.8, background: panel, padding: 32, borderRadius: 24, border: `1px solid ${border}` }}>
              {(service.about || service.desc || "Professional service tailored to your exact requirements. We ensure high-quality delivery with attention to detail and industry-standard practices.").split('\n').map((para: string, i: number) => (
                para.trim() ? <p key={i} style={{ margin: '0 0 16px' }}>{para}</p> : <div key={i} style={{ height: 12 }} />
              ))}
            </div>
          </motion.section>

          {/* Comparison Table */}
          <motion.section className="sd-comparison-table" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, letterSpacing: '-0.02em' }}>Compare Packages</h2>
            <div style={{ border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', background: panel, boxShadow: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th style={{ padding: '24px', width: '25%', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-color)' }}>Package details</th>
                    {(['basic', 'standard', 'premium'] as Tier[]).map(t => (
                      <th key={t} style={{ padding: '24px 16px', width: '25%', textAlign: 'center', background: t === 'standard' ? themeLight : 'transparent', borderLeft: `1px solid ${border}`, borderRight: t === 'standard' ? `1px solid ${border}` : 'none', position: 'relative' }}>
                        {t === 'standard' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: themeAccent }} />}
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'capitalize' }}>{service.packages[t].name}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: themeAccent }}>৳{Number(service.packages[t].price).toLocaleString()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="sd-table-row" style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '20px 24px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Delivery Time</td>
                    {(['basic', 'standard', 'premium'] as Tier[]).map(t => (
                      <td key={t} style={{ padding: '20px 16px', textAlign: 'center', fontSize: 15, color: 'var(--text-secondary)', background: t === 'standard' ? themeLight : 'transparent', borderLeft: `1px solid ${border}`, borderRight: t === 'standard' ? `1px solid ${border}` : 'none', fontWeight: 600 }}>{service.packages[t].delivery}</td>
                    ))}
                  </tr>
                  <tr className="sd-table-row" style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '20px 24px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Revisions</td>
                    {(['basic', 'standard', 'premium'] as Tier[]).map(t => (
                      <td key={t} style={{ padding: '20px 16px', textAlign: 'center', fontSize: 15, color: 'var(--text-secondary)', background: t === 'standard' ? themeLight : 'transparent', borderLeft: `1px solid ${border}`, borderRight: t === 'standard' ? `1px solid ${border}` : 'none', fontWeight: 600 }}>{service.packages[t].revisions}</td>
                    ))}
                  </tr>
                  {featuresUnion.map((f, i, arr) => (
                    <tr key={i} className="sd-table-row" style={{ borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${border}` }}>
                      <td style={{ padding: '20px 24px', fontSize: 15, color: 'var(--text-secondary)' }}>{f}</td>
                      {(['basic', 'standard', 'premium'] as Tier[]).map(t => (
                        <td key={t} style={{ padding: '20px 16px', textAlign: 'center', background: t === 'standard' ? themeLight : 'transparent', borderLeft: `1px solid ${border}`, borderRight: t === 'standard' ? `1px solid ${border}` : 'none' }}>
                          {service.packages[t].featuresList.includes(f) 
                            ? <Check size={20} color={themeAccent} strokeWidth={3} style={{ margin: '0 auto' }} />
                            : <span style={{ color: 'var(--border-color)', fontSize: 20, fontWeight: 300 }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '24px', borderTop: `1px solid ${border}` }}></td>
                    {(['basic', 'standard', 'premium'] as Tier[]).map(t => (
                      <td key={t} style={{ padding: '24px 16px', textAlign: 'center', background: t === 'standard' ? themeLight : 'transparent', borderLeft: `1px solid ${border}`, borderRight: t === 'standard' ? `1px solid ${border}` : 'none', borderTop: `1px solid ${border}` }}>
                        <button onClick={() => { setActiveTier(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{ padding: '10px 20px', borderRadius: 100, border: `1px solid ${t === 'standard' ? themeAccent : border}`, background: t === 'standard' ? themeAccent : 'transparent', color: t === 'standard' ? 'var(--card-bg)' : 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                          Select {t}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Process Timeline */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 40, letterSpacing: '-0.02em' }}>How It Works</h2>
            <div className="sd-process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, position: 'relative' }}>
              {/* Connecting line for desktop */}
              <div className="sd-process-line" style={{ position: 'absolute', top: 24, left: '12%', right: '12%', height: 2, background: `linear-gradient(to right, ${themeAccent}40, ${themeAccent}10)`, zIndex: 0 }} />
              
              {process.map((step, i) => (
                <div key={step.n} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: panel, border: `2px solid ${themeAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: themeAccent, marginBottom: 20, boxShadow: 'none', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = `${themeAccent}1a`; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = panel; }}
                  >
                    {step.n}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.2 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Related Services */}
          {related.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, letterSpacing: '-0.02em' }}>Recommended For You</h2>
              <div className="sd-related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {related.map((s: any, i: number) => {
                  const relSlug = s.slug ?? toSlug(s.title ?? '');
                  const RelIcon = s.Icon ?? resolveIcon(s.icon ?? '');
                  const relFrom = s.from ?? (typeof s.price === 'number' ? s.price : parseInt(String(s.price ?? '0').replace(/[^0-9]/g, ''), 10));
                  return (
                    <div key={s.id || i} className="sd-related-card" onClick={() => navigate(`/services/${cat}/${relSlug}`)}
                      style={{ background: panel, border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.1)`; e.currentTarget.style.borderColor = themeAccent; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border; }}>
                      <div style={{ height: 120, background: `linear-gradient(135deg, ${themeAccent}22, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${border}` }}>
                        <RelIcon size={40} color={themeAccent} strokeWidth={1.5} style={{ opacity: 0.8 }} />
                      </div>
                      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{s.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{s.desc || s.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${border}` }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Starting From</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color: themeAccent }}>৳{relFrom?.toLocaleString?.() ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

        </div>

        {/* â”€â”€ RIGHT COLUMN (35%) - DESKTOP STICKY SIDEBAR â”€â”€ */}
        <div className="sd-desktop-sidebar" style={{ width: '35%', position: 'relative' }}>
          <div style={{ position: 'sticky', top: 120 }}>
            {renderPricingCard()}
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ marginTop: 20, width: '100%', padding: '16px', borderRadius: 16, background: 'var(--surface-1)', color: '#25d366', border: `1px solid rgba(37,211,102,0.3)`, fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', textDecoration: 'none' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.08)'; e.currentTarget.style.borderColor = '#25d366'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.borderColor = 'rgba(37,211,102,0.3)'; }}
              >
                <MessageCircle size={20} /> Discuss Project via WhatsApp
              </a>
            )}
          </div>
        </div>

      </div>

      {/* â”€â”€ MOBILE FLOATING ACTION BAR â”€â”€ */}
      <div className="sd-mobile-action-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'rgba(var(--bg-color-rgb, 10,10,10), 0.85)', borderTop: `1px solid ${border}`, backdropFilter: 'blur(20px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'none' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>{activePkg.name}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>৳{Number(activePkg.price).toLocaleString()}</div>
        </div>
        <button onClick={() => setIsMobileDrawerOpen(true)}
          style={{ padding: '14px 28px', borderRadius: 100, background: `linear-gradient(135deg, ${themeAccent}, ${themeAccent}dd)`, color: '#ffffff', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', boxShadow: `0 4px 12px ${themeAccent}40`, position: 'relative', overflow: 'hidden' }}>
          <div className="sd-btn-shimmer" style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            Select Package <ChevronUp size={18} />
          </span>
        </button>
      </div>

      {/* â”€â”€ MOBILE BOTTOM SHEET DRAWER â”€â”€ */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000 }}
            />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001, maxHeight: '90vh', overflowY: 'auto', background: panel, borderRadius: '28px 28px 0 0' }}>
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: 40, height: 5, borderRadius: 10, background: 'var(--border-color)' }} />
                <button onClick={() => setIsMobileDrawerOpen(false)} style={{ position: 'absolute', right: 16, top: 12, width: 32, height: 32, borderRadius: 16, background: 'var(--bg-color)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              {renderPricingCard(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
