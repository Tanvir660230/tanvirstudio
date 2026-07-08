 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, type FireToast } from '../shared';

// ─── Timeline Manager ─────────────────────────────────────────────────────────
export function TimelineManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteTimeline, websiteTimelineLoading, addWebsiteTimeline, updateWebsiteTimeline, removeWebsiteTimeline } = useData();
  const blank = { year: '', title: '', desc: '', color: 'var(--accent-gold)', order: 0 };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const open = (item?: any) => {
    if (item) { setForm({ year: item.year || '', title: item.title || '', desc: item.desc || '', color: item.color || 'var(--accent-gold)', order: item.order ?? 0 }); setEditing(item.id); }
    else { setForm(blank); setEditing(null); }
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      if (editing) { await updateWebsiteTimeline(editing, payload); fireToast('Timeline entry updated!'); }
      else { await addWebsiteTimeline(payload); fireToast('Timeline entry added!'); }
      setShowForm(false);
    } catch { fireToast('Save failed.', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await removeWebsiteTimeline(id); fireToast('Entry deleted.'); }
    catch { fireToast('Delete failed.', 'error'); }
    setConfirmDelete(null);
  };

  if (websiteTimelineLoading) return <ListSkeleton />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Manage the studio history timeline shown on the About page.</p>
        <button onClick={() => open()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Add Entry</button>
      </div>

      {websiteTimeline.length === 0
        ? <EmptyState emoji="🕐" heading="No timeline entries yet" sub="Add milestone events to tell your studio's story on the About page." onAdd={() => open()} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {websiteTimeline.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color || 'var(--accent-gold)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{item.year}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => open(item)} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><Edit2 size={13} /></button>
                  {confirmDelete === item.id
                    ? <DeleteConfirm onConfirm={() => remove(item.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button onClick={() => setConfirmDelete(item.id)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,59,48,0.08)', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                  }
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showForm && (
        <ModalForm title={editing ? 'Edit Timeline Entry' : 'Add Timeline Entry'} onClose={() => setShowForm(false)} onSave={save} saving={saving}>
          <FormInput label="Year / Period" value={form.year} onChange={f('year')} required placeholder="e.g. October 2018" />
          <FormInput label="Title" value={form.title} onChange={f('title')} required placeholder="e.g. The First Breath" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input" value={form.desc} onChange={e => f('desc')(e.target.value)} required rows={3} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <FormInput label="Sort Order (lower = earlier)" value={String(form.order)} onChange={f('order')} type="number" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Dot Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.color} onChange={e => f('color')(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
              <input type="text" className="form-input" value={form.color} onChange={e => f('color')(e.target.value)} style={{ flex: 1 }} placeholder="var(--accent-gold)" />
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
