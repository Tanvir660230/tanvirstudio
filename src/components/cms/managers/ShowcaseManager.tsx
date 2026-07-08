 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Trash2 } from 'lucide-react';
import { GridSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, ImageInputWithPreview, SectionCard, type FireToast } from '../shared';

// ─── Showcase ─────────────────────────────────────────────────────────────────
export function ShowcaseManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteShowcase, websiteShowcaseLoading, addWebsiteShowcase, updateWebsiteShowcase, removeWebsiteShowcase } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', artist: '', type: '', thumbnail_url: '', youtube_url: '' });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    setForm(item
      ? { title: item.title || '', artist: item.artist || '', type: item.type || '', thumbnail_url: item.thumbnail_url || item.thumb || '', youtube_url: item.youtube_url || item.ytLink || '' }
      : { title: '', artist: '', type: '', thumbnail_url: '', youtube_url: '' }
    );
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, thumb: form.thumbnail_url, ytLink: form.youtube_url };
      if (editId) {
        await updateWebsiteShowcase(editId, data);
        fireToast('Showcase updated!');
      } else {
        await addWebsiteShowcase({ ...data, createdAt: new Date().toISOString() });
        fireToast('Showcase item added!');
      }
      setIsOpen(false);
    } catch {
      fireToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteShowcase(id); fireToast('Item removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  return (
    <SectionCard title="Featured Audio Showcase" onAdd={() => handleOpen()}>
      {websiteShowcaseLoading ? <GridSkeleton height={220} />
        : websiteShowcase.length === 0
          ? <EmptyState emoji="🎵" heading="No showcase items yet" sub="Add your best projects to feature on the homepage." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {websiteShowcase.map((item: any) => (
                <div key={item.id} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 140, background: 'var(--surface-1)', backgroundImage: `url(${item.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{item.type}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{item.artist}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => handleOpen(item)} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13 }}>Edit</button>
                      {confirmDeleteId === item.id
                        ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
                        : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit Showcase' : 'Add Showcase'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormInput label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
            <FormInput label="Artist / Creator" value={form.artist} onChange={v => setForm({ ...form, artist: v })} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="form-input form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required style={{ width: '100%', boxSizing: 'border-box' as const }}>
              <option value="">Select category…</option>
              <option value="Vocal Production">Vocal Production</option>
              <option value="Mixing & Mastering">Mixing & Mastering</option>
              <option value="Nasheed Production">Nasheed Production</option>
              <option value="Sound Design">Sound Design</option>
              <option value="Podcast Editing">Podcast Editing</option>
              <option value="Video Editing">Video Editing</option>
              <option value="Lyric Video">Lyric Video</option>
              <option value="Motion Graphics">Motion Graphics</option>
              <option value="Channel Branding">Channel Branding</option>
              <option value="Background Score">Background Score</option>
            </select>
          </div>
          <ImageInputWithPreview label="Thumbnail URL" value={form.thumbnail_url} onChange={v => setForm({ ...form, thumbnail_url: v })} required />
          <FormInput label="YouTube Link (Optional)" value={form.youtube_url} onChange={v => setForm({ ...form, youtube_url: v })} />
        </ModalForm>
      )}
    </SectionCard>
  );
}
