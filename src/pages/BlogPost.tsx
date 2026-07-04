 
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, Mic, Video, Sliders, Music2, Share2 } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useData } from '../contexts/DataContext';




const font = "var(--font-sans)";

// Pre-computed skeleton widths to avoid Math.random() during render
const SKELETON_WIDTHS = ['83%', '91%', '87%', '95%', '80%'];

const CAT_COLOR: Record<string, string> = { audio: 'var(--accent-gold-light)', video: '#5b9fff', tips: '#34d18a', story: '#d06adc' };
const CAT_LABEL: Record<string, string> = { audio: 'Audio & Mixing', video: 'Video Production', tips: 'Studio Tips', story: 'Studio Stories' };
const CAT_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = { audio: Mic, video: Video, tips: Sliders, story: Music2 };

interface Post {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  body: string[];
  date: string;
  readTime: number;
  featured?: boolean;
  tags?: string[];
  image?: string;
}

const POSTS_FALLBACK: Post[] = [
  {
    id: 'mixing-nasheeds', category: 'audio',
    title: 'The Complete Guide to Mixing Nasheeds for Maximum Emotional Impact',
    excerpt: "Nasheeds are not just music — they are a form of worship and da'wah. Learn how we approach mixing differently to honour the message and reach the listener's heart.",
    body: [
      "Mixing a nasheed requires a different mindset from mixing commercial music. The vocal is the soul of every nasheed — it carries the message, the emotion, and the du'a. Every processing decision we make must serve that message first.",
      "We start every mix with the raw vocal sitting in mono at unity gain. No EQ, no compression — just listening. What does the singer's voice tell us naturally? Where is the warmth? Where is the clarity? This reveals what needs to be enhanced rather than manufactured.",
      "For vocal chain, we favour a gentle high-pass around 80Hz to remove floor rumble, a subtle presence boost between 3–5kHz for intelligibility, and a high-shelf cut at 12kHz+ to keep the vocal warm. Heavy limiting destroys the breath and intimacy that makes a nasheed feel sincere.",
      "Reverb is where many producers over-process Islamic vocals. A large hall reverb can swallow the words. Instead, we use a medium room (around 0.8s decay) for depth, and a pre-delay of 20–30ms to keep the dry vocal sitting forward in the mix. The reverb fills the space — the voice fills the room.",
      "For Arabic vocals especially, watch out for sibilance. The letters س and ش carry strong high-frequency energy. A multi-band compressor or dynamic EQ set to 7–9kHz with a fast attack will tame these transparently without dulling the vocal.",
      "Finally, always export stems. Your client may need the vocal-only track for future use, or a different instrumental arrangement. Clean stems are part of a professional delivery.",
    ],
    date: 'April 8, 2026', readTime: 7, featured: true,
  },
  {
    id: 'cinematic-lyric-videos', category: 'video',
    title: 'How We Create Cinematic Lyric Videos That Elevate the Message',
    excerpt: "A lyric video is no longer just bouncing text. When done right, it becomes a visual du'a that keeps the listener watching and reflecting. Here is our full creative process.",
    body: [
      "The first thing we do when we receive a nasheed for lyric video production is listen — not design. We listen three or four full times, noting emotional peaks, transitions, and the moments that move us. Visual design should follow the emotion of the audio, not fight it.",
      "Typography is our primary tool. We choose typefaces that carry cultural weight — classic Arabic calligraphy for Arabic lines, and clean, serif fonts for English translations. We never mix more than two typefaces in a single video.",
      "Motion timing is everything. Each word or line appears on the beat, but more importantly, it leaves the screen with intention. We let important phrases linger 0.3–0.5 seconds after the singer completes them — this allows the viewer to sit with the words.",
      "For colour grading, we build a palette from the music itself. A nasheed with oud and subtle percussion might inspire warm amber and deep shadow tones. A nasheed with choral layers might call for cooler, expansive blues. The colour must feel like it came from the sound.",
      "Subtitles and translations are handled with care. We use a smaller typeface, placed 40px below the main Arabic line, at 70% opacity. The translation should support the original, never compete with it.",
      "Export formats: we deliver H.264 at 1080p for YouTube, H.265 at 4K for archiving, and a vertical 9:16 version for Reels and Shorts. All in the same project rate.",
    ],
    date: 'March 29, 2026', readTime: 6,
  },
];

export function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { websiteBlogs, websiteBlogsLoading } = useData();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const bg     = 'var(--bg-color)';
  const muted  = 'var(--text-secondary)';
  const border = 'var(--border-color)';

  const allPosts = websiteBlogs.length > 0
    ? websiteBlogs.map((p: any) => ({
        id: p.id,
        category: p.category || 'audio',
        title: p.title || '',
        excerpt: p.excerpt || '',
        body: Array.isArray(p.body) ? p.body : (p.body ? p.body.split('\n\n').filter(Boolean) : []),
        date: p.date || '',
        readTime: Number(p.readTime) || 5,
        featured: Boolean(p.featured),
        image: p.image,
      }))
    : POSTS_FALLBACK;

  const post = allPosts.find((p: any) => p.id === id || p.slug === id);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return allPosts.filter((p: any) => p.id !== post.id && p.category === post.category).slice(0, 2);
  }, [allPosts, post]);

  if (!websiteBlogsLoading && !post) {
    navigate('/blog', { replace: true });
    return null;
  }

  if (websiteBlogsLoading || !post) {
    return (
      <div style={{ background: bg, minHeight: '100vh', fontFamily: font }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '140px 24px' }}>
          <div className="skeleton" style={{ height: 16, width: 100, borderRadius: 8, marginBottom: 32 }} />
          <div className="skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 40, width: '60%', borderRadius: 8, marginBottom: 40 }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 18, borderRadius: 6, marginBottom: 12, width: SKELETON_WIDTHS[i], animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const catColor = CAT_COLOR[post.category] ?? 'var(--accent-gold)';
  const catLabel = CAT_LABEL[post.category] ?? post.category;
  const CatIcon  = CAT_ICON[post.category] ?? BookOpen;
  const pageUrl  = `https://tanvir.studio/blog/${post.id}`;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.image || 'https://tanvir.studio/og-default.jpg',
    url: pageUrl,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Tanvir Studio', url: 'https://tanvir.studio' },
    publisher: { '@type': 'Organization', name: 'Tanvir Studio', logo: { '@type': 'ImageObject', url: 'https://tanvir.studio/Logo.jpg' } },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://tanvir.studio/' },
      { '@type': 'ListItem', position: 2, name: 'Blog',  item: 'https://tanvir.studio/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl },
    ],
  };

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: font, color: 'var(--text-primary)' }}>
      <SEO
        title={`${post.title} | Tanvir Studio Blog`}
        description={post.excerpt}
        url={pageUrl}
        image={post.image}
        type="article"
        canonical={pageUrl}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article style={{ maxWidth: 720, margin: '0 auto', padding: '120px 24px 96px' }}>
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/blog')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: font, marginBottom: 40, padding: 0 }}
        >
          <ArrowLeft size={15} /> Back to Blog
        </motion.button>

        {/* Category badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CatIcon size={13} color={catColor} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: catColor }}>{catLabel}</span>
            {post.featured && (
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-gold)', background: `#007AFF18`, padding: '3px 9px', borderRadius: 100, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Featured</span>
            )}
          </div>

          {/* Title */}
          <h1 className="apple-h1" style={{ margin: '0 0 20px' }}>
            {post.title}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, paddingBottom: 32, borderBottom: `1px solid ${border}` }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{post.date}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={muted} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{post.readTime} min read</span>
            </div>
          </div>

          {/* Hero image */}
          {post.image && (
            <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 36, aspectRatio: '16/9' }}>
              <img src={post.image} alt={post.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Excerpt (pull quote) */}
          <p className="apple-subtitle" style={{ fontStyle: 'italic', borderLeft: `3px solid ${catColor}`, paddingLeft: 18, marginBottom: 32 }}>
            {post.excerpt}
          </p>

          {/* Body */}
          {(Array.isArray(post.body) ? post.body : [post.body]).map((para: string, i: number) => (
            <p key={i} className="apple-subtitle" style={{ marginBottom: 22 }}>
              {para}
            </p>
          ))}

          {/* CTA */}
          <div style={{ marginTop: 48, padding: '28px 32px', background: `${catColor}08`, border: `1px solid ${catColor}22`, borderRadius: 18 }}>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.65 }}>
              Need professional audio or video production? We'd love to help with your next project.
            </p>
            <button
              onClick={() => navigate('/contact')}
              style={{ padding: '11px 28px', borderRadius: 100, background: `linear-gradient(135deg, ${catColor}, ${catColor}88)`, color: 'var(--text-primary)', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
            >
              Get in Touch →
            </button>
          </div>

          {/* Share */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Share2 size={13} /> Share
              </span>
              {[
                { label: 'WhatsApp', color: '#25d366', href: `https://wa.me/?text=${encodeURIComponent(post.title + ' — ' + pageUrl)}` },
                { label: 'Facebook', color: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}` },
                { label: 'Twitter / X', color: 'var(--text-primary)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(pageUrl)}` },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer noopener"
                  style={{ padding: '7px 16px', borderRadius: 100, background: 'var(--card-bg)', border: `1px solid ${border}`, color: s.color, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'opacity 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div style={{ marginTop: 52 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Related Posts</div>
              <div style={{ display: 'grid', gridTemplateColumns: relatedPosts.length > 1 ? '1fr 1fr' : '1fr', gap: 16 }}>
                {relatedPosts.map((rp: any) => (
                  <button key={rp.id} onClick={() => navigate(`/blog/${rp.id}`)}
                    style={{ textAlign: 'left', background: 'var(--card-bg)', border: `1px solid ${border}`, borderRadius: 16, padding: '20px', cursor: 'pointer', fontFamily: font, transition: 'border-color 0.15s, transform 0.15s' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = catColor; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = border; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: catColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{CAT_LABEL[rp.category] ?? rp.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>{rp.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {rp.readTime} min read
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </article>

    </div>
  );
}


