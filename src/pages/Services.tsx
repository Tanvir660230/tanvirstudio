import { Global, css } from '@emotion/react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Mic, Sliders, Headphones, Music2, Video, Film, Monitor,
  Scissors, Palette, FileText, Zap, Check, ArrowRight,
  Layers, Code2, BookOpen, Mic2, Cpu, Clock, RotateCcw, Star, Loader2
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { FaqSection } from '../components/FaqSection';

const font = "var(--font-sans)";
const C = { panel: 'var(--card-bg)', border: 'var(--border-color)', surf: 'var(--surface-1)' };

const toSlug = (s: string) =>
  (s || '').toLowerCase().replace(/[&']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

type LIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;
const ICON_MAP: Record<string, LIcon> = {
  Mic, Sliders, Headphones, Music2, Video, Film, Monitor,
  Scissors, Palette, FileText, Zap, Layers, Code2, BookOpen, Mic2, Cpu
};
const resolveIcon = (name?: string): LIcon => (name && ICON_MAP[name]) ? ICON_MAP[name] : Sliders;

const parsePrice = (p: any): number => {
  if (typeof p === 'number') return p;
  const n = parseInt(String(p || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

const CATEGORIES = [
  { id: 'audio',    label: 'Audio & Music'     },
  { id: 'video',    label: 'Video & Film'       },
  { id: 'software', label: 'Software & Web'     },
  { id: 'content',  label: 'Content & Branding' },
];

const TABS = [{ id: 'all', label: 'All Services' }, ...CATEGORIES];

const normalizeService = (s: any) => ({
  id:       s.id as string,
  slug:     (s.slug || toSlug(s.title || '')) as string,
  Icon:     resolveIcon(s.icon),
  title:    (s.title || 'Untitled') as string,
  desc:     (s.description || s.desc || '') as string,
  from:     parsePrice(s.price ?? s.from),
  category: (s.category || 'audio') as string,
  features: (Array.isArray(s.features) ? s.features : []) as string[],
});

export function Services() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { cat: catParam } = useParams<{ cat?: string; slug?: string }>();
  const { websiteServices, websiteServicesLoading, websitePackages } = useData();

  const [activeTab,  setActiveTab]  = useState(catParam || 'all');
  const [nasheedPkg, setNasheedPkg] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const allServices = useMemo(() => {
    return (websiteServices as any[])
      .filter(s => s.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(normalizeService);
  }, [websiteServices]);

  const activePkgs = useMemo(() => {
    if (!websitePackages?.length) return [];
    return [...(websitePackages as any[])]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((p, i) => ({
        id:        p.id || `pkg_${i}`,
        name:      p.name || 'Package',
        price:     parsePrice(p.price),
        popular:   !!p.highlight,
        delivery:  p.delivery || '5 days',
        revisions: typeof p.revisions === 'number' ? p.revisions : [1, 3, 5][i] || 3,
        features:  Array.isArray(p.features)
          ? p.features.flatMap((f: any) => String(f).split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean))
          : String(p.features || '').split(',').map((f: string) => f.trim()).filter(Boolean),
      }));
  }, [websitePackages]);

  useEffect(() => {
    if (activePkgs.length > 0 && !activePkgs.find(p => p.id === nasheedPkg)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNasheedPkg(activePkgs.find(p => p.popular)?.id || activePkgs[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePkgs]);

  const nasheedServices  = allServices.filter(s => s.title.toLowerCase().includes('nasheed') && s.category === 'audio');
  const otherServices    = allServices.filter(s => !nasheedServices.find(n => n.id === s.id));
  const visibleOthers    = activeTab === 'all' ? otherServices : otherServices.filter(s => s.category === activeTab);
  const showNasheedBlock = activeTab === 'all' || activeTab === 'audio';

  const handleGoToService = (svc: ReturnType<typeof normalizeService>) => {
    navigate(`/services/${svc.category}/${svc.slug || svc.id}`);
  };

  const handleOrderNasheed = () => {
    const pkg = activePkgs.find(p => p.id === nasheedPkg);
    if (!pkg) return;
    sessionStorage.setItem('pendingPackage', JSON.stringify({
      name:     `Nasheed Production — ${pkg.name}`,
      price:    `৳${pkg.price.toLocaleString()}`,
      features: pkg.features,
      delivery: pkg.delivery,
      line:     'Full nasheed production package',
    }));
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: font, color: 'var(--text-primary)' }}>
      <Global styles={css`
        .svc-tabs { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; }
        .svc-tabs::-webkit-scrollbar { display:none; }

        .svc-tab {
          display:inline-flex; align-items:center; gap:7px;
          padding:9px 20px; border-radius:100px; font-size:13px; font-weight:600;
          font-family:inherit; cursor:pointer; white-space:nowrap; flex-shrink:0;
          border:1.5px solid var(--border-color); background:var(--card-bg); color:var(--text-secondary);
          transition:all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .svc-tab:hover { border-color:var(--accent-gold-deep); color:var(--text-primary); background:var(--surface-1); }
        .svc-tab.active {
          background:var(--text-primary) !important; color:var(--bg-color) !important;
          border-color:var(--text-primary);
          box-shadow:var(--shadow-sm);
        }
        .tab-count {
          font-size:10px; font-weight:800; padding:2px 8px; border-radius:100px;
          background:var(--surface-2); transition:background 0.2s;
        }
        .svc-tab.active .tab-count { background:rgba(128,128,128,0.25); color:var(--bg-color); }

        .svc-card-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }

        .svc-card {
          background:var(--card-bg); border:1px solid var(--border-color);
          border-radius:26px; padding:32px; display:flex; flex-direction:column;
          position:relative; overflow:hidden;
          transition:border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .svc-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg, var(--accent-gold), #e0b96a);
          opacity:0; transition:opacity 0.3s ease; border-radius:26px 26px 0 0;
        }
        .svc-card:hover { border-color:rgba(196,154,82,0.25); transform:translateY(-4px); box-shadow:0 20px 52px rgba(0,0,0,0.08); }
        .svc-card:hover::before { opacity:1; }

        .nasheed-showcase {
          background: linear-gradient(145deg, #141416 0%, #1a1a1e 50%, #141416 100%);
          border-radius:32px; padding:52px; position:relative; overflow:hidden;
          border:1px solid rgba(255,255,255,0.04);
        }
        .nasheed-showcase::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg, transparent 0%, rgba(196,154,82,0.4) 40%, rgba(196,154,82,0.4) 60%, transparent 100%);
        }
        html.dark .nasheed-showcase { border-color:rgba(255,255,255,0.07); }

        .pkg-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }

        .pkg-tier {
          border-radius:22px; padding:28px 26px; cursor:pointer;
          position:relative; display:flex; flex-direction:column;
          border:1.5px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.035);
          transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .pkg-tier:hover:not(.sel) { border-color:rgba(196,154,82,0.35); background:rgba(255,255,255,0.06); }
        .pkg-tier.sel {
          border-color:var(--accent-gold) !important;
          background:var(--card-bg) !important;
          box-shadow:0 12px 40px rgba(196,154,82,0.2), 0 0 0 1px rgba(196,154,82,0.15);
        }
        .pkg-tier.sel::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,var(--accent-gold),#e0b96a); border-radius:22px 22px 0 0;
        }

        html.dark .pkg-tier.sel {
          background:var(--card-bg) !important;
          box-shadow:0 12px 40px rgba(196,154,82,0.12), 0 0 0 1px rgba(196,154,82,0.2);
        }

        .addon-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:9px 16px; border-radius:100px; cursor:pointer;
          border:1px solid rgba(255,255,255,0.12); background:transparent;
          font-family:inherit; transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .addon-btn.on  { border-color:var(--accent-gold); background:rgba(196,154,82,0.1); }
        .addon-btn:hover:not(.on) { border-color:rgba(255,255,255,0.28); background:rgba(255,255,255,0.05); }

        .apple-btn-gold {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:14px 28px; border-radius:100px; border:none; cursor:pointer;
          font-size:15px; font-weight:700; font-family:inherit;
          background:linear-gradient(135deg,#c9a158,#b07c28);
          color:#fff; box-shadow:0 4px 18px rgba(196,154,82,0.35);
          transition:transform 0.2s, box-shadow 0.2s, filter 0.2s;
          flex-shrink:0; letter-spacing:-0.01em;
        }
        .apple-btn-gold:hover { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 8px 28px rgba(196,154,82,0.45); }
        .apple-btn-gold:active { transform:translateY(0); filter:brightness(0.96); }

        .svc-section-head {
          display:flex; align-items:center; gap:16px; margin-bottom:28px;
        }
        .svc-section-head-line {
          flex:1; height:1px; background:rgba(0,0,0,0.07);
        }
        html.dark .svc-section-head-line { background:rgba(255,255,255,0.08); }

        @keyframes spin { to { transform:rotate(360deg); } }

        @media (max-width:1100px) {
          .svc-card-grid { grid-template-columns:repeat(2,1fr); }
          .nasheed-showcase { padding:40px 36px; }
        }
        @media (max-width:900px) {
          .pkg-grid {
            grid-template-columns: repeat(3,1fr);
            overflow-x:auto; gap:12px;
          }
          .pkg-tier { min-width:220px; }
          .svc-card-grid { grid-template-columns:repeat(2,1fr); gap:14px; }
          .nasheed-showcase { padding:32px 24px; border-radius:24px; }
        }
        @media (max-width:640px) {
          .svc-card-grid { grid-template-columns:1fr; }
          .nasheed-showcase { padding:28px 18px; border-radius:20px; }
          .svc-card { padding:26px 20px; border-radius:22px; }
          .pkg-tier { padding:22px 18px; border-radius:18px; }
          .pkg-grid { grid-template-columns:repeat(3,1fr); }
        }
      `} />

      <SEO title="Services | Tanvir Studio" description="Professional audio mixing, mastering, nasheed production, video editing, software and content services." url="https://tanvir.studio/services" />

      {/* ——— HERO ——— */}
      <section style={{ padding: '100px 24px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* ambient glow */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-60%)', width: 700, height: 460, background: 'radial-gradient(ellipse, rgba(196,154,82,0.07) 0%, transparent 68%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
          {/* Eyebrow pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 100, padding: '7px 18px', marginBottom: 28, boxShadow: 'none' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-gold)', boxShadow: 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Production Services</span>
          </div>

          <h1 style={{ fontSize: 'clamp(40px, 6vw, 66px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.04, color: 'var(--text-primary)', margin: '0 0 22px' }}>
            Everything you need.<br />
            <span style={{ background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Compare &amp; book.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.72, maxWidth: 460, margin: '0 auto' }}>
            Browse every service side-by-side, pick your package, and start your project in minutes.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 120px' }}>

        {/* LOADING */}
        {websiteServicesLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: 'var(--text-secondary)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Loading services…</span>
          </div>
        )}

        {/* NASHEED FLAGSHIP SHOWCASE */}
        {!websiteServicesLoading && <AnimatePresence>
          {showNasheedBlock && nasheedServices.length > 0 && (
            <motion.div
              key="nasheed-block"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 60 }}
            >
              <div className="nasheed-showcase">
                {/* Gold glow orbs */}
                <div style={{ position: 'absolute', top: -100, right: -100, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,154,82,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,154,82,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 44 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Headphones size={23} color="var(--accent-gold)" strokeWidth={1.8} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Star size={11} color="var(--accent-gold)" fill="var(--accent-gold)" />
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>Flagship Service</span>
                      </div>
                    </div>
                    <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.035em', margin: '0 0 10px', lineHeight: 1.08 }}>
                      Nasheed Production
                    </h2>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.72, maxWidth: 500 }}>
                      From raw vocal to cinematic master — select a tier, customize with add-ons, and order instantly.
                    </p>
                  </div>
                </div>

                {/* Package tier comparison */}
                <div className="pkg-grid" style={{ marginBottom: 24 }}>
                  {activePkgs.map((pkg, idx) => {
                    const sel = nasheedPkg === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        className={`pkg-tier${sel ? ' sel' : ''}`}
                        onClick={() => setNasheedPkg(pkg.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {pkg.popular && (
                          <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 900, color: '#fff', background: 'var(--gradient-gold)', padding: '3px 14px', borderRadius: 100, letterSpacing: '0.12em', textTransform: 'uppercase', boxShadow: 'none', whiteSpace: 'nowrap' }}>
                            Most Popular
                          </span>
                        )}

                        {/* Tier number */}
                        <div style={{ fontSize: 10, fontWeight: 800, color: sel ? 'rgba(196,154,82,0.6)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', marginBottom: 6 }}>
                          0{idx + 1}
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 800, color: sel ? 'var(--accent-gold)' : 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{pkg.name}</div>
                        <div style={{ fontSize: 33, fontWeight: 900, letterSpacing: '-0.04em', color: sel ? 'var(--text-primary)' : 'var(--card-bg)', marginBottom: 18, lineHeight: 1 }}>
                          ৳{pkg.price.toLocaleString()}
                        </div>

                        {/* Delivery + revisions */}
                        <div style={{ display: 'flex', gap: 14, paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${sel ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={12} color={sel ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.35)'} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: sel ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>{pkg.delivery}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <RotateCcw size={12} color={sel ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.35)'} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: sel ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.4)' }}>{pkg.revisions} rev{pkg.revisions !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                          {pkg.features.map((f: string, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                              <div style={{ width: 17, height: 17, borderRadius: '50%', background: sel ? 'rgba(196,154,82,0.12)' : 'rgba(196,154,82,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                <Check size={10} color="var(--accent-gold)" strokeWidth={3} />
                              </div>
                              <span style={{ fontSize: 13, color: sel ? '#6e6e73' : 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontWeight: 500 }}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 28, flexWrap: 'wrap', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '22px 26px' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>Selected Package</div>
                    <motion.div
                      key={nasheedPkg}
                      initial={{ scale: 0.94, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.22 }}
                      style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-0.045em', lineHeight: 1 }}
                    >
                      ৳{(activePkgs.find(p => p.id === nasheedPkg)?.price || 0).toLocaleString()}
                    </motion.div>
                  </div>
                  <button onClick={handleOrderNasheed} className="apple-btn-gold">
                    Order Package <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>}

        {/* OTHER SERVICES */}
        {!websiteServicesLoading && allServices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎚️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No services yet</div>
            <div style={{ fontSize: 14 }}>Add services from the dashboard to display them here.</div>
          </div>
        )}

        {/* Section heading — only when there are non-nasheed services */}
        {!websiteServicesLoading && otherServices.length > 0 && <div className="svc-section-head" style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
            More Services
          </span>
          <div className="svc-section-head-line" />
        </div>}

        {/* Tab bar — only when there are non-nasheed services */}
        {!websiteServicesLoading && otherServices.length > 0 && <>
        <div style={{ marginBottom: 28 }}>
          <div className="svc-tabs">
            {TABS.map(tab => {
              const cnt = tab.id === 'all' ? otherServices.length : otherServices.filter(s => s.category === tab.id).length;
              if (tab.id !== 'all' && cnt === 0) return null;
              return (
                <button key={tab.id} className={`svc-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)} aria-label={tab.label} aria-pressed={activeTab === tab.id}>
                  {tab.label}
                  {tab.id !== 'all' && cnt > 0 && <span className="tab-count">{cnt}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="svc-card-grid">
          <AnimatePresence mode="popLayout">
            {visibleOthers.map((svc, i) => {
              const catLabel = CATEGORIES.find(c => c.id === svc.category)?.label || svc.category;
              return (
                <motion.div
                  key={svc.id}
                  className="svc-card"
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Icon + category badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(145deg, rgba(196,154,82,0.08), rgba(196,154,82,0.05))', border: '1px solid rgba(196,154,82,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svc.Icon size={25} color="var(--accent-gold)" strokeWidth={1.7} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(196,154,82,0.08)', border: '1px solid rgba(196,154,82,0.14)', padding: '4px 11px', borderRadius: 100, marginTop: 5 }}>
                      {catLabel}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: 9, lineHeight: 1.25 }}>
                    {svc.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.72, marginBottom: 22 }}>
                    {svc.desc}
                  </p>

                  {/* Features */}
                  {svc.features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
                      {svc.features.slice(0, 4).map((f: string, fi: number) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                          <div style={{ background: 'rgba(196,154,82,0.1)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            <Check size={11} color="var(--accent-gold)" strokeWidth={3} />
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div style={{ marginTop: 'auto', paddingTop: 22, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>Starting from</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                          ৳{(svc.from || 0).toLocaleString()}
                        </div>
                      </div>
                      <button onClick={() => handleGoToService(svc)} className="apple-btn-gold" style={{ padding: '11px 22px', fontSize: 14 }}>
                        View Service <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {visibleOthers.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 20px', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
                No services in this category yet.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>}
      </div>

      <FaqSection dark={false} C={C} />
    </div>
  );
}
