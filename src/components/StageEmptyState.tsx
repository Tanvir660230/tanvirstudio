import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';

interface StageEmptyStateProps {
  stageId: string;
  stageTitle: string;
  isFiltered: boolean;
  filterLabel?: string;
  isAdmin: boolean;
  onAdd?: () => void;
  onClearFilter?: () => void;
}

// Per-stage accent colors matching the pipeline
const STAGE_ACCENT: Record<string, string> = {
  recording:   'var(--color-danger)',
  arrangement: 'var(--accent-purple)',
  humming:     '#E91E63',
  composition: 'var(--color-info)',
  revision:    'var(--color-warning)',
  delivered:   'var(--color-success)',
  completed:   '#8E8E93',
};

/* ─── Per-stage SVG illustrations ─── */
function StageIllustration({ stageId }: { stageId: string }) {
  const accent = STAGE_ACCENT[stageId] || 'var(--color-info)';

  const icons: Record<string, React.ReactNode> = {
    recording: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Mic capsule */}
        <rect x="27" y="10" width="18" height="28" rx="9"
          fill={`${accent}22`} stroke={accent} strokeWidth="2" />
        {/* Mic center dot */}
        <circle cx="36" cy="24" r="4" fill={accent} opacity="0.5" />
        {/* Stand arc */}
        <path d="M18 38 C18 52 54 52 54 38"
          stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Pole + base */}
        <line x1="36" y1="52" x2="36" y2="62" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="62" x2="46" y2="62" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        {/* Wave left */}
        <path d="M12 30 Q6 37 12 44" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />
        {/* Wave right */}
        <path d="M60 30 Q66 37 60 44" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.45" />
      </svg>
    ),
    arrangement: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Bars */}
        <rect x="10" y="42" width="10" height="20" rx="4" fill={`${accent}30`} stroke={accent} strokeWidth="2" />
        <rect x="24" y="26" width="10" height="36" rx="4" fill={`${accent}40`} stroke={accent} strokeWidth="2" />
        <rect x="38" y="34" width="10" height="28" rx="4" fill={`${accent}50`} stroke={accent} strokeWidth="2" />
        <rect x="52" y="14" width="10" height="48" rx="4" fill={`${accent}22`} stroke={accent} strokeWidth="2" />
        {/* Baseline */}
        <line x1="8" y1="64" x2="64" y2="64" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
    humming: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Note stem + head */}
        <circle cx="26" cy="54" r="7" fill={`${accent}30`} stroke={accent} strokeWidth="2" />
        <circle cx="50" cy="46" r="7" fill={`${accent}30`} stroke={accent} strokeWidth="2" />
        <line x1="33" y1="54" x2="33" y2="18" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="57" y1="46" x2="57" y2="12" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        {/* Beam */}
        <path d="M33 18 L57 12" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        {/* Sparkles */}
        <circle cx="14" cy="20" r="2" fill={accent} opacity="0.35" />
        <circle cx="60" cy="60" r="2" fill={accent} opacity="0.35" />
        <circle cx="62" cy="24" r="1.5" fill={accent} opacity="0.25" />
      </svg>
    ),
    composition: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Staff lines */}
        {[20, 28, 36, 44, 52].map((y, i) => (
          <line key={i} x1="12" y1={y} x2="60" y2={y}
            stroke={accent} strokeWidth="1" opacity={0.2 + i * 0.06} strokeLinecap="round" />
        ))}
        {/* Treble clef */}
        <path d="M24 52 C24 40 32 34 32 26 C32 20 28 18 26 22 C24 26 26 30 30 30 C36 30 36 22 32 18"
          stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Note 1 */}
        <ellipse cx="46" cy="44" rx="5" ry="3.5" fill={`${accent}40`} stroke={accent} strokeWidth="1.5" transform="rotate(-15 46 44)" />
        <line x1="51" y1="43" x2="51" y2="26" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        {/* Flag */}
        <path d="M51 26 Q60 30 55 38" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
    revision: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Circular arrows */}
        <path d="M52 36 A16 16 0 1 1 36 20"
          stroke={accent} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <polyline points="36,14 36,20 42,20"
          stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Pencil */}
        <rect x="42" y="42" width="6" height="18" rx="2"
          fill={`${accent}25`} stroke={accent} strokeWidth="1.8"
          transform="rotate(-45 42 42)" />
        <path d="M38 58 L36 64 L42 62 Z"
          fill={accent} opacity="0.5" />
      </svg>
    ),
    delivered: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Box body */}
        <path d="M16 32 L36 22 L56 32 L56 56 L36 66 L16 56 Z"
          fill={`${accent}15`} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
        {/* Center fold */}
        <line x1="36" y1="22" x2="36" y2="66" stroke={accent} strokeWidth="1.2" opacity="0.3" />
        <line x1="16" y1="32" x2="56" y2="32" stroke={accent} strokeWidth="1.2" opacity="0.3" />
        {/* Ribbon */}
        <path d="M26 27 L36 32 L46 27" stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Check */}
        <path d="M28 44 L33 50 L46 38" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    completed: (
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        {/* Trophy */}
        <path d="M24 20 L24 42 C24 52 48 52 48 42 L48 20 Z"
          fill={`${accent}18`} stroke={accent} strokeWidth="2" strokeLinejoin="round" />
        {/* Handles */}
        <path d="M24 28 C14 28 14 40 24 40" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M48 28 C58 28 58 40 48 40" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Stem + base */}
        <line x1="36" y1="52" x2="36" y2="60" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="60" x2="46" y2="60" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        {/* Star */}
        <path d="M36 28 L38 33 L43 33 L39 36 L41 41 L36 38 L31 41 L33 36 L29 33 L34 33 Z"
          fill={accent} opacity="0.6" />
      </svg>
    ),
  };

  return icons[stageId] || icons.recording;
}

const STAGE_MESSAGES: Record<string, { headline: string; sub: string }> = {
  recording:   { headline: 'No projects recording',   sub: 'Projects that need studio sessions will appear here.' },
  arrangement: { headline: 'Nothing to arrange yet',  sub: 'Tracks ready for arrangement will show up here.' },
  humming:     { headline: 'No vocal work pending',   sub: 'Projects needing humming or vocal takes live here.' },
  composition: { headline: 'No compositions active',  sub: 'Projects in the composition phase will appear here.' },
  revision:    { headline: 'No revisions pending',    sub: 'Projects sent back for changes will appear here.' },
  delivered:   { headline: 'Nothing delivered yet',   sub: 'Completed deliveries awaiting client confirmation.' },
  completed:   { headline: 'No completed projects',   sub: 'Finished and approved projects will archive here.' },
};

export function StageEmptyState({
  stageId, stageTitle, isFiltered, filterLabel,
  isAdmin, onAdd, onClearFilter,
}: StageEmptyStateProps) {
  const msg = STAGE_MESSAGES[stageId] || {
    headline: `No projects in ${stageTitle}`,
    sub: 'Projects assigned to this stage will appear here.',
  };
  const accent = STAGE_ACCENT[stageId] || 'var(--color-info)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 40px 52px',
        borderRadius: '20px',
        border: `1.5px dashed ${accent}35`,
        background: `linear-gradient(160deg, ${accent}07 0%, transparent 60%), var(--card-bg)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft background glow */}
      <div style={{
        position: 'absolute',
        top: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '220px',
        height: '220px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Illustration container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '24px',
          background: `linear-gradient(145deg, ${accent}14, ${accent}06)`,
          border: `1.5px solid ${accent}28`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: 'none',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <StageIllustration stageId={stageId} />
      </motion.div>

      {/* Stage badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.3 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '100px',
          background: `${accent}14`,
          border: `1px solid ${accent}28`,
          fontSize: '11px',
          fontWeight: '600',
          color: accent,
          letterSpacing: '0.3px',
          marginBottom: '12px',
          textTransform: 'uppercase',
          zIndex: 1,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        {stageTitle}
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '-0.4px',
          marginBottom: '8px',
          zIndex: 1,
        }}
      >
        {isFiltered ? `No ${filterLabel} projects in ${stageTitle}` : msg.headline}
      </motion.div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.3 }}
        style={{
          fontSize: '13.5px',
          color: 'var(--text-secondary)',
          maxWidth: '300px',
          lineHeight: 1.65,
          margin: '0 0 28px',
          zIndex: 1,
        }}
      >
        {isFiltered
          ? `Try switching to "All" to see everything in this stage.`
          : msg.sub}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.3 }}
        style={{ display: 'flex', gap: '10px', alignItems: 'center', zIndex: 1 }}
      >
        {isFiltered && onClearFilter && (
          <button
            onClick={onClearFilter}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-color)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              transition: 'all 0.18s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = accent + '60';
              e.currentTarget.style.color = accent;
              e.currentTarget.style.background = accent + '0c';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'var(--bg-color)';
            }}
          >
            <Filter size={13} />
            Clear Filter
          </button>
        )}

        {isAdmin && !isFiltered && onAdd && (
          <button
            id={`empty-state-add-btn-${stageId}`}
            onClick={onAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '11px 22px',
              borderRadius: '12px',
              background: accent,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: '700',
              letterSpacing: '-0.1px',
              boxShadow: 'none',
              transition: 'all 0.18s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${accent}55`;
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 16px ${accent}40`;
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Add New Project
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
