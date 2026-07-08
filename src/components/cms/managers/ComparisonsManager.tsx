 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Edit2, Trash2 } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, AudioInputWithUpload, SectionCard, type FireToast } from '../shared';

// ─── Comparisons ──────────────────────────────────────────────────────────────
export function ComparisonsManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteComparisons, websiteComparisonsLoading, addWebsiteComparison, updateWebsiteComparison, removeWebsiteComparison } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', artist: '', type: '', raw_url: '', mastered_url: '' });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    setForm(item
      ? { title: item.title || '', artist: item.artist || '', type: item.type || '', raw_url: item.raw_url || '', mastered_url: item.mastered_url || '' }
      : { title: '', artist: '', type: '', raw_url: '', mastered_url: '' }
    );
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.raw_url.trim() || !form.mastered_url.trim()) return;
    setSaving(true);
    try {
      if (editId) { await updateWebsiteComparison(editId, form); fireToast('Comparison updated!'); }
      else { await addWebsiteComparison({ ...form, createdAt: new Date().toISOString() }); fireToast('Comparison added!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteComparison(id); fireToast('Comparison removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  return (
    <SectionCard title="Before vs After (Raw / Mastered)" onAdd={() => handleOpen()}>
      {websiteComparisonsLoading ? <ListSkeleton />
        : websiteComparisons.length === 0
          ? <EmptyState emoji="🎚️" heading="No comparisons yet" sub="Show visitors the before-and-after of your mastering work." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {websiteComparisons.map((item: any) => (
                <div key={item.id} style={{ background: 'var(--bg-color)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', gap: 16 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{item.type}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.artist}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      {item.raw_url && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-gold-light)', background: 'rgba(217,173,98,0.12)', border: '1px solid rgba(217,173,98,0.25)', padding: '3px 8px', borderRadius: 100 }}>RAW ✓</span>}
                      {item.mastered_url && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)', padding: '3px 8px', borderRadius: 100 }}>MASTERED ✓</span>}
                      <button onClick={() => handleOpen(item)} style={{ padding: '8px', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}><Edit2 size={15} /></button>
                      {confirmDeleteId === item.id
                        ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
                        : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '8px', borderRadius: 8, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                      }
                    </div>
                  </div>
                  {/* Quick preview players */}
                  {(item.raw_url || item.mastered_url) && (
                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: item.raw_url && item.mastered_url ? '1fr 1fr' : '1fr', gap: 0, borderTop: '1px solid var(--border-color)' }}>
                      {item.raw_url && (
                        <div style={{ padding: '10px 14px', borderRight: item.mastered_url ? '1px solid var(--border-color)' : 'none' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-gold-light)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Before (Raw)</div>
                          <audio controls src={item.raw_url} style={{ width: '100%', height: 32 }} />
                        </div>
                      )}
                      {item.mastered_url && (
                        <div style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>After (Mastered)</div>
                          <audio controls src={item.mastered_url} style={{ width: '100%', height: 32 }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit Comparison' : 'Add Comparison'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormInput label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
            <FormInput label="Artist / Project Name" value={form.artist} onChange={v => setForm({ ...form, artist: v })} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="form-input" style={{ padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }}>
              <option value="">Select category…</option>
              <option value="Vocal Mixing">Vocal Mixing</option>
              <option value="Mixing & Mastering">Mixing & Mastering</option>
              <option value="Vocal Restoration">Vocal Restoration</option>
              <option value="Sound Design">Sound Design</option>
              <option value="Nasheed Production">Nasheed Production</option>
              <option value="Podcast Editing">Podcast Editing</option>
              <option value="Background Score">Background Score</option>
            </select>
          </div>
          <AudioInputWithUpload
            label="Raw Audio — Before 🎤"
            value={form.raw_url}
            onChange={v => setForm({ ...form, raw_url: v })}
            required
            storageKey={`raw_${form.title.replace(/\s+/g, '_').toLowerCase() || 'file'}`}
            fireToast={fireToast}
          />
          <AudioInputWithUpload
            label="Mastered Audio — After ✨"
            value={form.mastered_url}
            onChange={v => setForm({ ...form, mastered_url: v })}
            required
            storageKey={`mastered_${form.title.replace(/\s+/g, '_').toLowerCase() || 'file'}`}
            fireToast={fireToast}
          />
        </ModalForm>
      )}
    </SectionCard>
  );
}
