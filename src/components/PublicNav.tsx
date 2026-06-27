import { Global, css } from '@emotion/react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Mic, ArrowRight, Headphones, ChevronDown,
  Users, FileText, Shield, Search, X, Sliders,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';

const accent = 'var(--accent-gold)';

// Preload lazy route chunks on hover
const preload: Record<string, () => Promise<unknown>> = {
  '/services':    () => import('../pages/Services'),
  '/portfolio':   () => import('../pages/Portfolio'),
  '/about':       () => import('../pages/About'),
  '/contact':     () => import('../pages/Contact'),
  '/blog':        () => import('../pages/Blog'),
  '/booking':     () => import('../pages/Booking'),
  '/calculator':  () => import('../pages/Calculator'),
  '/privacy':     () => import('../pages/Privacy'),
};

const preloaded = new Set<string>();
const preloadRoute = (path: string) => {
  const key = path.split('#')[0];
  if (!preloaded.has(key) && preload[key]) {
    preloaded.add(key);
    preload[key]();
  }
};

// ── Direct nav links (always visible in the bar) ─────────────────────────
const NAV_DIRECT = [
  { key: 'services',  path: '/services' },
  { key: 'portfolio', path: '/portfolio' },
  { key: 'booking',   path: '/booking' },
];

// ── "More" dropdown ──────────────────────────────────────────────────────
const NAV_MORE = [
  { key: 'about',      path: '/about',      icon: Users,    desc: 'Who we are and how we work' },
  { key: 'blog',       path: '/blog',       icon: FileText, desc: 'Tips, guides & studio news' },
  { key: 'calculator', path: '/calculator', icon: Sliders,  desc: 'Estimate your project cost' },
  { label: 'Privacy Policy', path: '/privacy', icon: Shield, desc: 'How we handle your data' },
];

const font = "var(--font-sans)";

const HamburgerIcon = ({ open }: { open: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <motion.rect x="2" y="5.5" width="16" height="1.8" rx="0.9" fill="currentColor"
      animate={open ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
      style={{ originX: '50%', originY: '50%' }} transition={{ duration: 0.22 }} />
    <motion.rect x="2" y="9.1" width="16" height="1.8" rx="0.9" fill="currentColor"
      animate={open ? { opacity: 0, scaleX: 0.5 } : { opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.15 }} />
    <motion.rect x="2" y="12.7" width="16" height="1.8" rx="0.9" fill="currentColor"
      animate={open ? { rotate: -45, y: -3.6 } : { rotate: 0, y: 0 }}
      style={{ originX: '50%', originY: '50%' }} transition={{ duration: 0.22 }} />
  </svg>
);

function MoreDropdown({ ink, muted, line, accent, dark }: {
  ink: string; muted: string; line: string; accent: string; dark: boolean;
}) {
  const { t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = `${location.pathname}${location.hash || ''}`;
  const isActive = NAV_MORE.some(item => current === item.path);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const half = Math.ceil(NAV_MORE.length / 2);
  const col1 = NAV_MORE.slice(0, half);
  const col2 = NAV_MORE.slice(half);

  return (
    <div ref={ref} style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`pnav-link${isActive ? ' active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        More
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ display: 'flex', opacity: 0.55 }}>
          <ChevronDown size={14} strokeWidth={2.5} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: 440,
              background: 'var(--surface-1)',
              backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
              border: `1px solid ${line}`,
              borderRadius: 16,
              boxShadow: 'none',
              overflow: 'hidden', zIndex: 10, fontFamily: font,
            }}
          >
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[col1, col2].map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {col.map(item => {
                    const Icon = item.icon;
                    const active = current === item.path;
                    const label = item.key ? t('nav.' + item.key) : item.label;
                    return (
                      <Link key={item.path} to={item.path}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 11,
                          padding: '10px 11px', borderRadius: 12, textDecoration: 'none',
                          background: active ? `${accent}0D` : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { preloadRoute(item.path); if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          background: active ? `${accent}20` : 'transparent',
                          border: `1px solid ${active ? 'var(--accent-gold)' + '30' : 'var(--border-color)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        }}>
                          <Icon size={14} strokeWidth={1.8} />
                        </div>
                        <div style={{ paddingTop: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? 'var(--accent-gold)' : 'var(--text-primary)', lineHeight: 1.3 }}>{label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PublicNav() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { user }     = useAuth();
  const { settings } = useSettings();
  const { t }        = useLanguage();

  const studioName = settings?.studioName || 'Tanvir Studio';
  const studioLogo = settings?.studioLogo || '/Logo.jpg';

  const [dark, setDark] = useState(() =>
    localStorage.getItem('hs-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [moreOpen,   setMoreOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [scrolled,    setScrolled]    = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [logoLoaded,  setLogoLoaded]  = useState(false);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setMoreOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setMenuOpen(false); setMoreOpen(false); }, [location.pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('hs-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event('themechange'));
  };

  const DARK_HERO_PAGES = user ? [] : ['/services'];
  const isHome = location.pathname === '/';
  const currentPath = `${location.pathname}${location.hash || ''}`;
  const hasBg  = !!settings?.heroBgImage || localStorage.getItem('ts_has_hero') === '1';
  const onHero = !scrolled && ((isHome && hasBg) || DARK_HERO_PAGES.includes(location.pathname));

  const ink   = 'var(--text-primary)';
  const muted = 'var(--text-secondary)';
  const line  = 'var(--border-color)';
  const surf  = 'var(--surface-1)';

  return (
    <>
      <Global styles={css`
        .pnav {
          position: fixed; top: 0; left: 0; right: 0; width: 100%;
          z-index: 1000; height: 76px;
          display: flex; justify-content: center; align-items: center;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: ${font};
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
        }
        html.dark .pnav {
          background: rgba(10, 10, 10, 0.65);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .pnav.scrolled {
          background: rgba(255, 255, 255, 0.85);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
        }
        html.dark .pnav.scrolled {
          background: rgba(10, 10, 10, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pnav-inner {
          width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 24px;
          display: grid; grid-template-columns: auto 1fr auto;
          align-items: center; gap: 16px; height: 100%;
        }
        .pnav-logo {
          display: flex; align-items: center; gap: 8px; cursor: pointer; flex-shrink: 0;
          user-select: none; background: none; border: none; padding: 0;
          color: var(--text-primary);
        }
        .pnav-logo-mark {
          width: 32px; height: 32px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
        }
        .pnav-logo-name { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); white-space: nowrap; }
        .pnav-links { display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.03); padding: 5px; border-radius: 16px; }
        html.dark .pnav-links { background: rgba(255,255,255,0.05); }
        .pnav-link {
          font-size: 15px; font-weight: 500; letter-spacing: -0.01em;
          color: var(--text-primary); opacity: 0.75; background: transparent; border: none; cursor: pointer;
          font-family: ${font}; padding: 8px 16px; border-radius: 12px;
          text-decoration: none; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap; display: block; position: relative; z-index: 1;
        }
        .pnav-link.active { opacity: 1; font-weight: 600; color: var(--text-primary); background: #ffffff; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        html.dark .pnav-link.active { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); }
        .pnav-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .pnav-icon-btn {
          width: 42px; height: 42px; border-radius: 12px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.03); color: var(--text-primary); transition: all 0.2s; flex-shrink: 0;
        }
        html.dark .pnav-icon-btn { background: rgba(255,255,255,0.06); }
        .pnav-icon-btn:hover { background: rgba(0,0,0,0.08); transform: translateY(-1px); }
        html.dark .pnav-icon-btn:hover { background: rgba(255,255,255,0.12); }
        .pnav-btn {
          padding: 10px 24px; border-radius: 14px; border: none; cursor: pointer;
          background: var(--text-primary);
          color: var(--bg-color); font-size: 15px; font-weight: 600; font-family: ${font};
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: -0.01em;
        }
        html.dark .pnav-btn { background: #fff; color: #000; }
        .pnav-btn:hover { transform: translateY(-1px); opacity: 0.85; }
        html.dark .pnav-btn:hover { opacity: 0.85; }
        .pnav-menu-btn {
          background: transparent; border: none; color: var(--text-primary); cursor: pointer;
          padding: 0; display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; transition: opacity 0.15s; opacity: 0.8;
        }
        .pnav-menu-btn:hover { opacity: 1; }
        @media (max-width: 900px) {
          .pnav { height: 60px; }
          .pnav-links { display: none !important; }
          .pnav-inner { grid-template-columns: auto auto; justify-content: space-between; }
          .pnav-btn { display: none !important; }
          .pnav-icon-btn { display: none !important; }
        }
        @media (max-width: 520px) { .pnav-mobile-more-grid { grid-template-columns: 1fr !important; } }
        @media (min-width: 901px) { .pnav-menu-btn { display: none !important; } }
      `} />

      {/* ── Desktop navbar ── */}
      <nav className={`pnav${scrolled ? ' scrolled' : ''}`}>
        <div className="pnav-inner">

          {/* Logo */}
          <button className="pnav-logo" onClick={() => navigate('/')} aria-label="Home">
            <div className="pnav-logo-mark">
              {studioLogo ? (
                <img src={studioLogo} alt="logo" onLoad={() => setLogoLoaded(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: logoLoaded ? 1 : 0, transition: 'opacity 0.3s' }} />
              ) : <Mic size={18} color={accent} strokeWidth={1.8} />}
            </div>
            <span className="pnav-logo-name">{studioName}</span>
          </button>

          {/* Center: direct links or Search */}
          <div ref={searchContainerRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {searchOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, width: '0%' }}
                animate={{ opacity: 1, scale: 1, width: '100%' }}
                style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--surface-1)',
                  borderRadius: '14px', padding: '10px 18px', width: '100%', maxWidth: '640px',
                  border: `1px solid ${line}`
                }}
              >
                <Search size={18} color="var(--text-secondary)" style={{ marginRight: '14px' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search services, portfolio, blog..."
                  aria-label="Search"
                  style={{ background: 'none', border: 'none', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '16px', fontFamily: font }}
                />
                <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
                  <X size={18} />
                </button>
              </motion.div>
            ) : (
              <nav className="pnav-links" aria-label="Main navigation" onMouseLeave={() => setHoveredLink(null)}>
                {NAV_DIRECT.map(({ key, path }) => {
                  const isActive = currentPath === path;
                  const label = t('nav.' + key);
                  const isHovered = hoveredLink === label;
                  return (
                    <Link key={key} to={path}
                      className={`pnav-link${isActive ? ' active' : ''}`}
                      onMouseEnter={() => { preloadRoute(path); setHoveredLink(label); }}
                    >
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId="pnav-pill"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'var(--surface-1)', zIndex: -1 }}
                        />
                      )}
                      {label}
                    </Link>
                  );
                })}
                <div onMouseEnter={() => setHoveredLink('More')} style={{ position: 'relative' }}>
                  <MoreDropdown ink={ink} muted={muted} line={line} accent={accent} dark={dark} />
                  {hoveredLink === 'More' && (
                    <motion.div
                      layoutId="pnav-pill"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'var(--surface-1)', zIndex: -1, pointerEvents: 'none' }}
                    />
                  )}
                </div>
              </nav>
            )}
          </div>

          {/* Right controls */}
          <div className="pnav-right">
            {!searchOpen && (
              <button className="pnav-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                <Search size={17} strokeWidth={2} />
              </button>
            )}
            <button className="pnav-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {dark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '9px 20px', borderRadius: 14,
                  border: '1.5px solid rgba(196,154,82,0.35)',
                  background: 'rgba(196,154,82,0.06)',
                  color: 'var(--accent-gold)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: font, transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)', letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(196,154,82,0.12)';
                  el.style.borderColor = 'rgba(196,154,82,0.6)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(196,154,82,0.06)';
                  el.style.borderColor = 'rgba(196,154,82,0.35)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                Login
              </button>
            )}
            <button className="pnav-btn magnetic-btn" onClick={() => navigate(user ? '/dashboard' : '/booking')}>
              {user ? 'Dashboard' : 'Start Project'}
            </button>
            <button className="pnav-menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen}>
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>

        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: 74, left: 12, right: 12, zIndex: 999,
                background: 'var(--card-bg)',
                backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)',
                borderRadius: 22, border: `1px solid ${line}`,
                boxShadow: 'none',
                overflow: 'hidden', fontFamily: font,
              }}
            >
              <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
              <div style={{ padding: '6px 16px 20px' }}>

                {/* Direct links */}
                {NAV_DIRECT.map(({ key, path }) => {
                  const isActive = currentPath === path;
                  return (
                    <Link key={key} to={path} onClick={() => setMenuOpen(false)} onMouseEnter={() => preloadRoute(path)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '13px 4px', fontSize: 16,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--accent-gold)' : ink,
                        textDecoration: 'none',
                        borderBottom: `1px solid ${line}`,
                      }}
                    >
                      {t('nav.' + key)}
                      <ArrowRight size={14} color={muted} />
                    </Link>
                  );
                })}

                {/* More accordion */}
                <button
                  onClick={() => setMoreOpen(v => !v)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, fontWeight: 500, color: ink, fontFamily: font,
                    borderBottom: moreOpen ? 'none' : `1px solid ${line}`,
                  }}
                >
                  <span>More</span>
                  <motion.span animate={{ rotate: moreOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                    style={{ display: 'flex', color: 'var(--text-secondary)' }}>
                    <ChevronDown size={16} strokeWidth={2} />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden', borderBottom: `1px solid ${line}` }}
                    >
                      <div className="pnav-mobile-more-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '8px 0 12px' }}>
                        {NAV_MORE.map(item => {
                          const Icon = item.icon;
                          const active = `${location.pathname}${location.hash || ''}` === item.path;
                          const label = item.key ? t('nav.' + item.key) : item.label;
                          return (
                            <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} onMouseEnter={() => preloadRoute(item.path)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 10px', borderRadius: 12, textDecoration: 'none',
                                background: active ? `${accent}12` : 'transparent',
                                color: active ? 'var(--accent-gold)' : ink,
                                fontSize: 13.5, fontWeight: active ? 700 : 500,
                                transition: 'background 0.12s',
                              }}
                            >
                              <div style={{
                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                background: active ? `${accent}20` : surf,
                                border: `1px solid ${active ? 'var(--accent-gold)' + '30' : 'var(--border-color)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: active ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              }}>
                                <Icon size={13} strokeWidth={1.8} />
                              </div>
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  {!user && (
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/login'); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(196,154,82,0.08)',
                        border: '1.5px solid rgba(196,154,82,0.3)',
                        color: 'var(--accent-gold)', borderRadius: 14, padding: '14px 20px',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        fontFamily: font, whiteSpace: 'nowrap',
                      }}
                    >
                      Login
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); navigate(user ? '/dashboard' : '/booking'); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: 'var(--text-primary)',
                      color: 'var(--bg-color)', border: 'none', borderRadius: 14, padding: '14px 20px',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    <Headphones size={15} strokeWidth={2.5} />
                    {user ? 'Go to Dashboard' : 'Start Project'}
                    <ArrowRight size={14} />
                  </button>
                  <button onClick={toggleTheme}
                    style={{
                      background: surf, border: `1px solid ${line}`, borderRadius: 14,
                      width: 50, height: 50, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: ink, cursor: 'pointer',
                    }}
                  >
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
