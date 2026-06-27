import { useState, useMemo } from 'react';

import { useData } from '../contexts/DataContext';

import { useAuth } from '../contexts/AuthContext';

import { useSettings } from '../contexts/SettingsContext';

import { Plus, Tag, X, AlertCircle, Copy, Percent, DollarSign } from 'lucide-react';

import { Toast } from '../components/Toast';



function generateCode() {

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

}



export function CouponManager() {

  const { userData } = useAuth();

  const { coupons, couponsLoading, addCoupon, updateCoupon, removeCoupon } = useData();

  const { settings } = useSettings();

  const currency = settings.currency || '৳';

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ code: generateCode(), type: 'percent', value: '', maxUses: '', description: '', expiresAt: '' });

  const [saving, setSaving] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [showToast, setShowToast] = useState(false);

  const fireToast = (msg: string, type: 'success' | 'error' = 'success') => { setToastMsg(msg); setToastType(type); setShowToast(true); };



  const stats = useMemo(() => ({

    total: coupons.length,

    active: coupons.filter((c: any) => c.active !== false).length,

    used: coupons.reduce((s: number, c: any) => s + (Number(c.usedCount) || 0), 0),

  }), [coupons]);



  if (userData?.role !== 'admin') {

    return (

      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>

        <AlertCircle size={40} style={{ margin: '0 auto 16px', display: 'block' }} />

        <div style={{ fontWeight: 700 }}>Admin access only</div>

      </div>

    );

  }



  if (couponsLoading) {

    return (

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {[...Array(4)].map((_, i) => (

          <div key={i} className="skeleton-fast" style={{ height: 64, borderRadius: 12 }} />

        ))}

      </div>

    );

  }



  const handleSave = async () => {

    if (!form.code.trim() || !form.value) return;

    setSaving(true);

    try {

      const code = form.code.trim().toUpperCase();

      const duplicate = coupons.some((c: any) => c.code?.toUpperCase() === code);

      if (duplicate) { fireToast('Coupon code already exists.', 'error'); return; }

      await addCoupon({

        code,

        type: form.type as 'percent' | 'flat',

        value: Number(form.value),

        maxUses: form.maxUses ? Number(form.maxUses) : 0,

        usedCount: 0,

        description: form.description.trim(),

        active: true,

        createdAt: new Date().toISOString(),

        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),

      });

      setShowForm(false);

      setForm({ code: generateCode(), type: 'percent', value: '', maxUses: '', description: '', expiresAt: '' });

      fireToast('Coupon created!', 'success');

    } catch {

      fireToast('Failed to save coupon.', 'error');

    } finally {

      setSaving(false);

    }

  };



  const toggleActive = async (c: any) => {

    try {

      await updateCoupon(c.id, { active: !c.active });

      fireToast(`Coupon ${!c.active ? 'enabled' : 'disabled'}`, 'success');

    } catch {

      fireToast('Update failed', 'error');

    }

  };



  const handleDelete = async (id: string) => {

    if (!confirm('Delete this coupon?')) return;

    try {

      await removeCoupon(id);

      fireToast('Coupon deleted', 'success');

    } catch {

      fireToast('Delete failed', 'error');

    }

  };



  return (

    <div>

      <div className="page-header">

        <div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px', margin: 0 }}>Coupons</h1>

          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 600 }}>{stats.active} active · {stats.used} total uses</p>

        </div>

        <button onClick={() => setShowForm(true)}

          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11, background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: 'var(--card-bg)', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: 'none' }}>

          <Plus size={15} /> New Coupon

        </button>

      </div>



      {/* Create form */}

      {showForm && (

        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: 22, marginBottom: 20 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Create Coupon</span>

            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={16} /></button>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

            <div>

              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Coupon Code</label>

              <div style={{ display: 'flex', gap: 6 }}>

                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}

                  style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, letterSpacing: '.1em', outline: 'none', fontFamily: 'monospace' }} />

                <button onClick={() => setForm(f => ({ ...f, code: generateCode() }))} title="Generate" style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Auto</button>

              </div>

            </div>

            <div>

              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Discount Type</label>

              <div style={{ display: 'flex', gap: 6 }}>

                {[{ val: 'percent', label: '% Off' }, { val: 'flat', label: `${currency} Off` }].map(opt => (

                  <button key={opt.val} onClick={() => setForm(f => ({ ...f, type: opt.val }))}

                    style={{ flex: 1, padding: '9px', borderRadius: 9, border: `1px solid ${form.type === opt.val ? 'var(--accent-gold)' : 'var(--border-color)'}`, background: form.type === opt.val ? 'rgba(196,154,82,0.1)' : 'var(--bg-color)', color: form.type === opt.val ? 'var(--accent-gold)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>

                    {opt.label}

                  </button>

                ))}

              </div>

            </div>

            <div>

              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>

                {form.type === 'percent' ? 'Discount %' : `Discount Amount (${currency})`}

              </label>

              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}

                placeholder={form.type === 'percent' ? 'e.g. 20' : 'e.g. 500'}

                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />

            </div>

            <div>

              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Max Uses (0 = unlimited)</label>

              <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}

                placeholder="0"

                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />

            </div>

          </div>

          <div style={{ marginBottom: 12 }}>

            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Expiry Date (optional)</label>

            <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}

              min={new Date().toISOString().split('T')[0]}

              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />

          </div>

          <div style={{ marginBottom: 14 }}>

            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Description (internal note)</label>

            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}

              placeholder="e.g. Eid special discount"

              maxLength={500}

              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

          </div>

          <div style={{ display: 'flex', gap: 8 }}>

            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>

            <button onClick={handleSave} disabled={saving || !form.code.trim() || !form.value}

              style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: 'var(--card-bg)', fontSize: 13, fontWeight: 800, cursor: saving || !form.code.trim() || !form.value ? 'not-allowed' : 'pointer', opacity: !form.value ? 0.6 : 1 }}>

              {saving ? 'Saving...' : 'Create Coupon'}

            </button>

          </div>

        </div>

      )}



      {/* Coupon list */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {coupons.length === 0 ? (

          <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)' }}>

            <Tag size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 12px', display: 'block' }} />

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)' }}>No coupons yet</div>

            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Create your first promo code above.</div>

          </div>

        ) : coupons.map((c: any) => (

          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--card-bg)', borderRadius: 13, border: '1px solid var(--border-color)', opacity: c.active === false ? 0.55 : 1 }}>

            <div style={{ width: 38, height: 38, borderRadius: 10, background: c.active !== false ? 'rgba(196,154,82,0.12)' : 'var(--bg-color)', border: `1px solid ${c.active !== false ? 'rgba(196,154,82,0.25)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

              {c.type === 'percent' ? <Percent size={16} color={c.active !== false ? 'var(--accent-gold)' : 'var(--text-tertiary)'} /> : <DollarSign size={16} color={c.active !== false ? 'var(--accent-gold)' : 'var(--text-tertiary)'} />}

            </div>

            <div style={{ flex: 1, minWidth: 0 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>

                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '.08em' }}>{c.code}</span>

                <button onClick={() => { navigator.clipboard.writeText(c.code); fireToast('Copied!'); }} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}><Copy size={12} /></button>

                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-gold)' }}>

                  {c.type === 'percent' ? `${c.value}% off` : `${currency}${c.value} off`}

                </span>

                {c.active === false && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: 20, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Disabled</span>}

                {c.expiresAt && new Date(c.expiresAt) < new Date() && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', padding: '1px 7px', borderRadius: 20, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Expired</span>}

                {c.expiresAt && new Date(c.expiresAt) >= new Date() && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: 20, letterSpacing: '0.3px' }}>Expires {new Date(c.expiresAt).toLocaleDateString()}</span>}

              </div>

              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>

                <span>{c.usedCount || 0} uses {c.maxUses > 0 ? `/ ${c.maxUses} max` : '(unlimited)'}</span>

                {c.description && <span>· {c.description}</span>}

              </div>

            </div>

            <div style={{ display: 'flex', gap: 6 }}>

              <button onClick={() => toggleActive(c)} title={c.active === false ? 'Enable' : 'Disable'}

                style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.active !== false ? 'rgba(52,199,89,0.3)' : 'var(--border-color)'}`, background: c.active !== false ? 'rgba(52,199,89,0.08)' : 'var(--bg-color)', color: c.active !== false ? 'var(--color-success)' : 'var(--text-tertiary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>

                {c.active === false ? 'Enable' : 'Active'}

              </button>

              <button onClick={() => handleDelete(c.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.06)', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                <X size={13} />

              </button>

            </div>

          </div>

        ))}

      </div>



      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

    </div>

  );

}

