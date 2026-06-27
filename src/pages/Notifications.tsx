/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { Bell, CheckCircle2, Briefcase, Users, DollarSign, Info, X, Trash2 } from 'lucide-react';

import { useData } from '../contexts/DataContext';

import { db } from '../lib/firebase';

import { updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';









const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {

  assignment: { icon: <Briefcase size={16} />, color: 'var(--color-info)', bg: 'rgba(0,122,255,0.1)' },

  payment:    { icon: <DollarSign size={16} />, color: 'var(--color-success)', bg: 'rgba(52,199,89,0.1)' },

  client:     { icon: <Users size={16} />,    color: 'var(--accent-purple)', bg: 'rgba(175,82,222,0.1)' },

  reminder:   { icon: <Bell size={16} />,     color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)' },

  default:    { icon: <Info size={16} />,     color: '#8E8E93', bg: 'rgba(142,142,147,0.1)' },

};



function fmt(val: any) {

  try {

    const d = val?.toDate ? val.toDate() : new Date(val);

    const now = new Date();

    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diff < 60)  return 'Just now';

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  } catch { return ''; }

}



const PAGE_SIZE = 30;



export function Notifications() {

  const { notifications: rawNotifications } = useData();

  const notifications = [...rawNotifications].sort((a: any, b: any) => {

    const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();

    const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();

    return tb - ta;

  });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);



  const markAllRead = async () => {

    try {

      const batch = writeBatch(db);

      notifications.filter(n => !n.read).forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));

      await batch.commit();

    } catch { /* silent — UI already reflects optimistically */ }

  };



  const unreadCount = notifications.filter(n => !n.read).length;



  const deleteNotif = async (id: string) => {

    try {

      await deleteDoc(doc(db, 'notifications', id));

    } catch { /* silent */ }

  };



  const deleteAll = async () => {

    try {

      const batch = writeBatch(db);

      notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)));

      await batch.commit();

    } catch { /* silent */ }

  };



  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const visible = filtered.slice(0, visibleCount);

  const hasMore = filtered.length > visibleCount;



  const grouped: Record<string, any[]> = {};

  visible.forEach(n => {

    const d = typeof n.createdAt === 'object' && n.createdAt !== null && 'toDate' in n.createdAt ? n.createdAt.toDate() : new Date(n.createdAt as string || 0);

    const today = new Date();

    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    let label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (d.toDateString() === today.toDateString()) label = 'Today';

    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';

    if (!grouped[label]) grouped[label] = [];

    grouped[label].push(n);

  });



  return (

    <div style={{ paddingBottom: 'var(--space-16)' }}>

      <div className="page-header">

        <div className="page-header-left">

          <h1 className="page-title">Notifications</h1>

          <p className="page-subtitle">Your full activity history.</p>

        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

          {unreadCount > 0 && (

            <button onClick={markAllRead} className="btn" style={{ fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,122,255,0.1)', color: 'var(--color-info)', border: 'none', cursor: 'pointer' }}>

              Mark all read

            </button>

          )}

          {notifications.length > 0 && (

            <button onClick={deleteAll} className="btn" style={{ fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>

              Clear all

            </button>

          )}

          <div style={{ display: 'flex', background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>

            {(['all', 'unread'] as const).map(f => (

              <button key={f} onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, background: filter === f ? 'var(--card-bg)' : 'transparent', color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', cursor: 'pointer', borderRight: f === 'all' ? '1px solid var(--border-color)' : 'none', transition: 'all 0.15s' }}>

                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}

              </button>

            ))}

          </div>

        </div>

      </div>



      {Object.keys(grouped).length === 0 ? (

        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-tertiary)' }}>

          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📡</div>

          <div style={{ fontSize: 16, fontWeight: 700 }}>{filter === 'unread' ? 'No unread notifications' : 'Your studio is quiet'}</div>

          <div style={{ fontSize: 13, marginTop: 6 }}>Notifications from team activity will appear here.</div>

        </div>

      ) : (

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {Object.entries(grouped).map(([label, items]) => (

            <div key={label}>

              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>{label}</div>

              <div style={{ background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                <AnimatePresence initial={false}>

                  {items.map((n: any, i: number) => {

                    const meta = TYPE_META[n.type] || TYPE_META.default;

                    return (

                      <motion.div

                        key={n.id}

                        layout

                        initial={{ opacity: 0, height: 0 }}

                        animate={{ opacity: 1, height: 'auto' }}

                        exit={{ opacity: 0, height: 0 }}

                        style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-color)' : 'none', background: n.read ? 'transparent' : 'rgba(0,122,255,0.03)' }}

                      >

                        <div style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                          <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>

                            {meta.icon}

                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>

                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>

                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>{n.message}</div>

                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>

                              {fmt(n.createdAt)}

                              {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-info)', display: 'inline-block' }} />}

                            </div>

                          </div>

                          <button onClick={() => deleteNotif(n.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.5, transition: 'opacity 0.15s' }} onMouseOver={e => (e.currentTarget.style.opacity = '1')} onMouseOut={e => (e.currentTarget.style.opacity = '0.5')}>

                            <X size={14} />

                          </button>

                        </div>

                      </motion.div>

                    );

                  })}

                </AnimatePresence>

              </div>

            </div>

          ))}



          {/* Load more */}

          {hasMore && (

            <div style={{ textAlign: 'center', paddingBottom: 8 }}>

              <button

                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}

                style={{ padding: '10px 28px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}

                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}

                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)'; }}

              >

                Load more ({filtered.length - visibleCount} remaining)

              </button>

            </div>

          )}

        </div>

      )}

    </div>

  );

}

