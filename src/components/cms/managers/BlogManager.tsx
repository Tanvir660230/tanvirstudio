 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Edit2, Trash2 } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, SectionCard, toSlug, type FireToast } from '../shared';

// ─── Blog ─────────────────────────────────────────────────────────────────────
const BLOG_CATS = [
  { value: 'audio', label: 'Audio & Mixing' },
  { value: 'video', label: 'Video Production' },
  { value: 'tips',  label: 'Studio Tips' },
  { value: 'story', label: 'Studio Stories' },
];

export function BlogManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteBlogs, websiteBlogsLoading, addWebsiteBlog, updateWebsiteBlog, removeWebsiteBlog } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  const EMPTY = { category: 'audio', title: '', slug: '', author: '', coverImage: '', excerpt: '', body: '', date: new Date().toISOString().slice(0, 10), readTime: '5', featured: false };
  const [form, setForm] = useState({ ...EMPTY });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    if (item) {
      setAutoSlug(false);
      setForm({
        category: item.category || 'audio',
        title: item.title || '',
        slug: item.slug || toSlug(item.title || ''),
        author: item.author || '',
        coverImage: item.coverImage || '',
        excerpt: item.excerpt || '',
        body: Array.isArray(item.body) ? item.body.join('\n\n') : (item.body || ''),
        date: item.date || new Date().toISOString().slice(0, 10),
        readTime: String(item.readTime || 5),
        featured: Boolean(item.featured),
      });
    } else {
      setAutoSlug(true);
      setForm({ ...EMPTY });
    }
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim()) return;
    setSaving(true);
    try {
      const data = {
        category: form.category,
        title: form.title.trim(),
        slug: form.slug.trim() || toSlug(form.title.trim()),
        author: form.author.trim(),
        coverImage: form.coverImage.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body.split('\n\n').map((p: string) => p.trim()).filter(Boolean),
        date: form.date,
        readTime: Number(form.readTime) || 5,
        featured: form.featured,
      };
      if (editId) { await updateWebsiteBlog(editId, data); fireToast('Post updated!'); }
      else { await addWebsiteBlog({ ...data, createdAt: new Date().toISOString() }); fireToast('Post published!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please retry.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteBlog(id); fireToast('Post deleted.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  const BLOG_CAT_COLOR: Record<string, string> = { audio: 'var(--accent-gold-light)', video: '#5b9fff', tips: '#34d18a', story: '#d06adc' };

  return (
    <SectionCard title="Blog Posts" onAdd={() => handleOpen()}>
      {websiteBlogsLoading ? <ListSkeleton count={4} />
        : websiteBlogs.length === 0
          ? <EmptyState emoji="✍️" heading="No blog posts yet" sub="Default posts are shown on the site. Add your own to override them." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {websiteBlogs.map((item: any) => {
                const color = BLOG_CAT_COLOR[item.category] || 'var(--accent-gold-light)';
                const catLabel = BLOG_CATS.find(c => c.value === item.category)?.label || item.category;
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, background: 'var(--bg-color)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 100, letterSpacing: '.06em', textTransform: 'uppercase' }}>{catLabel}</span>
                        {item.featured && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', background: 'rgba(255,149,0,0.12)', padding: '2px 8px', borderRadius: 100 }}>Featured</span>}
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{item.date} · {item.readTime}min</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.excerpt}</div>
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
        <ModalForm title={editId ? 'Edit Post' : 'New Blog Post'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category</label>
            <select className="form-input form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
              {BLOG_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <FormInput label="Title" value={form.title} onChange={v => { setForm(p => ({ ...p, title: v, slug: autoSlug ? toSlug(v) : p.slug })); }} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>URL Slug <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(auto-generated)</span></label>
            <input className="form-input" value={form.slug} onChange={e => { setAutoSlug(false); setForm(p => ({ ...p, slug: e.target.value })); }} placeholder="e.g. how-to-mix-nasheed-vocals" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormInput label="Author Name" value={form.author} onChange={v => setForm(p => ({ ...p, author: v }))} placeholder="e.g. Tanvir Ahmed" />
            <FormInput label="Cover Image URL (Optional)" value={form.coverImage} onChange={v => setForm(p => ({ ...p, coverImage: v }))} placeholder="https://..." />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Excerpt <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input" value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Body <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(separate paragraphs with a blank line)</span></label>
            <textarea className="form-input" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormInput label="Publish Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
            <FormInput label="Read Time (minutes)" type="number" value={form.readTime} onChange={v => setForm(p => ({ ...p, readTime: v }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input type="checkbox" id="featured-post" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="featured-post" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Mark as Featured Post</label>
          </div>
        </ModalForm>
      )}
    </SectionCard>
  );
}
