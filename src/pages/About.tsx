import { Global, css } from '@emotion/react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { Mic2, Video, Cpu, Music2, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import { SEO } from '../components/SEO';

const accent = 'var(--accent-gold)';

function WaveBars({ color }: { color: string }) {
  const bars = Array.from({ length: 32 });
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden', opacity: 0.07, pointerEvents: 'none' }}>
      {bars.map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.65 + 1.2) * 160);
        const delay = (i * 0.1) % 1.6;
        return (
          <motion.div
            key={i}
            style={{ width: 3, borderRadius: 6, background: color, flexShrink: 0 }}
            animate={{ height: [h * 0.3, h, h * 0.4, h * 0.8, h * 0.3] }}
            transition={{ duration: 2.4 + (i % 5) * 0.3, repeat: Infinity, delay, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

const FALLBACK_TIMELINE = [
  { id: 't1', year: 'October 2018', title: 'The First Breath', desc: 'A childhood curiosity turned into action. Tanvir Studio took its first breath as a modest home setup near Darunnazat Madrasha in Demra.', color: 'var(--accent-gold)' },
  { id: 't2', year: '2020', title: 'First Professional Space', desc: 'As our dedication deepened, we moved into our first dedicated professional studio space.', color: '#b08a42' },
  { id: 't3', year: 'February 2023', title: 'The Studio Today', desc: 'We completely reimagined our setup and launched our current state-of-the-art studio in West Shanarpar — a premier creative sanctuary.', color: '#d4aa62' },
];

function AboutContactRow({ settings, accent }: { settings: any; accent: string }) {
  const items = [
    { icon: <MapPin size={16} color={accent} />, label: 'Studio Address', content: settings.studioAddress || '', href: 'https://maps.app.goo.gl/P7rFTzLM2bxbRbP37', linkLabel: 'View on Maps' },
    { icon: <Mail size={16} color={accent} />,   label: 'Email',          content: settings.studioEmail || '', href: settings.studioEmail ? `mailto:${settings.studioEmail}` : null, linkLabel: null },
    { icon: <Phone size={16} color={accent} />,  label: 'Phone',          content: settings.studioPhone || '', href: settings.studioPhone ? `tel:${settings.studioPhone.replace(/\s/g, '')}` : null, linkLabel: null },
  ].filter(item => item.content);
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, borderTop: '1px solid rgba(0,0,0,0.06)' }} className="abt-contact-row">
      {items.map((item, i, arr) => (
        <div key={i} style={{ padding: '28px 28px', borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(196,154,82,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
          </div>
          {item.href ? (
            <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="abt-contact-link">
              {item.content}
            </a>
          ) : (
            <span className="abt-contact-link">{item.content}</span>
          )}
          {item.linkLabel && item.href && (
            <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none', marginTop: 8 }}>
              {item.linkLabel} <ExternalLink size={10} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export function About() {
  const { settings } = useSettings();
  const { websiteTimeline, websiteTimelineLoading } = useData();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 320], [1, 0]);
  const heroY = useTransform(scrollY, [0, 320], [0, 60]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const font = "var(--font-sans)";

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  const stats = [
    { value: `${settings.statsProjects}+`, label: 'Projects Completed', sub: 'Audio & Video' },
    { value: `${settings.statsArtists}+`,  label: 'Partnered Artists',   sub: 'Across Bangladesh' },
    { value: settings.statsViews,           label: 'Global Views',        sub: 'YouTube & Platforms' },
    { value: '7+',                          label: 'Years Experience',     sub: 'Since 2018' },
  ];

  const timeline = !websiteTimelineLoading && websiteTimeline.length > 0
    ? websiteTimeline.map((t: any) => ({ id: t.id, year: t.year || '', title: t.title || '', desc: t.desc || '', color: t.color || 'var(--accent-gold)' }))
    : FALLBACK_TIMELINE;

  const services = [
    { num: '01', icon: <Mic2 size={20} color={accent} />,   title: 'Audio & Music Production',   desc: 'Pristine recording, vocal tuning, mixing, mastering, and custom sound design.' },
    { num: '02', icon: <Music2 size={20} color={accent} />, title: 'Islamic Audio Specialists',   desc: 'Professional production for Quran Tilawat, Nasheed, and Ghazal — crafted with care.' },
    { num: '03', icon: <Video size={20} color={accent} />,  title: 'Visual Storytelling',         desc: 'Cinematic video shoots, documentaries, and seamless video editing.' },
    { num: '04', icon: <Cpu size={20} color={accent} />,    title: 'Studio Tech Solutions',       desc: 'Expert consultancy, software setups (Studio One), and audio plugin configurations.' },
  ];

  const milestones = [
    { views: '70M+',  label: 'Views on a single release' },
    { views: '80M+',  label: 'Views on a single release' },
    { views: '100M+', label: 'Views on a single release' },
  ];

  const label = (text: string) => (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--accent-gold)', display: 'block', marginBottom: 14 }}>
      {text}
    </span>
  );

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: font, overflowX: 'hidden' }}>
      <Global styles={css`
        .abt-panel {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
        }
        .abt-panel:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.07);
          border-color: rgba(196, 154, 82, 0.25);
        }
        .stat-val {
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
          background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-lbl { font-size: 13px; color: var(--text-primary); font-weight: 600; margin-top: 8px; }
        .stat-sub { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
        .svc-num  { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--accent-gold); margin-bottom: 20px; opacity: 0.8; }
        .mile-num {
          font-size: clamp(36px, 7vw, 68px);
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
          background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .abt-map-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 100px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700; font-family: inherit;
          background: linear-gradient(135deg, var(--accent-gold), #b8882e);
          color: #fff; text-decoration: none;
          box-shadow: 0 4px 16px rgba(196, 154, 82, 0.3);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .abt-map-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(196, 154, 82, 0.4); }
        .abt-contact-link { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; display: block; line-height: 1.6; }
        .abt-contact-link:hover { color: var(--accent-gold); }
        @keyframes pulseGold {
          0%   { box-shadow: 0 0 0 0 rgba(196,154,82,0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(196,154,82,0); }
          100% { box-shadow: 0 0 0 0 rgba(196,154,82,0); }
        }
        @media (max-width: 720px) {
          .abt-stat-grid   { grid-template-columns: 1fr 1fr !important; }
          .abt-two-col     { grid-template-columns: 1fr !important; gap: 40px !important; }
          .abt-svc-grid    { grid-template-columns: 1fr !important; }
          .abt-mile-row    { flex-direction: column !important; gap: 24px !important; }
          .abt-contact-row { grid-template-columns: 1fr !important; }
        }
      `} />

      <SEO
        title="About | Tanvir Studio"
        description="Learn the story behind Tanvir Studio — a premier Islamic audio and video production studio in Demra, Dhaka, dedicated to the 'Smooth Sound' since 2018."
        url="https://tanvir.studio/about"
      />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <WaveBars color="var(--accent-gold)" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(251,251,253,0) 0%, #fbfbfd 100%)', pointerEvents: 'none' }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: 860, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid rgba(196,154,82,0.2)', borderRadius: 100, padding: '7px 18px', marginBottom: 36, boxShadow: 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-gold)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Since 2018 · Demra, Dhaka</span>
            </div>

            {/* Heading */}
            <h1 style={{ margin: '0 0 28px', fontSize: 'clamp(44px, 8vw, 80px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02, color: 'var(--text-primary)' }}>
              Where Every Voice<br />
              <span style={{ color: 'var(--accent-gold)' }}>Finds Its Soul.</span>
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 48px', fontWeight: 400 }}>
              Every voice has a story, and every melody has a soul. We don't just hit 'record'—we craft audio and visuals that connect deeply with your audience.
            </p>

            {/* Scroll CTA */}
            <a
              href="#story"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent-gold)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              onClick={e => { e.preventDefault(); document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <span>Our Story</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8l5 5 5-5" stroke="var(--accent-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, boxShadow: 'none', overflow: 'hidden' }} className="abt-stat-grid">
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '36px 20px', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── STORY / TIMELINE ─────────────────────────────────────────── */}
      <div id="story" style={{ padding: '120px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }} className="abt-two-col">

            <motion.div {...fadeUp(0)}>
              {label('Our Origin')}
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', color: 'var(--text-primary)' }}>How It All Began</h2>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 32px' }}>
                It started with a childhood curiosity: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>how is a beautiful nasheed brought to life?</strong> That simple question turned into a lifelong passion for perfect sound.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(196,154,82,0.07)', border: '1px solid rgba(196,154,82,0.18)', borderRadius: 14, padding: '13px 18px' }}>
                <Mic2 size={17} color={accent} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Shanarpar, Demra, Dhaka-1361</span>
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              {timeline.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, paddingBottom: i < timeline.length - 1 ? 36 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color, marginTop: 3, boxShadow: 'none', animation: i === timeline.length - 1 ? 'pulseGold 2s infinite' : 'none' }} />
                    {i < timeline.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 36, marginTop: 8, background: 'rgba(196,154,82,0.2)' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(196,154,82,0.08)', border: '1px solid rgba(196,154,82,0.18)', borderRadius: 100, padding: '3px 10px', marginBottom: 10 }}>
                      {item.year}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.72 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── SMOOTH SOUND ─────────────────────────────────────────────── */}
      <div style={{ padding: '120px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)} style={{ background: 'var(--card-bg)', border: '1px solid rgba(196,154,82,0.15)', borderRadius: 28, padding: 'clamp(40px, 6vw, 64px)', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'center' }} className="abt-two-col">
              <div>
                {label('Our Signature')}
                <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 18px', color: 'var(--text-primary)' }}>
                  The <span style={{ color: 'var(--accent-gold)' }}>"Smooth"</span> Sound
                </h2>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
                  In a world of loud music, our specialty is the <strong style={{ color: 'var(--text-primary)' }}>"Smooth Sound"</strong> — clean, warm, and soothing.
                </p>
              </div>
              <div>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: '0 0 18px' }}>
                  The magic of a song is in its lyrics and melody. Instead of heavy instruments, we put your vocals in the spotlight.
                </p>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: 0 }}>
                  Our mixing focuses on <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>clarity, warmth, and soothing tones</strong>—creating tracks that touch the heart, not just the ears.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── WHAT WE DO BEST ──────────────────────────────────────────── */}
      <div style={{ padding: '120px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)} style={{ marginBottom: 52 }}>
            {label('Our Expertise')}
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', color: 'var(--text-primary)' }}>What We Do Best</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.65, margin: 0 }}>
              From independent artists to brands, we deliver a complete, high-end production experience.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="abt-svc-grid">
            {services.map((s, i) => (
              <motion.div key={i} {...fadeUp(i * 0.07)} className="abt-panel">
                <div className="svc-num">{s.num}</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(196,154,82,0.08)', border: '1px solid rgba(196,154,82,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{s.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MILESTONES ───────────────────────────────────────────────── */}
      <div style={{ padding: '120px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: 60 }}>
            {label('Proudest Milestones')}
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 18px', color: 'var(--text-primary)' }}>Beyond the Numbers</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              It's an honor to work with the leading Islamic artists in Bangladesh. Together, our tracks have crossed major milestones — total views surpassing <strong style={{ color: 'var(--text-primary)' }}>{settings.statsViews}</strong>.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 24, boxShadow: 'none', overflow: 'hidden' }} className="abt-mile-row">
            {milestones.map((m, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1, padding: '40px 24px', borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div className="mile-num">{m.views}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, fontWeight: 500 }}>{m.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.15)} style={{ borderRadius: 20, background: 'rgba(196,154,82,0.06)', border: '1px solid rgba(196,154,82,0.18)', padding: '28px 36px', textAlign: 'center' }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.65, letterSpacing: '-0.01em' }}>
              "Our greatest achievement is the{' '}
              <span style={{ color: 'var(--accent-gold)' }}>smile of an artist</span>{' '}
              when they hear their finished track for the first time."
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── VISION ───────────────────────────────────────────────────── */}
      <div style={{ padding: '120px 24px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="abt-two-col">
            <motion.div {...fadeUp(0)} className="abt-panel">
              {label('Looking Ahead')}
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', color: 'var(--text-primary)' }}>Our Dream Extends Far</h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 14px' }}>
                Our dream goes beyond these studio walls. We want to make premium production accessible nationwide through multiple branches.
              </p>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                We also aim to build an <strong style={{ color: 'var(--text-primary)' }}>academy</strong>—training the next generation of sound engineers to elevate the industry.
              </p>
            </motion.div>

            <motion.div {...fadeUp(0.07)} className="abt-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 28 }}>
              <div>
                {label("Let's Create")}
                <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', color: 'var(--text-primary)' }}>Something Beautiful Together</h3>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  Got an idea? Let's bring it to life. Drop by the studio for a coffee and let's discuss your next project.
                </p>
              </div>
              <Link
                to="/booking"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 26px', borderRadius: 100, background: 'linear-gradient(135deg, var(--accent-gold), #b8882e)', color: 'var(--card-bg)', fontWeight: 700, fontSize: 14, textDecoration: 'none', alignSelf: 'flex-start', boxShadow: 'none', transition: 'opacity 0.15s, transform 0.15s', letterSpacing: '-0.01em' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                Book a Session
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── FIND US ───────────────────────────────────────────────────── */}
      <div style={{ padding: '120px 24px 140px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text-primary)' }}>Find Us</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>We're right here in the heart of Demra, Dhaka.</p>
          </motion.div>

          <motion.div {...fadeUp(0.08)} style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 28, overflow: 'hidden', boxShadow: 'none' }}>
            {/* Map */}
            <div style={{ position: 'relative', width: '100%', height: 320, overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--surface-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  position: 'relative',
                }}
              >
                {/* Decorative map-like grid background */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, animation: 'pulseGold 3s infinite' }}>
                  <MapPin size={32} color="var(--accent-gold)" />
                </div>
                
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Tanvir Studio</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{settings.studioAddress || 'Demra, Dhaka'}</div>
                </div>
              </div>
              <a
                href="https://maps.app.goo.gl/P7rFTzLM2bxbRbP37"
                target="_blank"
                rel="noopener noreferrer"
                className="abt-map-btn"
                style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}
              >
                <ExternalLink size={13} />
                Open in Google Maps
              </a>
            </div>

            {/* Contact info */}
            <AboutContactRow settings={settings} accent={accent} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
