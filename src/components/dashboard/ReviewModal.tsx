import { X, Star } from 'lucide-react';

interface ReviewModalOrder {
  packageName?: string;
  songName?: string;
  title?: string;
}

interface ReviewModalProps {
  reviewOrder: ReviewModalOrder | null;
  reviewRating: number;
  reviewHover: number;
  reviewText: string;
  reviewSubmitting: boolean;
  onClose: () => void;
  onRatingChange: (rating: number) => void;
  onHoverChange: (rating: number) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}

export function ReviewModal({
  reviewOrder,
  reviewRating,
  reviewHover,
  reviewText,
  reviewSubmitting,
  onClose,
  onRatingChange,
  onHoverChange,
  onTextChange,
  onSubmit,
}: ReviewModalProps) {
  if (!reviewOrder) return null;

  return (

    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid rgba(128,128,128,0.2)', padding: '32px 32px 40px', width: '100%', maxWidth: 400, boxShadow: 'none' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>

          <div>

            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.6px' }}>Leave a Review</div>

            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>{reviewOrder.packageName} — {reviewOrder.songName || reviewOrder.title || 'Your Project'}</div>

          </div>

          <button onClick={() => onClose()} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'rgba(128,128,128,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }}><X size={16} /></button>

        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>

          {[1,2,3,4,5].map(n => (

            <button key={n} onMouseEnter={() => onHoverChange(n)} onMouseLeave={() => onHoverChange(0)} onClick={() => onRatingChange(n)}

              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>

              <Star size={32} fill={(reviewHover || reviewRating) >= n ? 'var(--accent-gold)' : 'transparent'} color={(reviewHover || reviewRating) >= n ? 'var(--accent-gold)' : 'var(--border-color)'} strokeWidth={1.5} />

            </button>

          ))}

        </div>

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 16, fontWeight: 700 }}>

          {(['','Poor','Fair','Good','Very Good','Excellent!'][reviewRating] ?? '')}

        </div>

        <textarea value={reviewText} onChange={e => onTextChange(e.target.value)} placeholder="Share your experience with Tanvir Studio (optional)..." rows={4}

          style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 16, border: '1px solid rgba(128,128,128,0.2)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxShadow: 'none' }} />

        <button onClick={onSubmit} disabled={reviewSubmitting}

          style={{ width: '100%', marginTop: 24, padding: '16px', borderRadius: 16, border: 'none', background: 'var(--accent-gold)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: reviewSubmitting ? 'not-allowed' : 'pointer', opacity: reviewSubmitting ? 0.7 : 1, boxShadow: 'none', transition: 'transform 0.2s' }}>

          {reviewSubmitting ? 'Submitting...' : 'Submit Review'}

        </button>

      </div>

    </div>

  );
}
