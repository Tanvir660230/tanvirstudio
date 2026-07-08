import { useState, useEffect, useRef } from 'react';

import type { CSSProperties } from 'react';

import { X, Check, Phone, Mail, Music, Link2, FileText, ChevronDown } from 'lucide-react';

import { Spinner } from '../Spinner';

import { parseDesc, actionBtn } from '../../utils/orders';

interface EditOrderModalProps {
  order: any;
  pkgOptions: string[];
  websitePackages: any[];
  isMobile: boolean;
  onSave: (id: string, data: any) => Promise<void>;
  onClose: () => void;
}

/* ── Edit Modal ─────────────────────────────────────────────────────────── */
export function EditOrderModal({
  order, pkgOptions, websitePackages, isMobile, onSave, onClose,
}: EditOrderModalProps) {
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
