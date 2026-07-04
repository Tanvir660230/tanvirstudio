/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  X, Check, Zap, Mic2, Sun, Sunset, Moon,
} from 'lucide-react';
import './PremiumDatePicker.css';

export interface BookedSlot {
  start: string;
  durationMinutes: number;
  label?: string;
}

interface PremiumDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  showTimeSelect?: boolean;
  bookedSlots?: BookedSlot[];
  sessionDuration?: number;
  onDurationChange?: (minutes: number) => void;
  workHoursStart?: number;
  workHoursEnd?: number;
}

// ─── Data ─────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DURATION_OPTIONS = [
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
  { label: '1.5h',value: 90 },
  { label: '2h',  value: 120 },
  { label: '3h',  value: 180 },
  { label: '4h',  value: 240 },
];
const QUICK_PICKS = [
  { label: 'Morning',   sub: '10 AM', icon: 'sun',    hour: 10, min: 0  as 0|30 },
  { label: 'Afternoon', sub: '2 PM',  icon: 'sunset', hour: 14, min: 0  as 0|30 },
  { label: 'Evening',   sub: '6 PM',  icon: 'moon',   hour: 18, min: 0  as 0|30 },
];

// 8 AM – 10 PM displayed as hour buttons
const HOUR_SLOTS = [
  { label: '8 AM',  h: 8  }, { label: '9 AM',  h: 9  },
  { label: '10 AM', h: 10 }, { label: '11 AM', h: 11 },
  { label: '12 PM', h: 12 }, { label: '1 PM',  h: 13 },
  { label: '2 PM',  h: 14 }, { label: '3 PM',  h: 15 },
  { label: '4 PM',  h: 16 }, { label: '5 PM',  h: 17 },
  { label: '6 PM',  h: 18 }, { label: '7 PM',  h: 19 },
  { label: '8 PM',  h: 20 }, { label: '9 PM',  h: 21 },
  { label: '10 PM', h: 22 },
];

// ─── Helpers ──────────────────────────────────────────────────
function fmt12(h: number, m: number) {
  const ap = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 || 12;
  return `${hh}:${m === 0 ? '00' : '30'} ${ap}`;
}

function fmtDur(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type SlotStatus = 'available' | 'booked' | 'conflict';

function getHourStatus(date: Date, hour: number, dur: number, bookings: BookedSlot[]): SlotStatus {
  // Check both :00 and :30 for this hour — return worst status
  let worst: SlotStatus = 'available';
  for (const min of [0, 30]) {
    const start = new Date(date);
    start.setHours(hour, min, 0, 0);
    const end = new Date(start.getTime() + dur * 60000);
    for (const b of bookings) {
      const bs = new Date(b.start);
      if (bs.toDateString() !== date.toDateString()) continue;
      const be = new Date(bs.getTime() + b.durationMinutes * 60000);
      if (start < be && end > bs) {
        if (start >= bs && start < be) return 'booked';
        worst = 'conflict';
      }
    }
  }
  return worst;
}

function getMinuteStatus(date: Date, hour: number, minute: number, dur: number, bookings: BookedSlot[]): SlotStatus {
  const start = new Date(date);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + dur * 60000);
  for (const b of bookings) {
    const bs = new Date(b.start);
    if (bs.toDateString() !== date.toDateString()) continue;
    const be = new Date(bs.getTime() + b.durationMinutes * 60000);
    if (start < be && end > bs) {
      return (start >= bs && start < be) ? 'booked' : 'conflict';
    }
  }
  return 'available';
}

function getDaySlots(date: Date, bookings: BookedSlot[]): { booked: number; total: number } {
  const dayBookings = bookings.filter(b => new Date(b.start).toDateString() === date.toDateString());
  const bookedHours = new Set<number>();
  for (const b of dayBookings) {
    const bs = new Date(b.start);
    const slots = Math.ceil(b.durationMinutes / 60);
    for (let i = 0; i < slots; i++) bookedHours.add(bs.getHours() + i);
  }
  return { booked: bookedHours.size, total: 15 }; // 8AM–10PM = 15 hrs
}

function calDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const days: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

// ─── Main Picker Modal ────────────────────────────────────────
interface PickerModalProps {
  initial: Date | null;
  bookedSlots: BookedSlot[];
  sessionDuration: number;
  showTimeSelect: boolean;
  workHoursStart: number;
  workHoursEnd: number;
  onConfirm: (date: Date, dur: number) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  initial, bookedSlots, sessionDuration, showTimeSelect, workHoursStart, workHoursEnd, onConfirm, onClose,
}) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [view, setView]   = useState<Date>(initial ?? new Date());
  const [selDate, setSelDate] = useState<Date | null>(
    initial ? new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()) : null
  );
  const [selHour, setSelHour] = useState<number | null>(
    initial && initial.getHours() >= 8 && initial.getHours() <= 22 ? initial.getHours() : null
  );
  const [selMin,  setSelMin]  = useState<0 | 30>(
    (initial ? (initial.getMinutes() >= 30 ? 30 : 0) : 0) as 0 | 30
  );
  const [dur, setDur]     = useState(sessionDuration);
  const days = calDays(view.getFullYear(), view.getMonth());
  const visibleHours = HOUR_SLOTS.filter(s => s.h >= workHoursStart && s.h < workHoursEnd);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const canConfirm = selDate && (!showTimeSelect || selHour !== null);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const d = new Date(selDate!);
    if (showTimeSelect && selHour !== null) d.setHours(selHour, selMin, 0, 0);
    onConfirm(d, dur);
  };

  const previewText = (() => {
    if (!selDate) return 'Select a date';
    const dateStr = selDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!showTimeSelect) return dateStr;
    if (selHour === null) return `${dateStr} · pick a time →`;
    return `${dateStr} · ${fmt12(selHour, selMin)} · ${fmtDur(dur)} session`;
  })();

  return ReactDOM.createPortal(
    <div className="pdp-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pdp-modal-box" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="pdp-modal-topbar">
          <div className="pdp-modal-topbar-icon">
            <Mic2 size={18} />
            <span className="pdp-icon-pulse" />
          </div>
          <div>
            <div className="pdp-modal-topbar-title">Recording Session</div>
            <div className="pdp-modal-topbar-sub">Pick date{showTimeSelect ? ' & time' : ''}</div>
          </div>
          <button type="button" className="pdp-modal-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        {/* Body: calendar + time */}
        <div className="pdp-modal-body">

          {/* Left — Calendar */}
          <div className="pdp-modal-cal">
            <div className="pdp-cal-header">
              <button type="button" className="pdp-nav" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft size={14} /></button>
              <span className="pdp-month-label">{MONTH_NAMES[view.getMonth()]} {view.getFullYear()}</span>
              <button type="button" className="pdp-nav" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight size={14} /></button>
            </div>
            <div className="pdp-day-names">{DAY_NAMES.map(d => <span key={d}>{d}</span>)}</div>
            <div className="pdp-day-grid">
              {days.map((d, i) => {
                if (!d) return <span key={`_${i}`} className="pdp-day-empty" />;
                const isToday = d.getTime() === today.getTime();
                const isSel   = selDate?.toDateString() === d.toDateString();
                const isPast  = d < today;
                const hasBook = bookedSlots.some(b => new Date(b.start).toDateString() === d.toDateString());
                return (
                  <button key={d.getTime()} type="button"
                    className={`pdp-day${isToday?' pdp-today':''}${isSel?' pdp-sel':''}${isPast?' pdp-past':''}`}
                    disabled={isPast} onClick={() => setSelDate(d)}>
                    {d.getDate()}
                    {hasBook && !isSel && <span className="pdp-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — Time picker (only if showTimeSelect) */}
          {showTimeSelect && (
            <div className="pdp-modal-time">

              {/* Quick picks */}
              <div className="pdp-time-section-label">Quick Pick</div>
              <div className="pdp-quickpick-row">
                {QUICK_PICKS.map(qp => {
                  const st = selDate ? getHourStatus(selDate, qp.hour, dur, bookedSlots) : 'available';
                  const active = selHour === qp.hour && selMin === qp.min;
                  return (
                    <button key={qp.label} type="button"
                      disabled={!selDate || st === 'booked'}
                      className={`pdp-qp-btn${active ? ' pdp-qp-active' : ''}${st === 'conflict' ? ' pdp-qp-conflict' : ''}`}
                      onClick={() => { setSelHour(qp.hour); setSelMin(qp.min); }}>
                      {qp.icon === 'sun'    && <Sun    size={13} />}
                      {qp.icon === 'sunset' && <Sunset size={13} />}
                      {qp.icon === 'moon'   && <Moon   size={13} />}
                      <span className="pdp-qp-label">{qp.label}</span>
                      <span className="pdp-qp-sub">{qp.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Day availability bar */}
              {selDate && (() => {
                const { booked, total } = getDaySlots(selDate, bookedSlots);
                const pct = Math.round((booked / total) * 100);
                return (
                  <div className="pdp-avail-bar-wrap">
                    <div className="pdp-avail-bar-track">
                      <div className="pdp-avail-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="pdp-avail-label">
                      {booked === 0 ? 'Fully free' : `${total - booked}h free · ${booked}h booked`}
                    </span>
                  </div>
                );
              })()}

              {/* Hour grid */}
              <div className="pdp-time-section-label">Hour</div>
              <div className="pdp-hour-grid">
                {visibleHours.map(({ label, h }) => {
                  const st  = selDate ? getHourStatus(selDate, h, dur, bookedSlots) : 'available';
                  const sel = selHour === h;
                  return (
                    <button key={h} type="button" disabled={!selDate || st === 'booked'}
                      className={`pdp-hour-btn pdp-hour-${st}${sel?' pdp-hour-sel':''}`}
                      onClick={() => setSelHour(h)}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Minute toggle */}
              <div className="pdp-time-section-label" style={{ marginTop: 10 }}>Minute</div>
              <div className="pdp-minute-row">
                {([0, 30] as (0|30)[]).map(m => {
                  const st  = selDate && selHour !== null ? getMinuteStatus(selDate, selHour, m, dur, bookedSlots) : 'available';
                  const sel = selMin === m;
                  return (
                    <button key={m} type="button"
                      disabled={!selDate || selHour === null || st === 'booked'}
                      className={`pdp-min-btn pdp-min-${st}${sel?' pdp-min-sel':''}`}
                      onClick={() => setSelMin(m)}>
                      :{m === 0 ? '00' : '30'}
                    </button>
                  );
                })}
              </div>

              {/* Duration */}
              <div className="pdp-time-section-label" style={{ marginTop: 10 }}>
                <Zap size={10} style={{ display:'inline', marginRight:3 }} />Session Length
              </div>
              <div className="pdp-pills">
                {DURATION_OPTIONS.map(o => (
                  <button key={o.value} type="button"
                    className={`pdp-pill${dur===o.value?' pdp-pill-active':''}`}
                    onClick={() => setDur(o.value)}>{o.label}</button>
                ))}
              </div>

              {/* Legend */}
              <div className="pdp-legend" style={{ marginTop: 10 }}>
                <span><span className="pdp-ld available" />Free</span>
                <span><span className="pdp-ld booked" />Taken</span>
                <span><span className="pdp-ld conflict" />Overlap</span>
              </div>

            </div>
          )}
        </div>

        {/* Footer — preview + confirm */}
        <div className="pdp-modal-footer">
          <div className="pdp-modal-preview">
            <Calendar size={13} style={{ flexShrink: 0 }} />
            <span>{previewText}</span>
          </div>
          <button type="button" className={`pdp-modal-confirm-btn${!canConfirm?' pdp-modal-confirm-disabled':''}`}
            disabled={!canConfirm} onClick={handleConfirm}>
            <Check size={15} /> Confirm
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

// ─── Exported Picker ──────────────────────────────────────────
export const PremiumDatePicker: React.FC<PremiumDatePickerProps> = ({
  selected, onChange,
  placeholderText = 'Select Date & Time',
  showTimeSelect = true,
  bookedSlots = [],
  sessionDuration = 60,
  onDurationChange,
  workHoursStart = 8,
  workHoursEnd = 22,
}) => {
  const [open, setOpen] = useState(false);

  const isValidDate = selected instanceof Date && !isNaN(selected.getTime());
  const displayText = isValidDate
    ? `${selected!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${showTimeSelect ? ` · ${fmt12(selected!.getHours(), selected!.getMinutes())}` : ''}`
    : placeholderText;

  const handleConfirm = (date: Date, dur: number) => {
    onChange(date);
    onDurationChange?.(dur);
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="pdp-root">
      <button type="button" className="pdp-trigger" onClick={() => setOpen(true)}>
        <span className="pdp-trigger-icon">
          {showTimeSelect ? <Clock size={15} /> : <Calendar size={15} />}
        </span>
        <span className={`pdp-trigger-text${!isValidDate ? ' pdp-placeholder' : ''}`}>{displayText}</span>
        {isValidDate && (
          <span className="pdp-clear" onClick={clear} role="button" aria-label="Clear">
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <PickerModal
          initial={isValidDate ? selected : null}
          bookedSlots={bookedSlots}
          sessionDuration={sessionDuration}
          showTimeSelect={showTimeSelect}
          workHoursStart={workHoursStart}
          workHoursEnd={workHoursEnd}
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};
