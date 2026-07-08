import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const STAGE_COLORS: Record<string, string> = {
  recording: 'var(--color-danger)',
  arrangement: 'var(--accent-purple)',
  humming: '#E91E63',
  composition: 'var(--color-info)',
  revision: 'var(--color-warning)',
  delivered: 'var(--color-success)',
  completed: '#8E8E93',
};

export function Calendar() {
  const { tasks } = useData();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  const pad = (n: number) => n < 10 ? `0${n}` : n;

  return (
    <div style={{  }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Schedule</h1>
          {!isMobile && <p className="page-subtitle">Track sessions and project delivery deadlines.</p>}
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', boxShadow: 'none' }}>
            <button onClick={prevMonth} aria-label="Previous month" className="btn btn-ghost btn-icon btn-sm"><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, minWidth: isMobile ? 90 : 130, textAlign: 'center' }}>{monthName} {year}</span>
            <button onClick={nextMonth} aria-label="Next month" className="btn btn-ghost btn-icon btn-sm"><ChevronRight size={16} /></button>
          </div>
          <button className="btn btn-primary" onClick={goToday}>Today</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          background: 'transparent', borderBottom: '1px solid var(--border-color)',
          textAlign: 'center', fontWeight: '500', fontSize: isMobile ? '12px' : '11px', color: 'var(--text-tertiary)',
          padding: isMobile ? '10px 0' : '14px 0'}}>
          {(isMobile ? ['S','M','T','W','T','F','S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((d, i) => <div key={i}>{d}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: isMobile ? '320px' : '650px' }}>
          {blanks.map(i => <div key={`b-${i}`} style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)' }} />)}
          
          {days.map(day => {
            const currentDayStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(day)}`;

            const dayTasks = tasks.filter((t: any) =>
              (t.recordingDate && String(t.recordingDate).startsWith(currentDayStr)) ||
              (t.deliveryDate && String(t.deliveryDate).startsWith(currentDayStr)) ||
              (t.createdAt && String(t.createdAt).startsWith(currentDayStr))
            );
            
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div key={day} style={{
                borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)',
                padding: isMobile ? '6px 4px' : '16px',
                position: 'relative',
                background: isToday ? 'rgba(0,122,255,0.02)' : 'transparent',
                transition: 'background 0.2s ease',
                minWidth: 0, overflow: 'hidden'}}>
                <span style={{ 
                  fontSize: isMobile ? '11px' : '13px', fontWeight: '600',
                  color: isToday ? 'white' : 'var(--text-secondary)',
                  background: isToday ? 'var(--accent-blue)' : 'transparent',
                  width: isMobile ? '20px' : '28px', height: isMobile ? '20px' : '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '6px', marginBottom: isMobile ? '4px' : '12px'
                }}>{day}</span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '2px' : '6px', alignItems: 'flex-start', width: '100%', overflow: 'hidden' }}>
                  {dayTasks.map((t: any) => {
                    const isRecording = t.recordingDate && t.recordingDate.startsWith(currentDayStr);
                    const isDelivery = t.deliveryDate && t.deliveryDate.startsWith(currentDayStr);
                    const stageColor = STAGE_COLORS[t.status] || 'var(--color-info)';
                    const color = isDelivery ? stageColor : (isRecording ? 'var(--color-danger)' : 'var(--color-info)');
                    const bgAlpha = `${color}18`;
                    const borderAlpha = `${color}25`;

                    return isMobile ? (
                      <div key={t.id + (isRecording ? 'r' : 'd')} style={{
                        width: 6, height: 6, margin: -7, padding: 7, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer'
                      }} title={`${isRecording ? 'Session' : isDelivery ? 'Due' : 'Start'}: ${t.title}`}
                        onClick={() => navigate('/work', { state: { openTaskId: t.id } })}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                        key={t.id + (isRecording ? 'r' : 'd')}
                        onClick={() => navigate('/work', { state: { openTaskId: t.id } })}
                        title={`${isRecording ? 'Session' : isDelivery ? 'Due' : 'Start'}: ${t.title}`}
                        style={{
                          fontSize: '10px', padding: '6px 10px', borderRadius: '8px',
                          background: bgAlpha,
                          color,
                          fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          border: `1px solid ${borderAlpha}`,
                          display: 'flex', alignItems: 'center', gap: '4px', width: '100%',
                          cursor: 'pointer'}}
                      >
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                        {isRecording ? 'Session: ' : (isDelivery ? 'Due: ' : 'Start: ')} {t.title}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isMobile && (() => {
        const allEvents = days.flatMap(day => {
          const currentDayStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(day)}`;
          return tasks
            .filter((t: any) =>
              (t.recordingDate && t.recordingDate.startsWith(currentDayStr)) ||
              (t.deliveryDate && t.deliveryDate.startsWith(currentDayStr))
            )
            .map((t: any) => ({
              ...t,
              day,
              currentDayStr,
              isRecording: t.recordingDate?.startsWith(currentDayStr),
              isDelivery: t.deliveryDate?.startsWith(currentDayStr),
            }));
        });
        if (allEvents.length === 0) return null;
        return (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              This month
            </div>
            {allEvents.map((t: any, idx: number) => {
              const stageColor = STAGE_COLORS[t.status] || 'var(--color-info)';
              const color = t.isDelivery ? stageColor : 'var(--color-danger)';
              return (
                <div key={idx} onClick={() => navigate('/work', { state: { openTaskId: t.id } })} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12,
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                  cursor: 'pointer'}}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                      {t.isDelivery ? 'Delivery' : 'Session'} — {monthName} {t.day} · {t.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: isMobile ? '10px' : '20px', padding: '0 4px' }}>
        {[
          { color: 'var(--color-danger)', label: 'Recording Session' },
          { color: 'var(--accent-purple)', label: 'Arrangement' },
          { color: '#E91E63', label: 'Humming' },
          { color: 'var(--color-info)', label: 'Composition' },
          { color: 'var(--color-warning)', label: 'Revision' },
          { color: 'var(--color-success)', label: 'Delivered' },
          { color: '#8E8E93', label: 'Completed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
