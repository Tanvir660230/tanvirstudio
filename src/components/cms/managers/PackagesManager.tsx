 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Copy, Check as CheckIcon, Trash2 } from 'lucide-react';
import { GridSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, SectionCard, toSlug, type FireToast } from '../shared';

// ─── Packages ─────────────────────────────────────────────────────────────────
export function PackagesManager({ fireToast }: { fireToast: FireToast }) {
  const { websitePackages, websitePackagesLoading, addWebsitePackage, updateWebsitePackage, removeWebsitePackage } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (item: any) => {
    const slug = toSlug(item.name || '');
    const url = `${window.location.origin}/services?p=${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  const [form, setForm] = useState({ name: '', price: '', originalPrice: '', line: '', delivery: '', sampleUrl: '', features: '', bonus: '', highlight: false, discountText: '' });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    setForm(item
      ? { name: item.name || '', price: item.price || '', originalPrice: item.originalPrice || '', line: item.line || '', delivery: item.delivery || '', sampleUrl: item.sampleUrl || '', features: Array.isArray(item.features) ? item.features.join('\n') : (typeof item.features === 'string' ? item.features : ''), bonus: item.bonus || '', highlight: item.highlight || false, discountText: item.discountText || '' }
      : { name: '', price: '', originalPrice: '', line: '', delivery: '', sampleUrl: '', features: '', bonus: '', highlight: false, discountText: '' }
    );
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, features: form.features.split(/[,\n]/).map((f: string) => f.trim()).filter(Boolean) };
      if (editId) { await updateWebsitePackage(editId, data); fireToast('Package updated!'); }
      else { await addWebsitePackage({ ...data, createdAt: new Date().toISOString() }); fireToast('Package added!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsitePackage(id); fireToast('Package removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  const handleReorder = async (item: any, dir: 'up' | 'down') => {
    const sorted = [...websitePackages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex((p: any) => p.id === item.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    try {
      await updateWebsitePackage(sorted[idx].id, { order: sorted[swapIdx].order ?? swapIdx });
      await updateWebsitePackage(sorted[swapIdx].id, { order: sorted[idx].order ?? idx });
    } catch { fireToast('Reorder failed.', 'error'); }
  };

  const sortedPackages = [...websitePackages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <SectionCard title="Pricing Packages" onAdd={() => handleOpen()}>
      {websitePackagesLoading ? <GridSkeleton count={3} height={200} />
        : websitePackages.length === 0
          ? <EmptyState emoji="📦" heading="No packages yet" sub="Default packages are active on the site. Add custom ones to override them." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {sortedPackages.map((item: any, idx: number) => (
                <div key={item.id} style={{ background: 'var(--bg-color)', border: `1.5px solid ${item.highlight ? 'var(--accent-blue)' : 'var(--border-color)'}`, borderRadius: 12, padding: 16, position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 6, position: 'absolute', top: 12, right: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {item.highlight && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(0,122,255,0.12)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase' }}>Featured</span>}
                    {item.discountText && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase' }}>{item.discountText}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, paddingRight: 90 }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{item.price}</div>
                    {item.originalPrice && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{item.originalPrice}</div>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.line}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>Delivery: <strong>{item.delivery}</strong></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => handleReorder(item, 'up')} disabled={idx === 0} title="Move up"
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: idx === 0 ? 'var(--border-color)' : 'var(--text-secondary)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                    <button onClick={() => handleReorder(item, 'down')} disabled={idx === sortedPackages.length - 1} title="Move down"
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: idx === sortedPackages.length - 1 ? 'var(--border-color)' : 'var(--text-secondary)', cursor: idx === sortedPackages.length - 1 ? 'default' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                    <button onClick={() => copyLink(item)} title="Copy shareable link"
                      style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-color)', background: copiedId === item.id ? 'rgba(52,209,138,0.1)' : 'transparent', color: copiedId === item.id ? '#34d18a' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {copiedId === item.id ? <CheckIcon size={14} /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => handleOpen(item)} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13 }}>Edit</button>
                    {confirmDeleteId === item.id
                      ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
                      : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit Package' : 'Add Package'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormInput label="Package Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Delivery Time <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  className="form-input"
                  value={form.delivery.replace(/[^\d]/g, '')}
                  onChange={e => {
                    const isHour = form.delivery.toLowerCase().includes('hour');
                    const val = e.target.value;
                    const unit = isHour ? (val === '1' ? 'Hour' : 'Hours') : (val === '1' ? 'Day' : 'Days');
                    setForm({ ...form, delivery: `${val} ${unit}`.trim() });
                  }}
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)' }}
                  placeholder="e.g. 3"
                  min="0"
                />
                <select
                  value={form.delivery.toLowerCase().includes('hour') ? 'Hours' : 'Days'}
                  onChange={e => {
                    const num = form.delivery.replace(/[^\d]/g, '') || '';
                    const unit = e.target.value === 'Hours' ? (num === '1' ? 'Hour' : 'Hours') : (num === '1' ? 'Day' : 'Days');
                    setForm({ ...form, delivery: `${num} ${unit}`.trim() });
                  }}
                  style={{ width: 100, boxSizing: 'border-box', padding: '10px', borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="Days">Days</option>
                  <option value="Hours">Hours</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormInput label="Current Price (e.g. ৳2,999)" value={form.price} onChange={v => setForm({ ...form, price: v })} required />
            <FormInput label="Original Price (e.g. ৳4,500)" value={form.originalPrice} onChange={v => setForm({ ...form, originalPrice: v })} />
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormInput label="Subtitle Line" value={form.line} onChange={v => setForm({ ...form, line: v })} required />
            <FormInput label="Discount Badge Text (Optional)" value={form.discountText} onChange={v => setForm({ ...form, discountText: v })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Features (one per line) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea
              className="form-input"
              value={form.features}
              onChange={e => {
                let val = e.target.value;
                val = val.replace(/^[\s\u200B]*[•\-*]\s+/gm, '');
                val = val.replace(/^[\s\u200B]*[0-9]+\.\s+/gm, '');
                setForm({ ...form, features: val });
              }}
              rows={5}
              placeholder="Mixing&#10;Mastering&#10;2 Revisions"
              required
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {["Source Files Included", "Commercial Use", "Priority Support", "Custom Branding", "Unlimited Revisions", "1 Day Delivery"].map(p => (
                <button type="button" key={p} onClick={() => { if (!form.features.includes(p)) setForm(f => ({ ...f, features: (f.features ? f.features.trim() + '\n' : '') + p })); }}
                  style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >+ {p}</button>
              ))}
            </div>
          </div>
          <FormInput label="Bonus (Optional)" value={form.bonus} onChange={v => setForm({ ...form, bonus: v })} />
          <FormInput label="Sample YouTube URL (Optional)" value={form.sampleUrl} onChange={v => setForm({ ...form, sampleUrl: v })} />
          <div
            onClick={() => setForm({ ...form, highlight: !form.highlight })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '12px 14px', background: form.highlight ? 'rgba(0,122,255,0.06)' : 'var(--bg-color)', borderRadius: 8, border: `1px solid ${form.highlight ? 'rgba(0,122,255,0.3)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <input type="checkbox" checked={form.highlight} onChange={() => {}} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-blue)' }} />
            <label style={{ fontSize: 14, fontWeight: 600, color: form.highlight ? 'var(--accent-blue)' : 'var(--text-primary)', cursor: 'pointer' }}>Highlight as "Most Popular"</label>
          </div>
        </ModalForm>
      )}
    </SectionCard>
  );
}
