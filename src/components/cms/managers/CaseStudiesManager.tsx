 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Edit2, Trash2 } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, SectionCard, toSlug, type FireToast } from '../shared';

// ─── Case Studies ─────────────────────────────────────────────────────────────
const CASE_CATS = [
  { value: 'audio',    label: 'Audio Production',       color: 'var(--accent-gold-light)' },
  { value: 'video',    label: 'Video & Content',        color: '#5b9fff' },
  { value: 'software', label: 'Software & Automation',  color: '#34d18a' },
];

export function CaseStudiesManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteCaseStudies, websiteCaseStudiesLoading, addWebsiteCaseStudy, updateWebsiteCaseStudy, removeWebsiteCaseStudy } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  const EMPTY_FORM = { categoryType: 'audio', client: '', title: '', slug: '', subtitle: '', challenge: '', approach: '', resultsData: '', tags: '', duration: '' };
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    if (item) {
      setAutoSlug(false);
      setForm({
        categoryType: item.categoryType || 'audio',
        client: item.client || '',
        title: item.title || '',
        slug: item.slug || toSlug(item.title || ''),
        subtitle: item.subtitle || '',
        challenge: item.challenge || '',
        approach: Array.isArray(item.approach) ? item.approach.join('\n') : (item.approach || ''),
        resultsData: Array.isArray(item.resultsData) ? item.resultsData.map((r: any) => `${r.label}|${r.value}`).join('\n') : (item.resultsData || ''),
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
        duration: item.duration || '',
      });
    } else {
      setAutoSlug(true);
      setForm({ ...EMPTY_FORM });
    }
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client.trim()) return;
    setSaving(true);
    try {
      const catInfo = CASE_CATS.find(c => c.value === form.categoryType) || CASE_CATS[0];
      const data = {
        categoryType: form.categoryType,
        category: catInfo.label,
        categoryColor: catInfo.color,
        client: form.client.trim(),
        title: form.title.trim(),
        slug: form.slug.trim() || toSlug(form.title.trim()),
        subtitle: form.subtitle.trim(),
        challenge: form.challenge.trim(),
        approach: form.approach.split('\n').map(s => s.trim()).filter(Boolean),
        resultsData: form.resultsData.split('\n').map(s => s.trim()).filter(Boolean).map(s => {
          const [label, value] = s.split('|');
          return { label: (label || '').trim(), value: (value || '').trim() };
        }),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        duration: form.duration.trim(),
        createdAt: new Date().toISOString(),
      };
      if (editId) { await updateWebsiteCaseStudy(editId, data); fireToast('Case study updated!'); }
      else { await addWebsiteCaseStudy(data); fireToast('Case study added!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteCaseStudy(id); fireToast('Case study removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  const f = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <SectionCard title="Case Studies" onAdd={() => handleOpen()}>
      {websiteCaseStudiesLoading ? <ListSkeleton count={3} />
        : websiteCaseStudies.length === 0
          ? <EmptyState emoji="📂" heading="No case studies yet" sub="Add real client success stories to showcase your work." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {websiteCaseStudies.map((item: any) => {
                const catColor = item.categoryColor || 'var(--accent-gold-light)';
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, background: 'var(--bg-color)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: catColor, background: `${catColor}18`, padding: '2px 8px', borderRadius: 100, letterSpacing: '.06em', textTransform: 'uppercase' }}>{item.category || 'Uncategorized'}</span>
                        {item.duration && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.duration}</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.client}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      <button onClick={() => handleOpen(item)} style={{ padding: '8px', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}><Edit2 size={15} /></button>
                      {confirmDeleteId === item.id
                        ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
                        : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '8px', borderRadius: 8, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit Case Study' : 'Add Case Study'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category</label>
            <select className="form-input form-select" value={form.categoryType} onChange={e => setForm(p => ({ ...p, categoryType: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
              {CASE_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <FormInput label="Client Name" value={form.client} onChange={f('client')} required />
          <FormInput label="Project Title" value={form.title} onChange={v => { setForm(p => ({ ...p, title: v, slug: autoSlug ? toSlug(v) : p.slug })); }} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>URL Slug <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(auto-generated from title)</span></label>
            <input className="form-input" value={form.slug} onChange={e => { setAutoSlug(false); setForm(p => ({ ...p, slug: e.target.value })); }} placeholder="e.g. nasheed-ep-production" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <FormInput label="Subtitle (one-line description)" value={form.subtitle} onChange={f('subtitle')} />
          <FormInput label="Duration (e.g. 14 days)" value={form.duration} onChange={f('duration')} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Challenge (the client's problem)</label>
            <textarea className="form-input" value={form.challenge} onChange={e => f('challenge')(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Our Approach <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(one step per line)</span></label>
            <textarea className="form-input" value={form.approach} onChange={e => f('approach')(e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Step 1 description&#10;Step 2 description&#10;Step 3 description" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Results <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(format: Label|Value, one per line)</span></label>
            <textarea className="form-input" value={form.resultsData} onChange={e => f('resultsData')(e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Views in first 30 days|420K&#10;Subscriber growth|+18%&#10;Delivery time|19 days" />
          </div>
          <FormInput label="Tags (comma-separated)" value={form.tags} onChange={f('tags')} placeholder="Mixing, Mastering, Vocal restoration" />
        </ModalForm>
      )}
    </SectionCard>
  );
}
