/**
 * Lightweight localStorage cache for public Firestore website_* collections.
 * TTL = 1 hour. Silently no-ops on quota errors or SSR environments.
 */

const TTL_MS  = 60 * 60 * 1000; // 1 hour
const PREFIX  = 'ts_cache_';

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > TTL_MS) { localStorage.removeItem(PREFIX + key); return null; }
    return data;
  } catch { return null; }
}

export function setCached(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export function invalidateCache(key: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

export function invalidateAllWebsiteCache(): void {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
