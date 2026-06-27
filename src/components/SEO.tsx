import { useEffect } from 'react';

const DEFAULT_IMAGE = 'https://tanvir.studio/og-default.jpg';
const TWITTER_HANDLE = '@TanvirStudio';
const BRAND = 'Tanvir Studio';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

function setMeta(nameOrProp: string, content: string, isProp = false) {
  const attr = isProp ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function formatTitle(raw: string): string {
  // Strip any existing brand suffix then re-apply consistently with em dash
  const stripped = raw.replace(/\s*[|—–]\s*Tanvir Studio\s*$/i, '').trim();
  if (!stripped || stripped === BRAND) return `${BRAND} — Where Creativity Speaks`;
  return `${stripped} — ${BRAND}`;
}

export function SEO({ title, description, image, url, type = 'website', canonical, jsonLd }: SEOProps) {
  const formattedTitle = formatTitle(title);

  useEffect(() => {
    document.title = formattedTitle;

    const img = image || DEFAULT_IMAGE;
    const canonicalHref = canonical || url;

    setMeta('og:title', formattedTitle, true);
    setMeta('twitter:title', formattedTitle);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', TWITTER_HANDLE);
    setMeta('twitter:creator', TWITTER_HANDLE);
    setMeta('og:type', type, true);
    setMeta('og:site_name', BRAND, true);
    setMeta('og:image', img, true);
    setMeta('twitter:image', img);

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
      setMeta('twitter:description', description);
    }
    if (url) setMeta('og:url', url, true);

    if (canonicalHref) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalHref);
    }

    if (jsonLd) {
      const id = 'jsonld-schema';
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [formattedTitle, description, image, url, type, canonical, jsonLd]);

  return null;
}
