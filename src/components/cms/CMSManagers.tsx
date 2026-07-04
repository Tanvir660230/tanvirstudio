/* eslint-disable @typescript-eslint/no-unused-vars, react-refresh/only-export-components */

import React, { useState, useRef } from 'react';

import { useData } from '../../contexts/DataContext';

import { useSettings } from '../../contexts/SettingsContext';

import { storage } from '../../lib/firebase';

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Plus, Edit2, Trash2, Image, Headphones, MessageSquare, Package, Wrench, HelpCircle, Upload, X, ImageIcon, BookOpen, Rss, Clock, Cpu, Copy, Check as CheckIcon, Link2, Mic, Sliders, Music2, Video, Film, Monitor, Scissors, Palette, FileText, Zap, Layers, Code2, ArrowUpRight } from 'lucide-react';

import { Spinner } from '../Spinner';

import { Toast } from '../Toast';



type FireToast = (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;




// ─── Skeleton helpers ─────────────────────────────────────────────────────────

export function GridSkeleton({ count = 3, height = 180 }: { count?: number; height?: number }) {

  return (

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>

      {[...Array(count)].map((_, i) => (

        <div key={i} className="skeleton" style={{ height, borderRadius: 12, animationDelay: `${i * 0.1}s` }} />

      ))}

    </div>

  );

}



function ListSkeleton({ count = 4 }: { count?: number }) {

  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {[...Array(count)].map((_, i) => (

        <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, animationDelay: `${i * 0.1}s` }} />

      ))}

    </div>

  );

}



export function EmptyState({ emoji, heading, sub, onAdd }: { emoji: string; heading: string; sub: string; onAdd: () => void }) {

  return (

    <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-color)', borderRadius: 16, border: '2px dashed var(--border-color)' }}>

      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{emoji}</div>

      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{heading}</div>

      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>{sub}</div>

      <button onClick={onAdd} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>

        <Plus size={15} /> Add First

      </button>

    </div>

  );

}



export function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {

  return (

    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)' }}>Delete?</span>

      <button onClick={onConfirm} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Yes</button>

      <button onClick={onCancel} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>

    </div>

  );

}



// ─── Hero Background ──────────────────────────────────────────────────────────

export function HeroBgManager({ fireToast }: { fireToast: FireToast }) {

  const { settings, updateSettings } = useSettings();

  const [saving, setSaving] = useState(false);

  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);



  const current = settings.heroBgImage || '';



  const compressAndSave = (file: File) => {

    const allowedExts = /\.(jpe?g|png|webp|gif|avif)$/i;

    if (!file.type.startsWith('image/') || !allowedExts.test(file.name)) { fireToast('Only image files (JPEG, PNG, WebP, GIF) are allowed.', 'error'); return; }

    if (file.size > 8 * 1024 * 1024) { fireToast('Image must be under 8 MB.', 'error'); return; }

    const img = new window.Image();

    const reader = new FileReader();

    reader.onload = ev => {

      img.onload = async () => {

        const MAX = 1920;

        const scale = Math.min(1, MAX / Math.max(img.width, img.height));

        const canvas = document.createElement('canvas');

        canvas.width = Math.round(img.width * scale);

        canvas.height = Math.round(img.height * scale);

        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

        setSaving(true);

        try {

          const blob = await new Promise<Blob>((res, rej) =>

            canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.82)

          );

          const sRef = storageRef(storage, 'images/heroBgImage.jpg');

          await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });

          const url = await getDownloadURL(sRef);

          await updateSettings({ heroBgImage: url });

          fireToast('Hero background updated!');

        } catch { fireToast('Save failed.', 'error'); }

        finally { setSaving(false); }

      };

      img.src = ev.target!.result as string;

    };

    reader.readAsDataURL(file);

  };



  const saveUrl = async () => {

    const url = urlInput.trim();

    if (!url) return;

    try { new URL(url); } catch { fireToast('Enter a valid URL.', 'error'); return; }

    setSaving(true);

    try {

      await updateSettings({ heroBgImage: url });

      setUrlInput('');

      fireToast('Hero background updated!');

    } catch { fireToast('Save failed.', 'error'); }

    finally { setSaving(false); }

  };



  const remove = async () => {

    setSaving(true);

    try { await updateSettings({ heroBgImage: '' }); fireToast('Background removed.'); }

    catch { fireToast('Failed to remove.', 'error'); }

    finally { setSaving(false); }

  };



  return (

    <div style={{ maxWidth: 680 }}>

      <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>

        Upload a background photo for the hero section of your homepage. The image will appear behind the headline with a dark overlay.

      </p>



      {/* Preview */}

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-color)', marginBottom: 24 }}>

        {current ? (

          <>

            <img src={current} alt="Hero background" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>

              <span style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>Pro sound. Pure emotion.</span>

              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Preview — hero text over your image</span>

            </div>

          </>

        ) : (

          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-tertiary)' }}>

            <ImageIcon size={40} strokeWidth={1.2} />

            <span style={{ fontSize: 14 }}>No background image set — using gradient</span>

          </div>

        )}

      </div>



      {/* Actions */}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>

        <button

          onClick={() => fileInputRef.current?.click()}

          disabled={saving}

          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'var(--color-info)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}

        >

          {saving ? <Spinner size={14} color="white" /> : <Upload size={14} />}

          Upload Image

        </button>

        {current && (

          <button

            onClick={remove}

            disabled={saving}

            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}

          >

            <X size={14} /> Remove

          </button>

        )}

        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { compressAndSave(f); e.target.value = ''; } }} />

      </div>



      {/* URL input */}

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>

        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or paste an image URL</p>

        <div style={{ display: 'flex', gap: 8 }}>

          <input

            type="url"

            value={urlInput}

            onChange={e => setUrlInput(e.target.value)}

            placeholder="https://example.com/hero.jpg"

            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}

          />

          <button

            onClick={saveUrl}

            disabled={saving || !urlInput.trim()}

            style={{ padding: '9px 16px', borderRadius: 10, background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: (saving || !urlInput.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !urlInput.trim()) ? 0.5 : 1 }}

          >

            Save URL

          </button>

        </div>

        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>

          Recommended: upload a high-resolution landscape photo (1920×1080 or wider). Uploaded files are compressed to JPEG automatically.

        </p>

      </div>

    </div>

  );

}



export const toSlug = (s: string) =>

  (s || '').toLowerCase().replace(/[&']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');



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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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

                    <div style={{ display: 'grid', gridTemplateColumns: item.raw_url && item.mastered_url ? '1fr 1fr' : '1fr', gap: 0, borderTop: '1px solid var(--border-color)' }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <FormInput label="Current Price (e.g. ৳2,999)" value={form.price} onChange={v => setForm({ ...form, price: v })} required />

            <FormInput label="Original Price (e.g. ৳4,500)" value={form.originalPrice} onChange={v => setForm({ ...form, originalPrice: v })} />

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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



// ─── Services ─────────────────────────────────────────────────────────────────

export const CAT_META = {

  audio:    { label: 'Audio',    color: 'var(--accent-gold-light)', bg: 'rgba(217,173,98,0.12)',  border: 'rgba(217,173,98,0.3)'  },

  video:    { label: 'Video',    color: '#5b9fff', bg: 'rgba(91,159,255,0.12)',  border: 'rgba(91,159,255,0.3)'  },

  software: { label: 'Software', color: '#34d18a', bg: 'rgba(52,209,138,0.12)',  border: 'rgba(52,209,138,0.3)'  },

  content:  { label: 'Content',  color: '#d06adc', bg: 'rgba(208,106,220,0.12)', border: 'rgba(208,106,220,0.3)' },

} as const;



export const ICON_LIST = [

  { key: 'Mic',       emoji: '🎤' }, { key: 'Sliders',   emoji: '🎚️' }, { key: 'Music2',    emoji: '🎵' },

  { key: 'Headphones',emoji: '🎧' }, { key: 'Video',     emoji: '📹' }, { key: 'Film',      emoji: '🎬' },

  { key: 'Monitor',   emoji: '🖥️' }, { key: 'Scissors',  emoji: '✂️' }, { key: 'Palette',   emoji: '🎨' },

  { key: 'FileText',  emoji: '📄' }, { key: 'Zap',       emoji: '⚡' }, { key: 'Layers',    emoji: '🗂️' },

  { key: 'Code2',     emoji: '💻' }, { key: 'BookOpen',  emoji: '📖' }, { key: 'Star',      emoji: '⭐' },

  { key: 'Globe',     emoji: '🌐' }, { key: 'Camera',    emoji: '📷' }, { key: 'BarChart2', emoji: '📊' },

  { key: 'Radio',     emoji: '📻' }, { key: 'Speaker',   emoji: '🔊' }, { key: 'Wand2',     emoji: '🪄' },

  { key: 'PenTool',   emoji: '✍️' },

];



const iconEmoji = (icon: string) => ICON_LIST.find(i => i.key === icon)?.emoji ?? '🎛️';



const CMS_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {

  Mic, Sliders, Music2, Headphones, Video, Film, Monitor,

  Scissors, Palette, FileText, Zap, Layers, Code2, BookOpen,

};

export const resolveIconCMS = (name: string) => CMS_ICON_MAP[name] ?? Sliders;





type CatKey = keyof typeof CAT_META;

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

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



// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionCard({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {

  return (

    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h2>

        <button onClick={onAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          <Plus size={15} /> Add

        </button>

      </div>

      {children}

    </div>

  );

}



export function ModalForm({ title, onClose, onSave, saving, children, wide }: { title: string; onClose: () => void; onSave: (e: React.FormEvent) => void; saving?: boolean; children: React.ReactNode; wide?: boolean }) {

  return (

    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { if (!saving) onClose(); }}>

      <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: wide ? 900 : 520, borderRadius: 20, overflow: 'hidden', boxShadow: 'none', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>

          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>

          <button onClick={() => { if (!saving) onClose(); }} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-1)', border: 'none', color: 'var(--text-tertiary)', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>

        </div>

        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>

          <div style={{ padding: 24, flex: 1 }}>{children}</div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bg-color)', flexShrink: 0 }}>

            <button type="button" onClick={() => { if (!saving) onClose(); }} disabled={saving} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: saving ? 0.5 : 1, fontWeight: 500, fontSize: 14 }}>Cancel</button>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.8 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>

              {saving ? <><Spinner size={14} color="white" /> Saving…</> : 'Save Changes'}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



export function FormInput({ label, value, onChange, required, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {

  return (

    <div style={{ marginBottom: 16 }}>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>

        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}

      </label>

      <input type={type} className="form-input" value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box' }} />

    </div>

  );

}



function ImageInputWithPreview({ label, value, onChange, required, circular }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; circular?: boolean }) {

  return (

    <div style={{ marginBottom: 16 }}>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>

        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}

      </label>

      <input type="url" className="form-input" value={value} onChange={e => onChange(e.target.value)} required={required} placeholder="https://..." style={{ width: '100%', boxSizing: 'border-box' }} />

      {value && (

        <div style={{ marginTop: 8, width: circular ? 72 : '100%', height: circular ? 72 : 80, borderRadius: circular ? '50%' : 8, border: '1px solid var(--border-color)', backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center', background: 'var(--surface-1)' }} />

      )}

    </div>

  );

}



function AudioInputWithUpload({ label, value, onChange, required, storageKey, fireToast }: {

  label: string; value: string; onChange: (v: string) => void;

  required?: boolean; storageKey: string; fireToast: FireToast;

}) {

  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);



  const handleFile = async (file: File) => {

    const allowed = /\.(mp3|wav|ogg|aac|m4a|flac)$/i;

    if (!allowed.test(file.name) && !file.type.startsWith('audio/')) {

      fireToast('Only audio files (MP3, WAV, OGG, AAC, FLAC) allowed.', 'error');

      return;

    }

    if (file.size > 80 * 1024 * 1024) { fireToast('File must be under 80 MB.', 'error'); return; }

    setUploading(true);

    try {

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';

      const sRef = storageRef(storage, `audio/comparisons/${storageKey}_${Date.now()}.${ext}`);

      await uploadBytes(sRef, file, { contentType: file.type || 'audio/mpeg' });

      const url = await getDownloadURL(sRef);

      onChange(url);

      fireToast('Audio uploaded!');

    } catch { fireToast('Upload failed. Check Firebase Storage rules.', 'error'); }

    finally { setUploading(false); }

  };



  return (

    <div style={{ marginBottom: 16 }}>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>

        {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}

      </label>

      <div style={{ display: 'flex', gap: 8, marginBottom: value ? 10 : 0 }}>

        <input

          type="url"

          className="form-input"

          value={value}

          onChange={e => onChange(e.target.value)}

          placeholder="Paste URL or upload →"

          style={{ flex: 1, boxSizing: 'border-box' as const }}

        />

        <button

          type="button"

          onClick={() => fileRef.current?.click()}

          disabled={uploading}

          style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--color-info)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' as const }}

        >

          {uploading ? <Spinner size={13} color="white" /> : <Upload size={13} />}

          {uploading ? 'Uploading…' : 'Upload'}

        </button>

        <input

          type="file"

          ref={fileRef}

          accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac"

          style={{ display: 'none' }}

          onChange={e => { const f = e.target.files?.[0]; if (f) { handleFile(f); e.target.value = ''; } }}

        />

      </div>

      {value && (

        <audio controls src={value} style={{ width: '100%', height: 40, borderRadius: 8, outline: 'none', display: 'block' }} />

      )}

    </div>

  );

}



export function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {

  return (

    <button

      onClick={onClick}

      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: active ? 'var(--accent-blue)' : 'transparent', color: active ? 'var(--card-bg)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}

      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-1)'; }}

      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}

    >

      {icon} {children}

    </button>

  );

}



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

