 
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Edit2, Trash2 } from 'lucide-react';
import { ListSkeleton, EmptyState, DeleteConfirm, ModalForm, FormInput, SectionCard, type FireToast } from '../shared';

// ─── FAQs ─────────────────────────────────────────────────────────────────────
export function FaqsManager({ fireToast }: { fireToast: FireToast }) {
  const { websiteFaqs, websiteFaqsLoading, addWebsiteFaq, updateWebsiteFaq, removeWebsiteFaq } = useData();
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ q: '', a: '', order: '', cat: 'booking' });

  const handleOpen = (item?: any) => {
    setEditId(item ? item.id : null);
    setForm(item ? { q: item.q || '', a: item.a || '', order: item.order?.toString() || '', cat: item.cat || 'booking' } : { q: '', a: '', order: '', cat: 'booking' });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.q.trim() || !form.a.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, order: Number(form.order) || websiteFaqs.length + 1 };
      if (editId) { await updateWebsiteFaq(editId, data); fireToast('FAQ updated!'); }
      else { await addWebsiteFaq({ ...data, createdAt: new Date().toISOString() }); fireToast('FAQ added!'); }
      setIsOpen(false);
    } catch { fireToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await removeWebsiteFaq(id); fireToast('FAQ removed.'); }
    catch { fireToast('Failed to delete.', 'error'); }
    setConfirmDeleteId(null);
  };

  return (
    <SectionCard title="Frequently Asked Questions" onAdd={() => handleOpen()}>
      {websiteFaqsLoading ? <ListSkeleton count={4} />
        : websiteFaqs.length === 0
          ? <EmptyState emoji="❓" heading="No FAQs yet" sub="Default FAQs are active on the site. Add custom ones to override them." onAdd={() => handleOpen()} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {websiteFaqs.map((item: any, i: number) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, background: 'var(--bg-color)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>#{item.order || i + 1}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{item.q}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.a}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => handleOpen(item)} style={{ padding: '8px', borderRadius: 8, background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}><Edit2 size={15} /></button>
                    {confirmDeleteId === item.id
                      ? <DeleteConfirm onConfirm={() => handleDelete(item.id)} onCancel={() => setConfirmDeleteId(null)} />
                      : <button onClick={() => setConfirmDeleteId(item.id)} style={{ padding: '8px', borderRadius: 8, background: 'rgba(255,59,48,0.08)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
      {isOpen && (
        <ModalForm title={editId ? 'Edit FAQ' : 'Add FAQ'} onClose={() => setIsOpen(false)} onSave={handleSave} saving={saving}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category</label>
            <select className="form-input form-select" value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }}>
              <option value="booking">Booking & Orders</option>
              <option value="production">Production & Services</option>
              <option value="policy">Policies & Support</option>
            </select>
          </div>
          <FormInput label="Question" value={form.q} onChange={v => setForm({ ...form, q: v })} required />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Answer <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input" value={form.a} onChange={e => setForm({ ...form, a: e.target.value })} rows={4} required style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <FormInput label="Order Number (Optional)" type="number" value={form.order} onChange={v => setForm({ ...form, order: v })} />
        </ModalForm>
      )}
    </SectionCard>
  );
}
