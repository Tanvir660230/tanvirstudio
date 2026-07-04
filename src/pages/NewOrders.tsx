import { Global, css } from '@emotion/react';

import { useState, useMemo, useEffect, useRef } from 'react';

import type { CSSProperties } from 'react';

import { PackageOpen, Pencil, X, Check, CalendarCheck, MessageCircle, ExternalLink, Search, Inbox, Trash2, RotateCcw, Phone, Mail, Music, Link2, FileText, ChevronDown } from 'lucide-react';

import { Spinner } from '../components/Spinner';

import { Toast } from '../components/Toast';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { useAuth } from '../contexts/AuthContext';

import { sendOrderAcceptedToClient, sendOrderDeclinedToClient } from '../utils/emailApi';

import { sendOrderAcceptedSMS, sendOrderDeclinedSMS } from '../utils/smsApi';

import { sendNotification } from '../lib/firebase';

import { matchesSearch } from '../utils/searchUtils';



const FALLBACK_PKGS = ['Starter', 'Signature', 'Elite'];



function timeAgo(d: string) {

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



function getWaMessage(order: any, studioName = 'Tanvir Studio'): string {

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



function parseDesc(description: string) {

  const lines = (description || '').split('\n');

  const ref = lines.find(l => l.startsWith('Reference:'))?.replace('Reference: ', '').trim() || '';

  const ni = lines.findIndex(l => l === 'Notes:');

  const notes = ni >= 0 ? lines.slice(ni + 1).join('\n').trim() : '';

  return { ref, notes };

}



const actionBtn = (color: string, filled: boolean): CSSProperties => ({

  height: 32, padding: '0 13px', borderRadius: 8, cursor: 'pointer',

  fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,

  border: filled ? 'none' : `1px solid ${color}40`,

  background: filled ? color : `${color}14`,

  color: filled ? 'var(--card-bg)' : color,

  textDecoration: 'none', flexShrink: 0, fontFamily: 'inherit',

});



/* ── Edit Modal ─────────────────────────────────────────────────────────── */

function EditModal({

  order, pkgOptions, websitePackages, isMobile, onSave, onClose,

}: {

  order: any; pkgOptions: string[]; websitePackages: any[]; isMobile: boolean;

  onSave: (id: string, data: any) => Promise<void>; onClose: () => void;

}) {

  const { ref, notes } = parseDesc(order.description || '');

  const [form, setForm] = useState({

    client: order.client || '',

    clientPhone: order.clientPhone || '',

    clientEmail: order.clientEmail || '',

    songName: order.songName || '',

    packageName: order.packageName || '',

    budget: String(order.budget || 0),

    referenceLink: ref,

    notes,

  });

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

    const el = overlayRef.current;

    if (!el) return;

    requestAnimationFrame(() => { el.style.opacity = '1'; });

  }, []);



  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));



  const handleSave = async () => {

    if (!form.client.trim()) { setError('Client name is required.'); return; }

    setSaving(true); setError('');

    try {

      await onSave(order.id, form);

      onClose();

    } catch {

      setError('Failed to save. Please try again.');

    } finally {

      setSaving(false);

    }

  };



  const inp: CSSProperties = {

    width: '100%', height: 36, padding: '0 12px', borderRadius: 9,

    border: '1px solid var(--border-color)', background: 'var(--bg-color)',

    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',

    outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',

  };

  const lbl: CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 5 };



  return (

    <div

      ref={overlayRef}

      onClick={e => { if (e.target === overlayRef.current) onClose(); }}

      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, opacity: 0, transition: 'opacity .18s' }}>

      <div style={{ background: 'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: 'none', border: '1px solid var(--border-color)' }}>



        {/* Header */}

        <div style={{ padding: '18px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <div>

            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>Edit Order</p>

            <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.3px' }}>{order.client}</h3>

          </div>

          <button onClick={onClose} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>

            <X size={15} />

          </button>

        </div>



        <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>



          {/* Row 1 */}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>

            <div>

              <label style={lbl}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Client Name</span></label>

              <input style={inp} value={form.client} onChange={e => set('client')(e.target.value)} placeholder="Full name" />

            </div>

            <div>

              <label style={lbl}>Phone</label>

              <div style={{ position: 'relative' }}>

                <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

                <input style={{ ...inp, paddingLeft: 30 }} type="tel" value={form.clientPhone} onChange={e => set('clientPhone')(e.target.value)} placeholder="+880 1X-XXXX-XXXX" />

              </div>

            </div>

            <div>

              <label style={lbl}>Email</label>

              <div style={{ position: 'relative' }}>

                <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

                <input style={{ ...inp, paddingLeft: 30 }} type="email" value={form.clientEmail} onChange={e => set('clientEmail')(e.target.value)} placeholder="email@example.com" />

              </div>

            </div>

          </div>



          {/* Row 2 */}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 12 }}>

            <div>

              <label style={lbl}>Song / Project Title</label>

              <div style={{ position: 'relative' }}>

                <Music size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

                <input style={{ ...inp, paddingLeft: 30 }} value={form.songName} onChange={e => set('songName')(e.target.value)} placeholder="Song or project name" />

              </div>

            </div>

            <div>

              <label style={lbl}>Package</label>

              <div style={{ position: 'relative' }}>

                <select value={form.packageName}

                  onChange={e => {

                    const found = (websitePackages || []).find((p: any) => p.name === e.target.value);

                    const raw = found?.price;

                    // price may be stored as number OR string like "৳2,999"

                    const numPrice = typeof raw === 'number'

                      ? raw

                      : raw ? parseInt(String(raw).replace(/[^\d]/g, ''), 10) : 0;

                    setForm(f => ({ ...f, packageName: e.target.value, budget: numPrice ? String(numPrice) : f.budget }));

                  }}

                  style={{ ...inp, paddingRight: 28, appearance: 'none', cursor: 'pointer' }}>

                  {pkgOptions.map(p => <option key={p} value={p}>{p}</option>)}

                </select>

                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

              </div>

            </div>

            <div>

              <label style={lbl}>Budget</label>

              <input style={inp} type="number" value={form.budget} onChange={e => set('budget')(e.target.value)} placeholder="0" min={0} />

            </div>

          </div>



          {/* Reference link */}

          <div>

            <label style={lbl}>Reference / Demo Link</label>

            <div style={{ position: 'relative' }}>

              <Link2 size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

              <input style={{ ...inp, paddingLeft: 30 }} value={form.referenceLink} onChange={e => set('referenceLink')(e.target.value)} placeholder="https://..." />

            </div>

          </div>



          {/* Notes */}

          <div>

            <label style={lbl}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} /> Notes / Creative Direction</span></label>

            <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={3}

              style={{ ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />

          </div>



          {error && (

            <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>

              {error}

            </div>

          )}



          {/* Footer */}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>

            <button onClick={onClose} disabled={saving} style={actionBtn('var(--text-tertiary)', false)}>Cancel</button>

            <button onClick={handleSave} disabled={saving}

              style={{ height: 36, padding: '0 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', boxShadow: 'none', opacity: saving ? 0.7 : 1 }}>

              {saving ? <><Spinner size={13} color="var(--card-bg)" /> Saving…</> : <><Check size={14} /> Save Changes</>}

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}



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

        <EditModal

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



              {/* ── Details row ── */}

              {(songName || (ref && ref !== 'None provided') || notes) && (

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

                        style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

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

