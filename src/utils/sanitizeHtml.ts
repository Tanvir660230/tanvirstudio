// Minimal allowlist sanitizer for short, translation-driven inline HTML snippets
// (e.g. hero titles with a highlighted <span> or a <br/>). Any tag not on the
// allowlist is unwrapped to plain text; only `class`/`style` survive on <span>,
// and `style` must match a narrow "safe CSS" character set.
const ALLOWED_TAGS = new Set(['SPAN', 'BR']);
const ALLOWED_ATTRS = new Set(['class', 'style']);
const SAFE_STYLE = /^[a-zA-Z0-9\s\-:;#%.,]*$/;

export function sanitizeInlineHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (parent: Node) => {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;

      if (!ALLOWED_TAGS.has(el.tagName)) {
        parent.replaceChild(doc.createTextNode(el.textContent || ''), el);
        return;
      }

      Array.from(el.attributes).forEach((attr) => {
        const safe = ALLOWED_ATTRS.has(attr.name) && (attr.name !== 'style' || SAFE_STYLE.test(attr.value));
        if (!safe) el.removeAttribute(attr.name);
      });

      walk(el);
    });
  };

  walk(doc.body);
  return doc.body.innerHTML;
}
