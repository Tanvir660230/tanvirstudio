/* eslint-disable @typescript-eslint/no-unused-vars */
import { Global, css } from '@emotion/react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, BookOpen, Mic, Video, Sliders, Music2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { SEO } from '../components/SEO';


// --- TS Fix Globals ---
const accent = 'var(--accent-gold)';
const muted = 'var(--text-secondary)';
const ink = 'var(--text-primary)';
const C = { panel: 'var(--card-bg)', border: 'var(--border-color)', surf: 'var(--surface-1)' };
// ----------------------


const font = "var(--font-sans)";

const CATEGORIES = [
  { id: 'all',    label: 'All Posts' },
  { id: 'audio',  label: 'Audio & Mixing' },
  { id: 'video',  label: 'Video Production' },
  { id: 'tips',   label: 'Studio Tips' },
  { id: 'story',  label: 'Studio Stories' },
];

const CAT_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  audio: Mic,
  video: Video,
  tips:  Sliders,
  story: Music2,
};
const CAT_COLOR: Record<string, string> = {
  audio: 'var(--accent-gold-light)',
  video: '#5b9fff',
  tips:  '#34d18a',
  story: '#d06adc',
};

interface Post {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body: string[];
  date: string;
  readTime: number;
  featured?: boolean;
  image?: string;
  slug?: string;
}

const POSTS: Post[] = [
  {
    id: 'mixing-nasheeds',
    category: 'audio',
    title: 'The Complete Guide to Mixing Nasheeds for Maximum Emotional Impact',
    excerpt: 'Nasheeds are not just music — they are a form of worship and da\'wah. Learn how we approach mixing differently to honour the message and reach the listener\'s heart.',
    body: [
      'Mixing a nasheed requires a different mindset from mixing commercial music. The vocal is the soul of every nasheed — it carries the message, the emotion, and the du\'a. Every processing decision we make must serve that message first.',
      'We start every mix with the raw vocal sitting in mono at unity gain. No EQ, no compression — just listening. What does the singer\'s voice tell us naturally? Where is the warmth? Where is the clarity? This reveals what needs to be enhanced rather than manufactured.',
      'For vocal chain, we favour a gentle high-pass around 80Hz to remove floor rumble, a subtle presence boost between 3–5kHz for intelligibility, and a high-shelf cut at 12kHz+ to keep the vocal warm. Heavy limiting destroys the breath and intimacy that makes a nasheed feel sincere.',
      'Reverb is where many producers over-process Islamic vocals. A large hall reverb can swallow the words. Instead, we use a medium room (around 0.8s decay) for depth, and a pre-delay of 20–30ms to keep the dry vocal sitting forward in the mix. The reverb fills the space — the voice fills the room.',
      'For Arabic vocals especially, watch out for sibilance. The letters س and ش carry strong high-frequency energy. A multi-band compressor or dynamic EQ set to 7–9kHz with a fast attack will tame these transparently without dulling the vocal.',
      'Finally, always export stems. Your client may need the vocal-only track for future use, or a different instrumental arrangement. Clean stems are part of a professional delivery.',
    ],
    date: 'April 8, 2026',
    readTime: 7,
    featured: true,
  },
  {
    id: 'cinematic-lyric-videos',
    category: 'video',
    title: 'How We Create Cinematic Lyric Videos That Elevate the Message',
    excerpt: 'A lyric video is no longer just bouncing text. When done right, it becomes a visual du\'a that keeps the listener watching and reflecting. Here is our full creative process.',
    body: [
      'The first thing we do when we receive a nasheed for lyric video production is listen — not design. We listen three or four full times, noting emotional peaks, transitions, and the moments that move us. Visual design should follow the emotion of the audio, not fight it.',
      'Typography is our primary tool. We choose typefaces that carry cultural weight — classic Arabic calligraphy for Arabic lines, and clean, serif fonts for English translations. We never mix more than two typefaces in a single video.',
      'Motion timing is everything. Each word or line appears on the beat, but more importantly, it leaves the screen with intention. We let important phrases linger 0.3–0.5 seconds after the singer completes them — this allows the viewer to sit with the words.',
      'For colour grading, we build a palette from the music itself. A nasheed with oud and subtle percussion might inspire warm amber and deep shadow tones. A nasheed with choral layers might call for cooler, expansive blues. The colour must feel like it came from the sound.',
      'Subtitles and translations are handled with care. We use a smaller typeface, placed 40px below the main Arabic line, at 70% opacity. The translation should support the original, never compete with it.',
      'Export formats: we deliver H.264 at 1080p for YouTube, H.265 at 4K for archiving, and a vertical 9:16 version for Reels and Shorts. All in the same project rate.',
    ],
    date: 'March 29, 2026',
    readTime: 6,
  },
  {
    id: 'vocal-recording-tips',
    category: 'tips',
    title: '7 Practical Tips for Recording Cleaner Vocals at Home',
    excerpt: 'You don\'t need a professional studio to record great vocals. With the right approach, a bedroom recording can sound remarkably clean. Here\'s exactly what we tell every artist we work with.',
    body: [
      '1. Treat your room first. Blankets, mattresses, and thick curtains reduce reflections dramatically. Record in a corner and face away from parallel walls. A wardrobe full of clothes is one of the best free vocal booths you have access to.',
      '2. Mic position matters more than mic brand. Position your mic 6–8 inches from your mouth, slightly off-axis (angled 10–15 degrees away from directly on-axis). This reduces plosives and captures a more natural sound than recording dead-on.',
      '3. Use a pop filter and a reflection shield. The pop filter stops plosives. The reflection shield reduces room sound reaching the back of the mic. Both together give you a dramatically cleaner raw recording.',
      '4. Gain structure — get this right before anything else. Set your input gain so your loudest passages peak around -12 to -6 dBFS. Never clip. Distorted digital audio at the source cannot be fixed in post.',
      '5. Record multiple takes in series. Do not overdub one mistake at a time. Record three to five full takes, then edit together the best phrases. This keeps the performance energy and emotion consistent.',
      '6. Let the microphone breathe. Pause between takes. Let the room settle. Residual reverb from a previous phrase can muddy the start of the next take if you jump in too quickly.',
      '7. Label your files immediately. Date, artist name, take number. Nothing wastes more studio time than hunting for "the good take" in a folder of unnamed audio files.',
    ],
    date: 'March 15, 2026',
    readTime: 5,
  },
  {
    id: 'nasheed-production-2026',
    category: 'audio',
    title: 'Nasheed Production in 2026: Trends, Tools and What\'s Changed',
    excerpt: 'The Islamic audio space has evolved rapidly over the past two years. Streaming platforms, AI tools, and a growing global audience have all changed how we produce, mix and release nasheeds.',
    body: [
      'Two years ago, most nasheeds were released primarily on YouTube with little attention to streaming platform optimisation. Today, Spotify, Apple Music, and Anghami are major distribution channels for Islamic artists. This changes everything about how we master.',
      'Streaming platforms normalise audio using LUFS (Loudness Units relative to Full Scale). Spotify targets -14 LUFS. This means that mastering simply louder is no longer an advantage — loudness wars are over in the streaming era. We now master for dynamic impact at -14 to -16 LUFS.',
      'AI tools have entered the production workflow but we use them carefully. AI stem separation helps us work with audio-only recordings that need to be arranged. AI noise reduction has become excellent. However, AI should support the engineer\'s decisions, not replace them.',
      'Distribution through labels like Awakening Records and One4Kids Music, or DIY through DistroKid and TuneCore, is now accessible to any artist. Our role is increasingly to prepare release-ready masters and metadata packs alongside the audio itself.',
      'The audience for nasheeds is genuinely global in 2026. A nasheed produced in Bangladesh may find its largest audience in Nigeria, the UK, or Malaysia. This means translation subtitles, multi-language lyric videos, and awareness of cultural resonance across communities are now part of a full production service.',
    ],
    date: 'February 28, 2026',
    readTime: 8,
  },
  {
    id: 'studio-story-first-client',
    category: 'story',
    title: 'Our First Professional Project: What We Learned and Why It Changed Everything',
    excerpt: 'Every studio has a story behind its first real client. This is ours — and the lessons from that experience still shape how we work today.',
    body: [
      'When Tanvir Studio first opened its doors, we had equipment, enthusiasm, and very little else. Our first professional enquiry came from a small Islamic channel looking for a full nasheed production — vocal recording, mixing, mastering, and a lyric video — all within a tight deadline and a tight budget.',
      'We said yes before we were ready. Looking back, this was exactly the right decision.',
      'The recording session was humbling. The artist was experienced; we were not. He knew how he wanted to sound and had strong ideas about the arrangement. We learned that day that listening to the artist is a technical skill, not just a soft skill.',
      'The mix took far longer than it should have because we were second-guessing every decision. This is when we developed what we now call "reference anchoring" — we pick two or three reference tracks with similar arrangements at the start of every mix, and we check against them constantly. It removes subjectivity and speeds up decisions.',
      'When we delivered the final files, the client was gracious with his feedback and specific about two changes he wanted. Both changes improved the mix. This taught us that revision rounds are not a sign of failure — they are collaboration.',
      'That first project is still online. When we listen to it now, we hear the inexperience in some of the processing choices. But we also hear the sincerity in the performance, and that is something no amount of experience can manufacture.',
    ],
    date: 'February 10, 2026',
    readTime: 6,
  },
  {
    id: 'reels-editing-guide',
    category: 'video',
    title: 'Editing Islamic Reels That Actually Get Watched Till the End',
    excerpt: 'Short-form video is the most competitive format in 2026. Here is the framework we use to make Islamic content that holds attention from the first second to the last.',
    body: [
      'The first 1.5 seconds of a Reel are the make-or-break moment. Viewers are scrolling with their thumb ready to continue. The only thing that stops them is a pattern interrupt — something unexpected, something beautiful, or something that speaks directly to a pain or desire they already have.',
      'For Islamic content, the hook is often emotional rather than sensational. A single line of a nasheed hitting the right note. A single sentence from a khutbah that captures a feeling the viewer couldn\'t name. A visual that feels sacred rather than commercial.',
      'Pacing: Islamic Reels should breathe slightly more than entertainment Reels. 0.3 to 0.5 second holds on meaningful frames let the viewer absorb rather than just observe. Cut on the beat for music sections, cut on breath pauses for speech sections.',
      'Audio mixing for vertical video is different. Most viewers are watching on phone speakers or small earbuds. Sub-bass frequencies below 80Hz are largely lost. Prioritise vocal clarity above all else — if the words cannot be heard and understood, the content cannot fulfil its purpose.',
      'Captions are no longer optional. A majority of Reels are watched with the sound off in the first two seconds. If your caption appears in the first frame and is readable, you give the viewer a reason to unmute.',
      'End cards matter more than most creators realise. In the last 2 seconds, use a simple graphic or freeze frame with your studio or artist branding. This trains the algorithm and the audience to recognise your visual identity over time.',
    ],
    date: 'January 22, 2026',
    readTime: 5,
  },
];

function PostCard({ post, dark, ink, muted, panel, border, accent, onClick }: {
  post: Post; dark: boolean; ink: string; muted: string; panel: string; border: string; accent: string; onClick: () => void;
}) {
  const CatIcon = CAT_ICON[post.category] ?? BookOpen;
  const catColor = CAT_COLOR[post.category] ?? 'var(--accent-gold)';

  return (
    <div
      onClick={onClick}
      className="blog-card"
      style={{
        background: panel, border: `1px solid ${border}`, borderRadius: 20, padding: '28px 28px 24px',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CatIcon size={13} color={catColor} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: catColor }}>{CATEGORIES.find(c => c.id === post.category)?.label}</span>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', margin: 0 }}>{post.title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, flexGrow: 1 }}>{post.excerpt}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{post.date}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color={muted} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{post.readTime} min read</span>
          </div>
        </div>
        <ArrowRight size={15} color={accent} />
      </div>
    </div>
  );
}

function ArticleModal({ post, dark, ink, muted, panel, border, accent, onClose }: {
  post: Post; dark: boolean; ink: string; muted: string; panel: string; border: string; accent: string; onClose: () => void;
}) {
  const catColor = CAT_COLOR[post.category] ?? 'var(--accent-gold)';
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 24, maxWidth: 720, width: '100%', padding: '48px 48px 56px', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>×</button>

        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: catColor }}>{CATEGORIES.find(c => c.id === post.category)?.label}</span>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, lineHeight: 1.3, color: 'var(--text-primary)', margin: '16px 0 12px' }}>{post.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{post.date}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color={muted} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{post.readTime} min read</span>
          </div>
        </div>
        <div style={{ width: '100%', height: 1, background: border, marginBottom: 32 }} />
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 28 }}>{post.excerpt}</p>
        {post.body.map((para, i) => (
          <p key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>{para}</p>
        ))}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${border}` }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Need help with your project? <span onClick={onClose} style={{ color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 600 }}>Get in touch →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Blog() {
  const { websiteBlogs, websiteBlogsLoading } = useData();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const postData: Post[] = useMemo(() =>
    websiteBlogs.length > 0
      ? websiteBlogs.map((p: any) => ({
          id: p.id,
          category: p.category || 'audio',
          title: p.title || '',
          excerpt: p.excerpt || '',
          body: Array.isArray(p.body) ? p.body : (p.body ? [p.body] : []),
          date: p.date || '',
          readTime: Number(p.readTime) || 5,
          featured: Boolean(p.featured),
          image: p.image,
          slug: p.slug,
        }))
      : POSTS,
  [websiteBlogs]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const bg     = 'var(--bg-color)';
  const muted  = 'var(--text-secondary)';
  const panel  = 'var(--card-bg)';
  const border = 'var(--border-color)';
  const dark   = document.documentElement.classList.contains('dark');
  

  useEffect(() => {
    document.body.style.backgroundColor = bg;
    return () => { document.body.style.backgroundColor = ''; };
  }, [bg]);

  const q = searchQuery.trim().toLowerCase();
  const byCat = activeCategory === 'all' ? postData : postData.filter(p => p.category === activeCategory);
  const filtered = q ? byCat.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)) : byCat;
  const featured = !q ? postData.find(p => p.featured) : undefined;
  const grid     = filtered.filter(p => !p.featured || activeCategory !== 'all' || !!q);

  const cardProps = { dark, ink, muted, panel, border, accent };

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: font, color: 'var(--text-primary)' }}>
      <Global styles={css`
        .blog-card:hover,.blog-card:active{transform:translateY(-3px);box-shadow: var(--shadow-sm);}
        .blog-card-featured:hover,.blog-card-featured:active{transform:translateY(-3px);box-shadow: var(--shadow-sm);}
      `} />
      <SEO title="Blog | Tanvir Studio" description="Studio insights, production tips, and stories from Tanvir Studio — Bangladesh's leading Islamic audio production house." url="https://tanvir.studio/blog" />

      {/* Hero */}
      <section style={{ padding: '120px 24px 64px', maxWidth: 960, margin: '0 auto' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold)', display: 'block', marginBottom: 16 }}>From the Studio</span>
        <h1 className="apple-h1" style={{ margin: '0 0 20px' }}>
          Ideas, Guides &<br />Studio Stories
        </h1>
        <p className="apple-subtitle" style={{ maxWidth: 520, margin: '0 0 28px' }}>
          Practical knowledge on nasheed production, mixing, video editing, and the craft behind Islamic creative work.
        </p>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <input
            type="search"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 44px 12px 16px',
              borderRadius: 12, border: `1.5px solid ${border}`,
              background: 'var(--card-bg)',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: font, outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <BookOpen size={16} color={muted} />
          </span>
        </div>
      </section>

      {/* Featured post */}
      {featured && activeCategory === 'all' && (
        <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
          <div
            onClick={() => navigate(`/blog/${featured.slug || featured.id}`)}
            className="blog-card-featured"
            style={{
              background: panel, border: `1px solid ${border}`, borderRadius: 24, padding: '40px 44px',
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-gold)', background: `${accent}18`, padding: '4px 10px', borderRadius: 100 }}>Featured</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: CAT_COLOR[featured.category] }}>{CATEGORIES.find(c => c.id === featured.category)?.label}</span>
              </div>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, lineHeight: 1.3, color: 'var(--text-primary)', margin: '0 0 12px' }}>{featured.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 20px' }}>{featured.excerpt}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{featured.date}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} color={muted} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{featured.readTime} min read</span>
                </div>
              </div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${accent}14`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowRight size={20} color={accent} />
            </div>
          </div>
        </section>
      )}

      {/* Category filter */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const on = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '8px 18px', borderRadius: 100, border: `1px solid ${on ? 'var(--accent-gold)' : border}`,
                  background: on ? 'rgba(217, 173, 98, 0.12)' : 'transparent',
                  color: on ? 'var(--accent-gold)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: font, whiteSpace: 'nowrap', transition: 'all 0.18s',
                }}
              >
                {cat.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                  {cat.id === 'all' ? postData.length : postData.filter(p => p.category === cat.id).length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 96px' }}>
        {websiteBlogsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: panel, border: `1px solid ${border}`, borderRadius: 20, height: 240, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {grid.map(post => (
                <PostCard key={post.id} post={post} {...cardProps} onClick={() => navigate(`/blog/${post.slug || post.id}`)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
                {q ? `No posts matching "${searchQuery}".` : 'No posts in this category yet.'}
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
}


