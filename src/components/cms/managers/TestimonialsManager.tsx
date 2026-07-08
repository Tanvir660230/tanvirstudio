 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Trash2 } from 'lucide-react';
import { GridSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, ImageInputWithPreview, SectionCard, type FireToast } from '../shared';

// ─── Testimonials ─────────────────────────────────────────────────────────────
export function TestimonialsManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteTestimonials, websiteTestimonialsLoading, addWebsiteTestimonial, updateWebsiteTestimonial, removeWebsiteTestimonial } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', org: '', text: '', rating: '5', img: '' });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    setForm(item
      ? { name: item.name || '', org: item.org || '', text: item.text || '', rating: String(item.rating || 5), img: item.img || '' }
      : { name: '', org: '', text: '', rating: '5', img: '' }
    );
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, rating: Number(form.rating) || 5 };
      if (editId) { await updateWebsiteTestimonial(editId, data); fireToast('Testimonial updated!'); }
      else { await addWebsiteTestimonial({ ...data, createdAt: new Date().toISOString() }); fireToast('Testimonial added!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteTestimonial(id); fireToast('Testimonial removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  const pendingReviews = websiteTestimonials.filter((t: any) => t.approved === false);
  const approvedReviews = websiteTestimonials.filter((t: any) => t.approved !== false);

  const handleApprove = async (id: string) => {
    try { await updateWebsiteTestimonial(id, { approved: true }); fireToast('Review approved — now live on homepage!'); }
    catch { fireToast('Approval failed.', 'error'); }
  };

  const TestimonialCard = ({ item, showApprove }: { item: any; showApprove?: boolean }) => (
    <div style={{ background: 'var(--bg-color)', border: `1px solid ${showApprove ? 'rgba(0,122,255,0.25)' : 'var(--border-color)'}`, borderRadius: 12, padding: 16, position: 'relative' }}>
      {showApprove && (
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 800, color: 'var(--color-info)', background: 'rgba(0,122,255,0.1)', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pending</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-1)', backgroundImage: item.img ? `url(${item.img})` : 'none', backgroundSize: 'cover', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text-tertiary)' }}>
          {!item.img && (item.name || '?')[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.role || item.org}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-warning)', fontWeight: 700, flexShrink: 0 }}>{'★'.repeat(Math.min(5, item.rating || 5))}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>"{item.text}"</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {showApprove ? (
          <>
            <button onClick={() => handleApprove(item.id)} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Approve</button>
            {confirmDeleteId === item.id
              ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
              : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
            }
          </>
        ) : (
          <>
            <button onClick={() => handleOpen(item)} style={{ flex: 1, padding: '7px', borderRadius: 6, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13 }}>Edit</button>
            {confirmDeleteId === item.id
              ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
              : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
            }
          </>
        )}
      </div>
    </div>
  );

  return (
    <SectionCard title="Client Testimonials" onAdd={() => handleOpen()}>
      {websiteTestimonialsLoading ? <GridSkeleton count={3} height={160} />
        : websiteTestimonials.length === 0
          ? <EmptyState emoji="💬" heading="No testimonials yet" sub="Add client reviews to build trust on your homepage." onAdd={() => handleOpen()} />
          : (
            <>
              {pendingReviews.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approval</div>
                    <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--color-info)', color: '#fff', padding: '1px 7px', borderRadius: 999 }}>{pendingReviews.length}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,122,255,0.2)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {pendingReviews.map((item: any) => <TestimonialCard key={item.id} item={item} showApprove />)}
                  </div>
                </div>
              )}
              {approvedReviews.length > 0 && (
                <>
                  {pendingReviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published</div>
                      <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {approvedReviews.map((item: any) => <TestimonialCard key={item.id} item={item} />)}
                  </div>
                </>
              )}
            </>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit Testimonial' : 'Add Testimonial'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <FormInput label="Client Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <FormInput label="Organization / Title" value={form.org} onChange={v => setForm({ ...form, org: v })} required />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Review <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3} required style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <FormInput label="Rating (1–5)" type="number" value={form.rating} onChange={v => setForm({ ...form, rating: v })} required />
          <ImageInputWithPreview label="Avatar Image URL (Optional)" value={form.img} onChange={v => setForm({ ...form, img: v })} circular />
        </ModalForm>
      )}
    </SectionCard>
  );
}
