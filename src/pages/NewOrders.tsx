import { Global, css } from '@emotion/react';

import { useState, useMemo, useEffect } from 'react';

import { PackageOpen, Pencil, X, Check, CalendarCheck, MessageCircle, ExternalLink, Search, Inbox, Trash2, RotateCcw, Phone, Mail, Music, Link2, FileText } from 'lucide-react';

import { Spinner } from '../components/Spinner';

import { Toast } from '../components/Toast';

import { EditOrderModal } from '../components/orders/EditOrderModal';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { sendOrderAcceptedToClient, sendOrderDeclinedToClient } from '../utils/emailApi';

import { sendOrderAcceptedSMS, sendOrderDeclinedSMS } from '../utils/smsApi';

import { sendNotification } from '../lib/firebase';

import { matchesSearch } from '../utils/searchUtils';

import { timeAgo, getWaMessage, parseDesc, actionBtn } from '../utils/orders';

const FALLBACK_PKGS = ['Starter', 'Signature', 'Elite'];

/* ── Main Page ──────────────────────────────────────────────────────────── */
export function NewOrders() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const { tasks, updateTask, removeTask, websitePackages, clients, addClient } = useData();
  const { settings } = useSettings();
  const { user } = useAuth();
  const currency = settings?.currency ?? '৳';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'declined'>('pending');

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptDate, setAcceptDate] = useState('');
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const toggleOrderDetails = (id: string) => setExpandedOrders(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const fireToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg); setToastType(type); setShowToast(true);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  const pkgOptions: string[] = websitePackages?.length
    ? websitePackages.map((p: any) => p.name || p)
    : FALLBACK_PKGS;

  const allPendingOrders = useMemo(() =>
    tasks
      .filter((t: any) => t.publicOrder && t.status === 'pending')
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
  [tasks]);

  const allDeclinedOrders = useMemo(() =>
    tasks
      .filter((t: any) => t.publicOrder && t.status === 'declined')
      .sort((a: any, b: any) => new Date(b.declinedAt || b.createdAt || 0).getTime() - new Date(a.declinedAt || a.createdAt || 0).getTime()),
  [tasks]);

  const baseOrders = activeTab === 'pending' ? allPendingOrders : allDeclinedOrders;

  const orders = useMemo(() => {
    if (!debouncedSearch) return baseOrders;
    return baseOrders.filter((t: any) =>
      matchesSearch(debouncedSearch, t.client, t.songName, t.packageName, t.clientEmail, t.clientPhone, t.orderRef)
    );
  }, [baseOrders, debouncedSearch]);

  const saveEdit = async (id: string, form: any) => {
    if (Number(form.budget) < 0) { fireToast('Budget cannot be negative.', 'error'); return; }
    const pkgName = form.packageName?.trim() || 'N/A';
    const refLink = form.referenceLink?.trim() || '';
    const notes   = form.notes?.trim() || '';
    await updateTask(id, {
      client: form.client.trim(),
      clientPhone: form.clientPhone.trim(),
      clientEmail: form.clientEmail.trim(),
      songName: form.songName.trim(),
      packageName: pkgName,
      budget: Math.max(0, Number(form.budget) || 0),
      description: `Package: ${pkgName}\nReference: ${refLink}\nNotes:\n${notes}`,
      title: `TSN-- ${form.client.trim()} - ${form.songName.trim()}`,
    });
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id + '_accept');
    try {
      const order = tasks.find((t: any) => t.id === id);
      await updateTask(id, { status: 'new', recordingDate: acceptDate, acceptedAt: new Date().toISOString() });
      if (order) {
        const orderPhone = (order.clientPhone || '').replace(/\D/g, '');
        const alreadyClient = clients.some((c: any) =>
          (order.clientEmail && c.email && c.email.toLowerCase() === order.clientEmail.toLowerCase()) ||
          (orderPhone && (c.phone || '').replace(/\D/g, '') === orderPhone)
        );
        if (!alreadyClient) {
          addClient({ name: order.client || 'Unknown', email: order.clientEmail || '', phone: order.clientPhone || '', company: '', status: 'Active', createdAt: new Date().toISOString() }).catch(() => {});
        }
      }
      if (order?.clientEmail) {
        sendOrderAcceptedToClient(order.clientEmail, order.client || '', order.packageName || '', order.songName || '', acceptDate)
          .catch(() => fireToast('Order accepted, but email failed to send.', 'error'));
      }
      if (order?.clientPhone) {
        sendOrderAcceptedSMS(order.clientPhone, order.client || '', order.packageName || '', order.orderRef || '', acceptDate).catch(() => fireToast('SMS notification failed to send.', 'error'));
      }
      if (user?.uid) {
        sendNotification(user.uid, 'Order Accepted', `${order?.client || 'Client'}'s order (${order?.packageName || ''}) has been accepted.`, 'info').catch(() => {});
      }
      setAcceptingId(null); setAcceptDate('');
      fireToast('Order accepted!', 'success');
    } catch {
      fireToast('Failed to accept order. Please retry.', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id + '_decline');
    try {
      const order = tasks.find((t: any) => t.id === id);
      await updateTask(id, { status: 'declined', declinedAt: new Date().toISOString() });
      if (order?.clientEmail) {
        sendOrderDeclinedToClient(order.clientEmail, order.client || '', order.packageName || '', order.songName || '')
          .catch(() => fireToast('Order declined, but email failed to send.', 'error'));
      }
      if (order?.clientPhone) {
        sendOrderDeclinedSMS(order.clientPhone, order.client || '', order.packageName || '', order.orderRef || '').catch(() => fireToast('SMS notification failed to send.', 'error'));
      }
      setDecliningId(null);
      fireToast('Order declined.', 'success');
    } catch {
      fireToast('Failed to decline order. Please retry.', 'error');
    } finally { setActionLoading(null); }
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id + '_restore');
    try {
      await updateTask(id, { status: 'pending', declinedAt: '' });
      fireToast('Order restored to pending.', 'success');
    } catch {
      fireToast('Failed to restore.', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id + '_delete');
    try {
      await removeTask(id);
      setDeletingId(null);
      fireToast('Order permanently deleted.', 'success');
    } catch {
      fireToast('Failed to delete.', 'error');
    } finally { setActionLoading(null); }
  };

  return (
    <div style={{ paddingBottom: 64 }}>
      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

      {/* Edit modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          pkgOptions={pkgOptions}
          websitePackages={websitePackages || []}
          isMobile={isMobile}
          onSave={saveEdit}
          onClose={() => setEditingOrder(null)}
        />
      )}

      <Global styles={css`
        .order-card { transition: box-shadow .2s, border-color .2s; }
        .order-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
      `} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <PackageOpen size={19} color="var(--accent-gold)" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.3px' }}>Orders</h1>
        {allPendingOrders.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 800, background: 'var(--accent-gold)', color: '#fff', padding: '2px 9px', borderRadius: 999, lineHeight: 1.6 }}>
            {allPendingOrders.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, song, ref…"
            style={{ height: 34, padding: '0 12px 0 30px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: 220 }} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, background: 'var(--surface-1)', borderRadius: 10, width: 'fit-content' }}>
        {(['pending', 'declined'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSearch(''); setAcceptingId(null); setDecliningId(null); setDeletingId(null); setActionLoading(null); }}
            style={{ height: 30, padding: '0 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
              background: activeTab === tab ? (tab === 'declined' ? 'rgba(255,59,48,0.1)' : 'var(--card-bg)') : 'transparent',
              color: activeTab === tab ? (tab === 'declined' ? 'var(--color-danger)' : 'var(--accent-gold)') : 'var(--text-tertiary)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {tab === 'pending'
              ? `Pending${allPendingOrders.length > 0 ? ` (${allPendingOrders.length})` : ''}`
              : `Declined${allDeclinedOrders.length > 0 ? ` (${allDeclinedOrders.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Empty state ── */}
      {orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Inbox size={52} color="var(--text-tertiary)" style={{ opacity: 0.25, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            {search ? 'No orders match your search' : activeTab === 'declined' ? 'No declined orders' : 'All caught up!'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8 }}>
            {search ? 'Try a different keyword' : activeTab === 'declined' ? 'Declined orders appear here' : 'New client orders from your website will appear here'}
          </p>
        </div>
      )}

      {/* ── Order cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orders.map((order: any) => {
          const isAccepting = acceptingId === order.id;
          const isDeclining = decliningId === order.id;
          const isDeleting  = deletingId  === order.id;
          const { ref, notes } = parseDesc(order.description || '');
          const pkgName = order.packageName || '—';
          const songName = order.songName || '';
          const waMsg  = getWaMessage(order, settings.studioName || 'Tanvir Studio');
          const waPhone = (() => {
            const d = (order.clientPhone || '').replace(/\D/g, '');
            if (!d) return '';
            if (d.startsWith('880')) return d;
            if (d.startsWith('0'))   return '880' + d.slice(1);
            return d;
          })();
          const waLink = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}` : '';

          return (
            <div key={order.id} className="card order-card" style={{ overflow: 'hidden', borderRadius: 13 }}>

              {/* ── Header row ── */}
              <div style={{ padding: '15px 18px', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: 10, background: activeTab === 'declined' ? 'rgba(255,59,48,0.08)' : 'rgba(196,154,82,0.12)', border: `1px solid ${activeTab === 'declined' ? 'rgba(255,59,48,0.2)' : 'rgba(196,154,82,0.22)'}`, color: activeTab === 'declined' ? 'var(--color-danger)' : 'var(--accent-gold)', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(order.client || '?').slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + pkg + amount + time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{order.client || 'Unknown'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.22)', padding: '2px 8px', borderRadius: 6 }}>{pkgName}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{(order.budget || 0).toLocaleString()}</span>
                    {order.couponCode && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)', padding: '2px 7px', borderRadius: 6 }}>
                        {order.couponCode} -{currency}{(order.couponDiscount || 0).toLocaleString()}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{timeAgo(activeTab === 'declined' ? (order.declinedAt || order.createdAt) : order.createdAt)}</span>
                  </div>

                  {/* Contact + ref */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {order.clientPhone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} style={{ color: 'var(--text-tertiary)' }} /> {order.clientPhone}
                      </span>
                    )}
                    {order.clientEmail && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} style={{ color: 'var(--text-tertiary)' }} /> {order.clientEmail}
                      </span>
                    )}
                    {order.orderRef && (
                      <span style={{ color: 'var(--accent-gold)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em' }}>#{order.orderRef}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Details toggle (mobile only) ── */}
              {isMobile && (songName || (ref && ref !== 'None provided') || notes) && (
                <div style={{ padding: '0 18px 8px', marginLeft: 55 }}>
                  <button
                    onClick={() => toggleOrderDetails(order.id)}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {expandedOrders.has(order.id) ? 'Hide details ▲' : 'Show details ▼'}
                  </button>
                </div>
              )}

              {/* ── Details row ── */}
              {(songName || (ref && ref !== 'None provided') || notes) && (!isMobile || expandedOrders.has(order.id)) && (
                <div style={{ padding: '0 18px 12px', marginLeft: 55, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {songName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      <Music size={12} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} /> {songName}
                    </div>
                  )}
                  {ref && ref !== 'None provided' && /^https?:\/\//i.test(ref) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      <Link2 size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <a href={ref} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, maxWidth: 380, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ref} <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  {notes && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                      <FileText size={11} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Actions row ── */}
              <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Left actions */}
                {activeTab === 'pending' && (
                  <button onClick={() => setEditingOrder(order)} style={actionBtn('var(--color-info)', false)}>
                    <Pencil size={12} /> Edit
                  </button>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" style={actionBtn('#25D366', false)}>
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}

                <div style={{ flex: 1 }} />

                {/* Declined tab actions */}
                {activeTab === 'declined' && (
                  isDeleting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Permanently delete?</span>
                      <button onClick={() => setDeletingId(null)} disabled={!!actionLoading} style={actionBtn('var(--text-tertiary)', false)}>No</button>
                      <button onClick={() => handleDelete(order.id)} disabled={actionLoading === order.id + '_delete'}
                        style={{ ...actionBtn('var(--color-danger)', true), opacity: actionLoading === order.id + '_delete' ? 0.7 : 1 }}>
                        {actionLoading === order.id + '_delete' ? <Spinner size={12} color="var(--card-bg)" /> : <><Trash2 size={12} /> Delete</>}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setDeletingId(order.id)} style={actionBtn('var(--color-danger)', false)}>
                        <Trash2 size={12} /> Delete
                      </button>
                      <button onClick={() => handleRestore(order.id)} disabled={actionLoading === order.id + '_restore'}
                        style={{ ...actionBtn('var(--accent-gold)', true), background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', boxShadow: 'none', opacity: actionLoading === order.id + '_restore' ? 0.7 : 1 }}>
                        {actionLoading === order.id + '_restore' ? <Spinner size={12} color="var(--card-bg)" /> : <><RotateCcw size={12} /> Restore</>}
                      </button>
                    </>
                  )
                )}

                {/* Pending tab actions */}
                {activeTab === 'pending' && (
                  isDeclining ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Decline this order?</span>
                      <button onClick={() => setDecliningId(null)} disabled={!!actionLoading} style={actionBtn('var(--text-tertiary)', false)}>No</button>
                      <button onClick={() => handleDecline(order.id)} disabled={actionLoading === order.id + '_decline'}
                        style={{ ...actionBtn('var(--color-danger)', true), opacity: actionLoading === order.id + '_decline' ? 0.7 : 1 }}>
                        {actionLoading === order.id + '_decline' ? <Spinner size={12} color="var(--card-bg)" /> : 'Yes, Decline'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setDecliningId(order.id); setAcceptingId(null); }} style={actionBtn('var(--color-danger)', false)}>
                        <X size={12} /> Decline
                      </button>
                      <button onClick={() => { setAcceptingId(order.id); setAcceptDate(''); setDecliningId(null); }}
                        style={{ ...actionBtn('var(--accent-gold)', true), background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', boxShadow: 'none' }}>
                        <CalendarCheck size={12} /> Accept
                      </button>
                    </>
                  )
                )}
              </div>

              {/* ── Accept date picker ── */}
              {isAccepting && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(196,154,82,0.2)', background: 'rgba(196,154,82,0.04)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CalendarCheck size={14} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Session date <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span>
                  </span>
                  <input type="datetime-local" value={acceptDate} onChange={e => setAcceptDate(e.target.value)}
                    style={{ flex: 1, minWidth: 190, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                  <button disabled={actionLoading === order.id + '_accept'} onClick={() => handleAccept(order.id)}
                    style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', boxShadow: 'none', opacity: actionLoading === order.id + '_accept' ? 0.7 : 1 }}>
                    {actionLoading === order.id + '_accept' ? <Spinner size={14} color="var(--card-bg)" /> : <><Check size={14} /> Confirm</>}
                  </button>
                  <button onClick={() => setAcceptingId(null)}
                    style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
