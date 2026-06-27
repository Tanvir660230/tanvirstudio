export function generateWhatsAppLink(phone: string, text?: string): string {
  if (!phone) return '#';

  // Strip everything except digits and leading +
  let clean = phone.replace(/[^\d+]/g, '');

  // Normalise BD numbers: 01XXXXXXXX → 8801XXXXXXXX
  if (clean.startsWith('0')) {
    clean = '880' + clean.slice(1);
  }

  // Remove all + signs (wa.me requires digits only)
  clean = clean.replace(/\+/g, '');

  if (!clean) return '#';

  return text
    ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${clean}`;
}
