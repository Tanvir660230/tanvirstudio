import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Music2, Mic, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SortableTaskProps {
  task: any;
  userRole?: string;
  isOverlay?: boolean;
  openDetails: (task: any) => void;
  navigate?: any;
  isHighlighted?: boolean;
  currency?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function SortableTask({ task, userRole, isOverlay, openDetails, isHighlighted, currency = '৳', isSelected, onToggleSelect }: SortableTaskProps) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (task.status === 'recording' && task.recordingDate) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [task.status, task.recordingDate]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isOverlay,
  });

  const style = isOverlay ? undefined : {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  };

  const isClient = userRole === 'client';
  const isAdmin  = userRole === 'admin';
  const isWorker = userRole === 'composer' || userRole === 'humming_artist';

  /* ── Deadline ─────────────────────────────────── */
  const deadlineInfo = (() => {
    if (!task.deliveryDate) return { label: 'No deadline', sub: null, color: 'var(--text-tertiary)', icon: 'none', urgent: false };
    const diff = Math.ceil((new Date(task.deliveryDate).getTime() - now) / 86400000);
    const done = task.status === 'completed' || task.status === 'delivered';
    const formatted = new Date(task.deliveryDate).toLocaleString('en-US', { month: 'short', day: 'numeric' });
    if (done)     return { label: formatted, sub: 'Delivered', color: 'var(--text-tertiary)', icon: 'done', urgent: false };
    if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, sub: formatted, color: 'var(--color-danger)', icon: 'overdue', urgent: true };
    if (diff === 0) return { label: 'Due today', sub: formatted, color: 'var(--color-warning)', icon: 'today', urgent: true };
    if (diff <= 3)  return { label: `${diff}d left`, sub: formatted, color: 'var(--color-warning)', icon: 'soon', urgent: false };
    return { label: formatted, sub: `${diff} days left`, color: 'var(--text-secondary)', icon: 'normal', urgent: false };
  })();

  /* ── Finance ───────────────────────────────────── */
  const budget   = Number(task.budget) || 0;
  const paid     = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const due      = budget - paid;
  const paidFull = due <= 0 && budget > 0;
  const pct      = budget > 0 ? Math.min(100, Math.round((paid / budget) * 100)) : 0;

  /* ── Profit Margin ─────────────────────────────── */
  const composerCost = task.composerCommissionType === 'percentage'
    ? budget * (Number(task.composerCommissionPct) || 0) / 100
    : Number(task.composerCommissionAmount) || 0;
  const hummingCost = (task.needsHumming && task.hummingArtistId)
    ? (task.hummingArtistCommissionType === 'percentage'
        ? budget * (Number(task.hummingArtistCommissionPct) || 0) / 100
        : Number(task.hummingArtistCommissionAmount) || 0)
    : 0;
  const margin = budget - composerCost - hummingCost;

  /* ── Worker Finance ────────────────────────────── */
  const myEarned = userRole === 'composer' ? composerCost : userRole === 'humming_artist' ? hummingCost : 0;
  const myPaid = userRole === 'composer' ? (Number(task.composerPaid)||0) : userRole === 'humming_artist' ? (Number(task.hummingArtistPaid)||0) : 0;
  const myDue = myEarned - myPaid;

  /* ── Labels ────────────────────────────────────── */
  const clientName = task.client || '—';
  const initials   = clientName !== '—' ? clientName.split(' ').filter((w: string) => w.length > 0).map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() || 'TS' : 'TS';

  /* ── Milestones ────────────────────────────────── */
  const ms     = task.milestones || [];
  const msDone = ms.filter((m: any) => m.completed).length;

  /* ── Recording Countdown ───────────────────────── */
  const recordingInfo = (() => {
    if (task.status !== 'recording' || !task.recordingDate) return null;
    const recTime = new Date(task.recordingDate).getTime();
    const durationMs = (task.recordingDuration || 60) * 60 * 1000;
    const diff = recTime - now;
    
    if (diff <= 0 && diff > -durationMs) {
      return { label: 'RECORDING NOW', color: 'var(--color-danger)', isLive: true };
    }
    if (diff <= -durationMs) {
      return { label: 'RECORDING DONE', color: 'var(--color-success)', isLive: false };
    }
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    const isUrgent = diff < 24 * 60 * 60 * 1000;
    const color = isUrgent ? 'var(--color-danger)' : 'var(--accent-purple)';
    
    let timeStr = '';
    if (d > 0) timeStr += `${d}d `;
    timeStr += `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    
    return { label: `REC IN ${timeStr}`, color, isLive: isUrgent };
  })();

  return (
    <div id={`task-${task.id}`} ref={isOverlay ? undefined : setNodeRef} style={style} {...(isOverlay || isClient ? {} : { ...attributes, ...listeners })}>
      <motion.div
        onClick={() => openDetails(task)}
        animate={isHighlighted ? { 
          scale: [1, 1.01, 1],
          boxShadow: [
            '0 2px 8px rgba(0,0,0,0.02)',
            '0 0 15px rgba(0,122,255,0.15)',
            '0 2px 8px rgba(0,0,0,0.02)'
          ]
        } : {}}
        transition={isHighlighted ? { 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        } : {}}
        className="sortable-task-row hover-row"
        style={{
          background: 'var(--card-bg)',
          borderRadius: '14px',
          border: isHighlighted ? '1px solid #007AFF' : '1px solid var(--border-color)',
          boxShadow: isDragging
            ? '0 24px 48px rgba(0,0,0,0.15), 0 0 0 2px rgba(196,154,82,0.3)'
            : isHighlighted
              ? '0 0 0 1px #007AFF, 0 4px 16px rgba(0,122,255,0.08)'
              : 'var(--shadow-xs)',
          cursor: isClient ? 'pointer' : isDragging ? 'grabbing' : 'grab',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          overflow: 'hidden',
          position: 'relative',
          zIndex: isDragging || isHighlighted ? 1000 : 1,
        }}
      >
        {isHighlighted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.03, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0,
              background: 'var(--color-info)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        )}
        
        {/* Main row */}
        <div className="task-row-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: (!isClient && !isOverlay ? '16px ' : '') + `minmax(160px,2fr) minmax(140px,1fr) minmax(180px,1.4fr)`,
          alignItems: 'center', 
          padding: '14px 16px',
          gap: '16px'
        }}>
          
          {/* Select checkbox */}
          {onToggleSelect && !isOverlay && (
            <div
              onClick={e => { e.stopPropagation(); onToggleSelect(task.id); }}
              style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? 'var(--color-info)' : 'var(--border-color)'}`, background: isSelected ? 'var(--color-info)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
            >
              {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
          )}

          {/* Draggable indicator */}
          {!isClient && !isOverlay && !onToggleSelect && (
            <div className="desktop-only" style={{ color: 'var(--text-tertiary)', opacity: 0.2, alignItems: 'center', justifyContent: 'center' }}>
              <GripVertical size={16} />
            </div>
          )}

          {/* Top Section (Monogram + Info) */}
          <div className="task-row-top" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            {/* Client monogram */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-color)', 
              border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              boxShadow: 'none'
            }}>
              {initials}
            </div>

            {/* Core info */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {deadlineInfo.urgent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: deadlineInfo.color, flexShrink: 0 }} />}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(task.title || 'Untitled Project');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title={copied ? '✓ Copied!' : 'Click to copy project name'}
                  style={{
                    fontSize: '16px', fontWeight: '600',
                    color: copied ? 'var(--color-success)' : 'var(--text-primary)',
                    letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: 'pointer', transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--color-info)'; }}
                  onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-primary)'; }}
                >
                  {task.title || 'Untitled Project'}
                </span>
                {task.priority === 'urgent' && (
                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '2px 6px', borderRadius: 100, border: '1px solid rgba(255,59,48,0.2)', letterSpacing: '0.5px', flexShrink: 0 }}>URGENT</span>
                )}
                {task.priority === 'high' && (
                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--color-warning)', background: 'rgba(255,149,0,0.1)', padding: '2px 6px', borderRadius: 100, border: '1px solid rgba(255,149,0,0.2)', letterSpacing: '0.5px', flexShrink: 0 }}>HIGH</span>
                )}
              </div>

              {/* Description snippet */}
              {task.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                  {task.description}
                </div>
              )}

              {/* Client + team row - Minimal Pill Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '400' }}>
                  {clientName}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {task.composerId && (
                    <span title="Composer assigned" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '500', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--border-color)' }}>
                      <Music2 size={10} /> Comp
                    </span>
                  )}
                  {task.needsHumming && task.hummingArtistId && (
                    <span title="Vocal artist assigned" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '500', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '2px 8px', borderRadius: '100px', border: '1px solid var(--border-color)' }}>
                      <Mic size={10} /> Vocal
                    </span>
                  )}
                  {ms.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '500', color: msDone === ms.length ? 'var(--color-success)' : 'var(--text-secondary)', background: msDone === ms.length ? 'rgba(52,199,89,0.1)' : 'var(--bg-color)', padding: '2px 8px', borderRadius: '100px', border: `1px solid ${msDone === ms.length ? 'rgba(52,199,89,0.2)' : 'var(--border-color)'}` }}>
                      <CheckCircle2 size={10} /> {msDone}/{ms.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Status & Timers ─── */}
          <div className="task-row-middle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px', paddingLeft: '20px', borderLeft: '1px solid var(--border-color)' }}>
            
            {/* Recording Countdown chip */}
            {recordingInfo && (
              <motion.div 
                animate={recordingInfo.isLive ? { opacity: [1, 0.6, 1] } : {}}
                transition={recordingInfo.isLive ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '100px',
                  background: recordingInfo.isLive ? `${recordingInfo.color}15` : 'var(--bg-color)',
                  border: `1px solid ${recordingInfo.isLive ? recordingInfo.color + '40' : 'var(--border-color)'}`,
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {recordingInfo.isLive && (
                    <motion.div 
                      animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: recordingInfo.color }}
                    />
                  )}
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: recordingInfo.color, zIndex: 1 }} />
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '700',
                  color: recordingInfo.color, whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.3px'
                }}>
                  {recordingInfo.label}
                </span>
              </motion.div>
            )}

            {/* Deadline */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: deadlineInfo.urgent ? '4px 10px' : '2px 0',
              borderRadius: '100px',
              background: deadlineInfo.urgent ? `${deadlineInfo.color}12` : 'transparent',
              border: `1px solid ${deadlineInfo.urgent ? deadlineInfo.color + '25' : 'transparent'}`,
            }}>
              {deadlineInfo.icon === 'overdue' && <AlertCircle size={14} color={deadlineInfo.color} />}
              {deadlineInfo.icon === 'today'   && <AlertCircle size={14} color={deadlineInfo.color} />}
              {deadlineInfo.icon === 'soon'    && <Clock size={14} color={deadlineInfo.color} />}
              {(deadlineInfo.icon === 'normal' || deadlineInfo.icon === 'none') && <Calendar size={14} color="var(--text-tertiary)" />}
              {deadlineInfo.icon === 'done'    && <CheckCircle2 size={14} color="var(--text-tertiary)" />}
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: deadlineInfo.urgent ? '700' : '600',
                  color: deadlineInfo.urgent ? deadlineInfo.color : 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.2px'
                }}>
                  {deadlineInfo.label}
                </span>
                {deadlineInfo.sub && (
                  <span style={{
                    fontSize: '11px', fontWeight: '500',
                    color: deadlineInfo.urgent ? deadlineInfo.color : 'var(--text-tertiary)',
                    whiteSpace: 'nowrap',
                    opacity: deadlineInfo.urgent ? 0.9 : 0.8
                  }}>
                    ({deadlineInfo.sub})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Financial Column ─── */}
          {(isAdmin || isClient || isWorker) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', paddingLeft: '20px', borderLeft: '1px solid var(--border-color)', alignContent: 'center' }}>
              {isAdmin && budget > 0 ? (
                <>
                  {[
                    { label: 'Budget', value: `${currency}${budget.toLocaleString()}`, color: 'var(--text-primary)' },
                    { label: 'Paid',   value: `${currency}${paid.toLocaleString()}`,   color: 'var(--color-success)' },
                    { label: paidFull ? 'Status' : 'Due', value: paidFull ? 'Fully Paid' : `${currency}${due.toLocaleString()}`, color: paidFull ? 'var(--color-success)' : 'var(--color-danger)' },
                    { label: 'Margin', value: `${margin >= 0 ? '+' : ''}${currency}${margin.toLocaleString()}`, color: margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{s.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: s.color, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{s.value}</span>
                    </div>
                  ))}
                </>
              ) : isAdmin && budget === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500', gridColumn: '1/-1' }}>No Budget</span>
              ) : isClient && budget > 0 ? (
                <>
                  {[
                    { label: 'Total', value: `${currency}${budget.toLocaleString()}`, color: 'var(--text-primary)' },
                    { label: paidFull ? 'Status' : 'Due', value: paidFull ? 'Fully Paid' : `${currency}${due.toLocaleString()}`, color: paidFull ? 'var(--color-success)' : 'var(--color-danger)' },
                    ...(paid > 0 ? [{ label: 'Paid', value: `${currency}${paid.toLocaleString()}`, color: 'var(--color-success)' }] : []),
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{s.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: s.color, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{s.value}</span>
                    </div>
                  ))}
                </>
              ) : isWorker && myEarned > 0 ? (
                <>
                  {[
                    { label: 'Earned',   value: `${currency}${myEarned.toLocaleString()}`,                               color: 'var(--text-primary)' },
                    { label: 'Received', value: `${currency}${myPaid.toLocaleString()}`,                                 color: myPaid > 0 ? 'var(--color-success)' : 'var(--text-tertiary)' },
                    { label: 'Due',      value: myDue <= 0 ? `${currency}0` : `${currency}${myDue.toLocaleString()}`,    color: myDue <= 0 ? 'var(--text-tertiary)' : 'var(--accent-purple)' },
                    { label: 'Status',   value: myDue <= 0 ? 'Fully Paid' : myPaid > 0 ? 'Partial' : 'Pending',         color: myDue <= 0 ? 'var(--color-success)' : myPaid > 0 ? 'var(--color-warning)' : 'var(--text-tertiary)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{s.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: s.color, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{s.value}</span>
                    </div>
                  ))}
                </>
              ) : isWorker && myEarned === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500', gridColumn: '1/-1' }}>No Payout</span>
              ) : null}
            </div>
          )}

        </div>

        {/* Progress Bar - Admin/Client vs Worker */}
        {!isWorker && budget > 0 && !paidFull && (
          <div style={{ height: '2px', background: 'var(--border-color)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: 0, left: 0,
                height: '100%',
                background: isClient ? 'linear-gradient(90deg, #34C759, #30D158)' : 'linear-gradient(90deg, #007AFF, #5AC8FA)',
                borderRadius: '0 10px 10px 0',
              }}
            />
          </div>
        )}
        {!isWorker && budget > 0 && paidFull && (
          <div style={{ height: '2px', background: 'rgba(52,199,89,0.3)', position: 'absolute', bottom: 0, left: 0, right: 0 }} />
        )}

        {isWorker && myEarned > 0 && myDue > 0 && (
          <div style={{ height: '2px', background: 'var(--border-color)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.round((myPaid / myEarned) * 100))}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: 0, left: 0,
                height: '100%',
                background: 'linear-gradient(90deg, #AF52DE, #BF5AF2)',
                borderRadius: '0 10px 10px 0',
              }}
            />
          </div>
        )}
        {isWorker && myEarned > 0 && myDue <= 0 && (
          <div style={{ height: '2px', background: 'rgba(52,199,89,0.3)', position: 'absolute', bottom: 0, left: 0, right: 0 }} />
        )}
      </motion.div>
    </div>
  );
}
