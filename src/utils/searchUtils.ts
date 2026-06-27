/**
 * Returns true if every word in `query` appears in at least one of the given `fields`.
 * Case-insensitive. Empty query always matches.
 */
export function matchesSearch(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().trim().split(/\s+/);
  const haystack = fields.map(f => (f || '').toLowerCase()).join(' ');
  return tokens.every(tok => haystack.includes(tok));
}
