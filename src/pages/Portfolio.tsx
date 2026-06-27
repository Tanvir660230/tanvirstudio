import { Global, css } from '@emotion/react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { Music2, Play, Pause, Users, Award, Headphones, ChevronDown } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const font = "var(--font-sans)";

// ── Waveform visual ────────────────────────────────────────────────────────
function Waveform({ color, animated, rough }: { color: string; animated: boolean; rough?: boolean }) {
  const bars = rough
    ? [0.28,0.71,0.38,0.92,0.18,0.85,0.42,0.6,0.25,0.95,0.35,0.72,0.22,0.88,0.45,0.55,0.3,0.78,0.48,0.62]
    : [0.55,0.72,0.65,0.8,0.6,0.84,0.7,0.75,0.68,0.86,0.72,0.78,0.65,0.82,0.7,0.76,0.68,0.74,0.65,0.71];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 48 }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h * 100}%`, borderRadius: 3, background: color, opacity: 0.75,
          animation: animated ? `portWave ${0.55 + (i % 5) * 0.18}s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
          transition: 'height 0.3s ease',
        }} />
      ))}
    </div>
  );
}

// ── Before / After card ────────────────────────────────────────────────────
function BeforeAfterCard({ item }: { item: any }) {
  const [playing, setPlaying] = useState<'before' | 'after' | null>(null);
  const beforeRef = useRef<HTMLAudioElement>(null);
  const afterRef  = useRef<HTMLAudioElement>(null);

  const toggle = (side: 'before' | 'after') => {
    const ref      = side === 'before' ? beforeRef : afterRef;
    const otherRef = side === 'before' ? afterRef  : beforeRef;
    const url      = side === 'before' ? item.raw_url : item.mastered_url;
    otherRef.current?.pause();
    if (playing === side) { ref.current?.pause(); setPlaying(null); return; }
    if (url && ref.current) ref.current.play().catch(() => {});
    setPlaying(side);
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 24, overflow: 'hidden' }}>
      <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{item.type || 'Transformation'}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{item.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.artist}</div>
      </div>
      <div className="p-ba-inner" style={{ padding: '16px 22px 22px' }}>
        {(['before', 'after'] as const).map(side => {
          const isPlaying = playing === side;
          const color     = side === 'before' ? 'var(--text-tertiary)' : 'var(--accent-gold)';
          const url       = side === 'before' ? item.raw_url : item.mastered_url;
          return (
            <div key={side} style={{
              background: 'var(--card-bg)',
              border: `1px solid ${isPlaying ? 'rgba(196,154,82,0.35)' : 'var(--border-color)'}`,
              borderRadius: 14, padding: '14px', transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {side === 'before' ? 'Before' : 'After'}
                </span>
                <button onClick={() => toggle(side)} style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: url ? 'pointer' : 'not-allowed',
                  background: isPlaying ? 'var(--accent-gold)' : 'var(--surface-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isPlaying ? 'var(--bg-color)' : 'var(--text-secondary)', opacity: url ? 1 : 0.35, transition: 'all 0.15s',
                }}>
                  {isPlaying ? <Pause size={11} /> : <Play size={11} />}
                </button>
              </div>
              <Waveform color={color} animated={isPlaying} rough={side === 'before'} />
              {!url && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center', opacity: 0.7 }}>Coming soon</div>}
              {url && <audio ref={side === 'before' ? beforeRef : afterRef} src={url} onEnded={() => setPlaying(null)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function PortfolioEmpty({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', border: '2px dashed var(--border-color)', borderRadius: 20, color: 'var(--text-secondary)' }}>
      <div style={{ fontSize: 40, marginBottom: 14, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340, margin: '0 auto' }}>{sub}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function Portfolio() {
  const navigate = useNavigate();
  const { settings }                                         = useSettings();
  const { websiteShowcase, websiteShowcaseLoading,
          websiteComparisons, websiteComparisonsLoading }    = useData();
  const { playTrack, currentTrack, isPlaying }              = useAudioPlayer();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const artists = websiteShowcase.map((s: any, i: number) => ({
    id:       s.id,
    name:     s.artist || s.title || 'Artist',
    role:     s.type || 'Artist',
    image:    s.thumbnail_url || s.thumb || '',
    audioUrl: s.audioUrl || '',
    color:    ['var(--accent-gold-light)','#5b9fff','#34d18a','#d06adc','#ff9f43'][i % 5],
  }));

  const STATS = [
    { value: settings?.statsProjects ? `${settings.statsProjects}+` : '500+', label: 'Tracks Produced',    Icon: Music2     },
    { value: settings?.statsArtists  ? `${settings.statsArtists}+`  : '200+', label: 'Artists Served',     Icon: Users      },
    { value: '20+',                                                             label: 'Label Partnerships', Icon: Award      },
    { value: settings?.statsViews    ? settings.statsViews           : '1B+',  label: 'Total Views',        Icon: Headphones },
  ];

  const [artistSearch,   setArtistSearch]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const CATEGORY_TABS = ['All', 'Audio', 'Video', 'Software', 'Content'];

  const categoryMatch = (role: string, cat: string) => {
    if (cat === 'All') return true;
    const r = (role || '').toLowerCase();
    if (cat === 'Audio')    return r.includes('audio') || r.includes('music') || r.includes('vocal') || r.includes('nasheed') || r.includes('mixing') || r.includes('mastering') || r.includes('sound') || r.includes('podcast');
    if (cat === 'Video')    return r.includes('video') || r.includes('visual') || r.includes('motion') || r.includes('youtube') || r.includes('reel') || r.includes('film');
    if (cat === 'Software') return r.includes('software') || r.includes('web') || r.includes('app') || r.includes('dev') || r.includes('tech');
    if (cat === 'Content')  return r.includes('content') || r.includes('social') || r.includes('brand') || r.includes('design') || r.includes('graphic');
    return true;
  };

  const filteredArtists = artists.filter((a: any) => {
    const matchesSearch = !artistSearch.trim() || a.name.toLowerCase().includes(artistSearch.toLowerCase()) || (a.role || '').toLowerCase().includes(artistSearch.toLowerCase());
    return matchesSearch && categoryMatch(a.role, categoryFilter);
  });

  const initials = (name: string) => name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', fontFamily: font, color: 'var(--text-primary)' }}>
      <Global styles={css`
        @keyframes portWave { from { transform: scaleY(1); } to { transform: scaleY(0.25); } }
        @keyframes portFloat { from { transform: translateY(0); opacity: 0.6; } to { transform: translateY(-14px); opacity: 0.9; } }
        .p-artist-wrap:hover .p-artist-img { transform: scale(1.06); }
        .p-artist-wrap:hover .play-overlay { opacity: 1 !important; }
        .p-artist-wrap:hover .p-artist-ring { border-color: rgba(217,173,98,0.5) !important; }
        .p-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        @media (max-width: 768px) {
          .p-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
          .p-artist-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important; gap: 16px !important; }
          .p-ba-grid { grid-template-columns: 1fr !important; }
        }
        .p-ba-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 480px) { .p-ba-inner { grid-template-columns: 1fr; } }
      `} />

      <SEO
        title="Portfolio | Tanvir Studio"
        description="Explore artists and productions we've had the privilege to serve. 500+ tracks produced, 200+ artists served, 1B+ total views."
        url="https://tanvir.studio/portfolio"
      />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--card-bg)' }}>
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 520, height: 520, background: 'radial-gradient(ellipse, rgba(196,154,82,0.12) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', borderRadius: '50%', width: i % 3 === 0 ? 5 : 3, height: i % 3 === 0 ? 5 : 3, background: i % 2 === 0 ? 'rgba(217,173,98,0.4)' : 'rgba(91,159,255,0.3)', left: `${7 + i * 9}%`, top: `${16 + (i % 5) * 14}%`, animation: `portFloat ${3 + i * 0.6}s ease-in-out ${i * 0.35}s infinite alternate` }} />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: 800 }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '7px 18px', borderRadius: 100, background: 'rgba(217,173,98,0.1)', border: '1px solid rgba(217,173,98,0.24)' }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold-light)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-gold-light)' }}>Our Work</span>
          </motion.div>

          <h1 className="apple-h1" style={{ margin: '0 0 32px' }}>
            Every track<br />
            <span style={{ background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>tells a story.</span>
          </h1>
          <p className="apple-subtitle" style={{ maxWidth: 540, margin: '0 auto 48px' }}>
            Artists and productions we've had the privilege to serve.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('artists')?.scrollIntoView({ behavior: 'smooth' })}
              className="apple-btn"
            >View Our Work</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/#packages')}
              className="apple-btn apple-btn-secondary"
            >Start Project</motion.button>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}
          onClick={() => document.getElementById('artists')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 1 }}
        ><ChevronDown size={28} /></motion.div>
      </section>

      {/* ── STATS ── */}
      <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '40px 24px' }}>
        <div className="p-stats" style={{ maxWidth: 860, margin: '0 auto' }}>
          {STATS.map(({ value, label, Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ textAlign: 'center' }}>
              <Icon size={20} color="var(--accent-gold)" strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.8 }} />
              <div style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, letterSpacing: '-0.04em', background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>

        {/* ── ARTISTS ── */}
        <section id="artists" style={{ padding: '80px 0', borderBottom: '1px solid var(--border-color)' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: 10 }}>Featured Artists</div>
              <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Clients we've worked with</h2>
            </div>
            {artists.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORY_TABS.map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, border: `1.5px solid ${categoryFilter === cat ? 'var(--accent-gold)' : 'var(--border-color)'}`, background: categoryFilter === cat ? 'rgba(196,154,82,0.1)' : 'transparent', color: categoryFilter === cat ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: font, transition: 'all 0.18s', letterSpacing: '0.02em' }}
                    >{cat}</button>
                  ))}
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <input
                    type="search"
                    aria-label="Search artists"
                    placeholder="Search…"
                    value={artistSearch}
                    onChange={e => setArtistSearch(e.target.value)}
                    style={{ padding: '8px 32px 8px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, fontFamily: font, outline: 'none', width: 160 }}
                  />
                  <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4, fontSize: 13 }}>🔍</span>
                </div>
              </div>
            )}
          </motion.div>

          {websiteShowcaseLoading ? (
            <div className="p-artist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 24 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div className="skeleton" style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 10px', animationDelay: `${i * 0.07}s` }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 6, margin: '0 auto 6px', width: '70%', animationDelay: `${i * 0.07 + 0.1}s` }} />
                  <div className="skeleton" style={{ height: 10, borderRadius: 6, margin: '0 auto', width: '50%', animationDelay: `${i * 0.07 + 0.2}s` }} />
                </div>
              ))}
            </div>
          ) : filteredArtists.length === 0 ? (
            <PortfolioEmpty
              emoji="🎤"
              title={artistSearch ? 'No artists found' : 'No artists added yet'}
              sub={artistSearch ? 'Try a different search term.' : 'Add showcase items from the Website CMS → Audio Showcase tab.'}
            />
          ) : (
            <div className="p-artist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 24 }}>
              {filteredArtists.map((artist: any, i: number) => {
                const isThisTrackPlaying = currentTrack?.id === artist.id && isPlaying;
                return (
                  <motion.div key={artist.id} className="p-artist-wrap"
                    initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }}
                    style={{ textAlign: 'center', position: 'relative' }}
                  >
                    <div className="p-artist-ring" style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 10px', overflow: 'hidden', border: '2px solid var(--border-color)', transition: 'border-color 0.2s', flexShrink: 0, position: 'relative' }}>
                      {artist.image ? (
                        <img src={artist.image} alt={artist.name} className="p-artist-img" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${artist.color}30,${artist.color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: artist.color }}>
                          {initials(artist.name)}
                        </div>
                      )}
                      {artist.audioUrl && (
                        <button
                          onClick={() => playTrack({ id: artist.id, title: artist.name, artist: artist.role, url: artist.audioUrl, coverImage: artist.image })}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isThisTrackPlaying ? 1 : 0, transition: 'opacity 0.2s' }}
                          className="play-overlay"
                        >
                          {isThisTrackPlaying ? <Pause size={28} color="#fff" fill="#fff" /> : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>{artist.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{artist.role}</div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BEFORE & AFTER ── */}
        <section style={{ padding: '80px 0' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: 10 }}>Transformation</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: 'var(--text-primary)' }}>Before & After</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>Hear exactly what our production does to a raw vocal.</p>
          </motion.div>

          {websiteComparisonsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 260, borderRadius: 24, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : websiteComparisons.length === 0 ? (
            <PortfolioEmpty
              emoji="🎚️"
              title="No comparisons added yet"
              sub="Upload Before & After audio samples from the Website CMS → Before vs After tab."
            />
          ) : (
            <div className="p-ba-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {websiteComparisons.map((item: any, i: number) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <BeforeAfterCard item={item} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 14px', color: 'var(--text-primary)' }}>
            Ready to be our next{' '}
            <span style={{ background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>success story?</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Join {settings?.statsArtists ? `${settings.statsArtists}+` : '200+'} artists who trust Tanvir Studio for world-class production.
          </p>
          <button onClick={() => navigate('/contact')} style={{ padding: '13px 34px', borderRadius: 100, background: 'var(--gradient-gold)', color: 'var(--card-bg)', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font, letterSpacing: '-0.01em' }}>
            Start Your Project
          </button>
        </motion.div>
      </section>

    </div>
  );
}
