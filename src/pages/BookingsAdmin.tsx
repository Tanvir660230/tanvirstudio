import { useState, useMemo } from 'react';

import { useData } from '../contexts/DataContext';

import { useAuth } from '../contexts/AuthContext';

import { Calendar, Clock, User, Phone, Mail, MessageSquare, Check, X, AlertCircle, Search, Mic, Monitor, Video, Palette, Tag } from 'lucide-react';

import { Toast } from '../components/Toast';

import { motion, AnimatePresence } from 'framer-motion';



const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {

  pending:  { label: 'Pending',   color: 'var(--accent-gold)', bg: 'rgba(196,154,82,0.1)' },

  confirmed: { label: 'Confirmed', color: 'var(--color-success)', bg: 'rgba(52,199,89,0.1)' },

  rejected:  { label: 'Rejected',  color: 'var(--color-danger)', bg: 'rgba(255,59,48,0.1)' },

  completed: { label: 'Completed', color: '#8E8E93', bg: 'rgba(142,142,147,0.1)' },

};



const SERVICE_ICONS: Record<string, any> = {

  audio: Mic, video: Video, software: Monitor, content: Palette,

};



export function BookingsAdmin() {

  const { userData } = useAuth();

  const { bookings, bookingsLoading, updateBooking, removeBooking } = useData();

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');

  const [selected, setSelected] = useState<any>(null);

  const [toastMsg, setToastMsg] = useState('');

  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [showToast, setShowToast] = useState(false);

  const fireToast = (msg: string, type: 'success' | 'error' = 'success') => { setToastMsg(msg); setToastType(type); setShowToast(true); };



  const filtered = useMemo(() => {

    return [...bookings]

      .filter(b => {

        if (statusFilter !== 'all' && b.status !== statusFilter) return false;

        const q = search.toLowerCase();

        if (!q) return true;

        return (b.name || '').toLowerCase().includes(q) || (b.email || '').toLowerCase().includes(q) || (b.service || '').toLowerCase().includes(q);

      })

      .sort((a, b) => {

        const timeA = typeof a.createdAt === 'object' && a.createdAt !== null && 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();

        const timeB = typeof b.createdAt === 'object' && b.createdAt !== null && 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();

        return timeB - timeA;

      });

  }, [bookings, search, statusFilter]);



  const counts = useMemo(() => ({

    all: bookings.length,

    pending: bookings.filter(b => b.status === 'pending').length,

    confirmed: bookings.filter(b => b.status === 'confirmed').length,

    rejected: bookings.filter(b => b.status === 'rejected').length,

  }), [bookings]);



  const handleStatus = async (id: string, status: string) => {

    try {

      await updateBooking(id, { status });

      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }));

      fireToast(`Booking ${status}`, 'success');

    } catch {

      fireToast('Update failed', 'error');

    }

  };



  const handleDelete = async (id: string) => {

    if (!confirm('Delete this booking permanently?')) return;

    try {

      await removeBooking(id);

      if (selected?.id === id) setSelected(null);

      fireToast('Booking deleted', 'success');

    } catch {

      fireToast('Delete failed', 'error');

    }

  };



  if (userData?.role !== 'admin') {

    return (

      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>

        <AlertCircle size={40} style={{ margin: '0 auto 16px', display: 'block' }} />

        <div style={{ fontWeight: 700 }}>Admin access only</div>

      </div>

    );

  }



  if (bookingsLoading) {

    return (

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {[...Array(5)].map((_, i) => (

          <div key={i} className="skeleton-fast" style={{ height: 72, borderRadius: 12 }} />

        ))}

      </div>

    );

  }



  return (

    <div style={{}}>

      {/* Header */}

      <div className="page-header">

        <div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px', margin: 0 }}>Booking Requests</h1>

          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 600 }}>{bookings.length} total submissions</p>

        </div>

      </div>



      {/* Filters */}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>

        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>

          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, service..."

            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

        </div>

        {(['all', 'pending', 'confirmed', 'rejected', 'completed'] as const).map(s => (

          <button key={s} onClick={() => setStatusFilter(s)}

            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${statusFilter === s ? 'var(--color-info)' : 'var(--border-color)'}`, background: statusFilter === s ? 'rgba(0,122,255,0.1)' : 'var(--card-bg)', color: statusFilter === s ? 'var(--color-info)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>

            {s.charAt(0).toUpperCase() + s.slice(1)} {s === 'all' ? `(${counts.all})` : s === 'pending' ? `(${counts.pending})` : s === 'confirmed' ? `(${counts.confirmed})` : s === 'rejected' ? `(${counts.rejected})` : ''}

          </button>

        ))}

      </div>



      {/* Grid */}

      <div className="split-pane-detail" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>

        {/* List */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {filtered.length === 0 ? (

            <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)' }}>

                            <Calendar size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 12px', display: 'block' }} />

                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)' }}>No bookings found</div>

            </div>

          ) : filtered.map(b => {

            const sc = STATUS_COLORS[b.status || 'pending'] || STATUS_COLORS.pending;

            const ServiceIcon = SERVICE_ICONS[b.service || ''] || Calendar;

            const isSelected = selected?.id === b.id;

            return (

              <div key={b.id} onClick={() => setSelected(isSelected ? null : b)}

                style={{ padding: '16px 18px', background: 'var(--card-bg)', borderRadius: 14, border: `1px solid ${isSelected ? 'rgba(0,122,255,0.3)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.15s', boxShadow: isSelected ? '0 0 0 2px rgba(0,122,255,0.15)' : 'none' }}

                onMouseOver={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(0,122,255,0.2)'; }}

                onMouseOut={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                    <ServiceIcon size={18} color="var(--text-secondary)" />

                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>

                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{b.name}</span>

                      <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: 20 }}>{sc.label}</span>

                    </div>

                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-tertiary)' }}>

                      <span style={{ fontWeight: 600 }}>{b.service?.charAt(0).toUpperCase() + (b.service?.slice(1) || '')}</span>

                      {b.date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {b.date}{b.time ? ` · ${b.time}` : ''}</span>}

                      {b.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {b.email}</span>}

                    </div>

                    {b.message && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.message}</p>}

                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>

                    {b.status === 'pending' && (

                      <>

                        <button onClick={e => { e.stopPropagation(); handleStatus(b.id, 'confirmed'); }}

                          title="Confirm" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(52,199,89,0.3)', background: 'rgba(52,199,89,0.08)', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                          <Check size={14} />

                        </button>

                        <button onClick={e => { e.stopPropagation(); handleStatus(b.id, 'rejected'); }}

                          title="Reject" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                          <X size={14} />

                        </button>

                      </>

                    )}

                  </div>

                </div>

              </div>

            );

          })}

        </div>



        {/* Detail panel */}

        <AnimatePresence>

          {selected && (

            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}

              style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '20px', height: 'fit-content', position: 'sticky', top: 80 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Booking Details</span>

                <button onClick={() => setSelected(null)} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={13} /></button>

              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {[

                  { icon: <User size={13} />, label: 'Name', value: selected.name },

                  { icon: <Phone size={13} />, label: 'Phone', value: selected.phone },

                  { icon: <Mail size={13} />, label: 'Email', value: selected.email },

                  { icon: <Tag size={13} />, label: 'Service', value: selected.service },

                  { icon: <Calendar size={13} />, label: 'Date', value: selected.date },

                  { icon: <Clock size={13} />, label: 'Time', value: selected.time },

                  { icon: <Tag size={13} />, label: 'Budget', value: selected.budget },

                ].filter(r => r.value).map((row, i) => (

                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

                    <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>{row.icon}</div>

                    <div>

                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{row.label}</div>

                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{row.value}</div>

                    </div>

                  </div>

                ))}

                {selected.message && (

                  <div style={{ marginTop: 4, padding: '12px', borderRadius: 10, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>

                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><MessageSquare size={10} /> Message</div>

                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{selected.message}</p>

                  </div>

                )}

                <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                {/* Status actions */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {['pending', 'confirmed', 'completed', 'rejected'].map(s => (

                    <button key={s} onClick={() => handleStatus(selected.id, s)} disabled={selected.status === s}

                      style={{ padding: '9px', borderRadius: 9, border: `1px solid ${STATUS_COLORS[s]?.color}30`, background: selected.status === s ? `${STATUS_COLORS[s]?.bg}` : 'transparent', color: STATUS_COLORS[s]?.color, fontSize: 12, fontWeight: 700, cursor: selected.status === s ? 'default' : 'pointer', opacity: selected.status === s ? 1 : 0.7, transition: 'opacity 0.15s' }}>

                      {selected.status === s ? `Current: ${STATUS_COLORS[s]?.label}` : `Mark as ${STATUS_COLORS[s]?.label}`}

                    </button>

                  ))}

                </div>

                {/* Contact actions */}

                {selected.phone && (

                  <a href={`https://wa.me/${selected.phone.replace(/\D/g, '').replace(/^0/, '880')}?text=${encodeURIComponent(`Hi ${selected.name}, regarding your booking request for ${selected.service} on ${selected.date} — `)}`}

                    target="_blank" rel="noreferrer"

                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 9, border: '1px solid rgba(37,211,102,0.25)', background: 'rgba(37,211,102,0.08)', color: '#25D366', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>

                    WhatsApp Client

                  </a>

                )}

                <button onClick={() => handleDelete(selected.id)}

                  style={{ padding: '9px', borderRadius: 9, border: '1px solid rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.05)', color: 'var(--color-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>

                  Delete Booking

                </button>

              </div>

            </motion.div>

          )}

        </AnimatePresence>

      </div>



      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

    </div>

  );

}

