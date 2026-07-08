import type { CSSProperties } from 'react';

/** Formats an ISO date string as a short relative time, e.g. "5m ago". */
export function timeAgo(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Builds the WhatsApp status-update message for a given order, based on its current status. */
export function getWaMessage(order: any, studioName = 'Tanvir Studio'): string {
  const name   = order.client || '';
  const pkg    = order.packageName || '';
  const song   = order.songName ? ` for "${order.songName}"` : '';
  const ref    = order.orderRef ? ` (Ref: ${order.orderRef})` : '';
  const studio = `- ${studioName}`;

  switch (order.status) {
    case 'pending':
      return `Hi ${name}, we have received your ${pkg} order${song}${ref}. We are currently reviewing it and will contact you within 24 hours. Thank you! ${studio}`;
    case 'new':
    // falls through
    case 'recording':
    // falls through
    case 'composition': {
      const dateStr = order.recordingDate
        ? ` Session: ${new Date(order.recordingDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`
        : '';
      return `Hi ${name}, your ${pkg} order${song}${ref} has been accepted!${dateStr} We will be in touch with the next steps. ${studio}`;
    }
    case 'delivered':
      return `Hi ${name}, your ${pkg} project${song}${ref} has been delivered! Please check your files and let us know if you need any changes. ${studio}`;
    case 'completed':
      return `Hi ${name}, your ${pkg} project${song}${ref} is now complete. Thank you for choosing Tanvir Studio! ${studio}`;
    case 'declined':
      return `Hi ${name}, regarding your ${pkg} order${song}${ref} - unfortunately we are unable to proceed at this time. Please contact us to discuss alternatives. ${studio}`;
    default:
      return `Hi ${name}, here is an update on your ${pkg} order${song}${ref}. ${studio}`;
  }
}

/** Parses the reference link and notes out of an order's freeform `description` field. */
export function parseDesc(description: string) {
  const lines = (description || '').split('\n');
  const ref = lines.find(l => l.startsWith('Reference:'))?.replace('Reference: ', '').trim() || '';
  const ni = lines.findIndex(l => l === 'Notes:');
  const notes = ni >= 0 ? lines.slice(ni + 1).join('\n').trim() : '';
  return { ref, notes };
}

/** Shared pill/button style used across the order-list action rows and the edit modal footer. */
export const actionBtn = (color: string, filled: boolean): CSSProperties => ({
  height: 40, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
  fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
  border: filled ? 'none' : `1px solid ${color}40`,
  background: filled ? color : `${color}14`,
  color: filled ? 'var(--card-bg)' : color,
  textDecoration: 'none', flexShrink: 0, fontFamily: 'inherit',
});
