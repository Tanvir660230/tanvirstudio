 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Plus, Edit2, Trash2, Cpu } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, type FireToast } from '../shared';

// ─── Gear Manager ─────────────────────────────────────────────────────────────
const GEAR_ICONS = ['Mic', 'Headphones', 'Monitor', 'Sliders', 'Cpu', 'Music2'];

export function GearManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteGear, websiteGearLoading, addWebsiteGear, updateWebsiteGear, removeWebsiteGear } = useData();
  const blank = { category: '', icon: 'Mic', color: 'var(--accent-gold-light)', items: '', order: 0 };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const open = (item?: any) => {
    if (item) { setForm({ category: item.category || '', icon: item.icon || 'Mic', color: item.color || 'var(--accent-gold-light)', items: item.items || '', order: item.order ?? 0 }); setEditing(item.id); }
    else { setForm(blank); setEditing(null); }
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      if (editing) { await updateWebsiteGear(editing, payload); fireToast('Gear category updated!'); }
      else { await addWebsiteGear(payload); fireToast('Gear category added!'); }
      setShowForm(false);
    } catch { fireToast('Save failed.', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await removeWebsiteGear(id); fireToast('Gear category deleted.'); }
    catch { fireToast('Delete failed.', 'error'); }
    setConfirmDelete(null);
  };

  if (websiteGearLoading) return <ListSkeleton />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Manage studio equipment categories shown on the Studio page. Each category holds multiple gear items.</p>
        <button onClick={() => open()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Add Category</button>
      </div>

      {websiteGear.length === 0
        ? <EmptyState emoji="🎛️" heading="No gear categories yet" sub="Add equipment categories (e.g. Microphones, Software) to populate the Studio page." onAdd={() => open()} />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {websiteGear.map((item: any) => {
              const itemLines = (item.items || '').split('\n').filter(Boolean);
              return (
                <div key={item.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color || 'var(--accent-gold-light)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Cpu size={15} color={item.color || 'var(--accent-gold-light)'} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.category}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{itemLines.length} item{itemLines.length !== 1 ? 's' : ''} · {item.icon}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => open(item)} style={{ padding: '5px 8px', borderRadius: 7, background: 'var(--surface-1)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><Edit2 size={12} /></button>
                      {confirmDelete === item.id
                        ? <DeleteConfirm onConfirm={() => remove(item.id)} onCancel={() => setConfirmDelete(null)} />
                        : <button onClick={() => setConfirmDelete(item.id)} style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,59,48,0.08)', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    {itemLines.slice(0, 3).map((l: string, i: number) => <div key={i}>{l.split('|')[0]?.trim()}</div>)}
                    {itemLines.length > 3 && <div style={{ opacity: 0.6 }}>+{itemLines.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {showForm && (
        <ModalForm title={editing ? 'Edit Gear Category' : 'Add Gear Category'} onClose={() => setShowForm(false)} onSave={save} saving={saving}>
          <FormInput label="Category Name" value={form.category} onChange={f('category')} required placeholder="e.g. Microphones" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Icon</label>
            <select className="form-input" value={form.icon} onChange={e => f('icon')(e.target.value)} style={{ width: '100%' }}>
              {GEAR_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.color} onChange={e => f('color')(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
              <input type="text" className="form-input" value={form.color} onChange={e => f('color')(e.target.value)} style={{ flex: 1 }} placeholder="var(--accent-gold-light)" />
            </div>
          </div>
          <FormInput label="Sort Order" value={String(form.order)} onChange={f('order')} type="number" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Items <span style={{ color: 'var(--color-danger)' }}>*</span>
              <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>— one per line as "Name|Description"</span>
            </label>
            <textarea
              className="form-input"
              value={form.items}
              onChange={e => f('items')(e.target.value)}
              required
              rows={6}
              placeholder={"Shure SM7B|Warm broadcast-grade dynamic mic\nFocusrite Scarlett 4i4|USB audio interface"}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        </ModalForm>
      )}
    </div>
  );
}
