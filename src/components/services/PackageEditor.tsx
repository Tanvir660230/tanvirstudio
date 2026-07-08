import React from 'react';
import { Check as CheckIcon, X, Loader2 } from 'lucide-react';
import { toSlug, CAT_META, ICON_LIST } from '../cms/CMSManagers';
import type { CatKey, FormState, PkgTabKey } from '../../pages/ServicesManager';

interface PackageEditorProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editId: string | null;
  autoSlug: boolean;
  setAutoSlug: (val: boolean) => void;
  pkgTab: PkgTabKey;
  setPkgTab: (val: PkgTabKey) => void;
  saving: boolean;
  handleSave: (e?: React.FormEvent | React.MouseEvent) => void;
  handleCloseForm: () => void;
}

export function PackageEditor({
  form, setForm, editId, autoSlug, setAutoSlug, pkgTab, setPkgTab, saving, handleSave, handleCloseForm
}: PackageEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-1)', borderRadius: 24, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleCloseForm} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{editId ? 'Edit Service' : 'Add New Service'}</h2>
        </div>
        <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 100, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
          {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Service'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: 'var(--surface-1)' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680}}>

          {/* SECTION: Basic Info */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-info)', boxShadow: 'none' }} /> Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Service Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: autoSlug ? toSlug(e.target.value) : f.slug }))} required style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. Premium Nasheed Mix" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Starting Price (৳)</label>
                <input type="number" className="form-input" value={form.price} min="0" onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 5000" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Category <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.entries(CAT_META) as [CatKey, typeof CAT_META.audio][]).map(([key, meta]) => {
                    const on = form.category === key;
                    return (
                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}
                        style={{ padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: on ? 800 : 600, transition: 'all 0.2s', border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border-color)'}`, background: on ? 'var(--text-primary)' : 'var(--surface-1)', color: on ? 'var(--bg-color)' : 'var(--text-secondary)' }}>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Cover Image (Filename/URL)</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={form.coverImage || ''}
                      onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                      style={{ flex: 1, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                      placeholder="e.g. /my-cover.jpg"
                    />
                    {form.coverImage && (
                      <div style={{ width: 80, height: 50, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <img src={form.coverImage} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>Type the filename (e.g. <strong style={{ color: 'var(--text-primary)' }}>/cover.jpg</strong>) after putting it in the public folder.</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Service Icon</label>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 8, overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
                {ICON_LIST.map(({ key, emoji }) => {
                  const on = form.icon === key;
                  return (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, icon: key }))} title={key}
                      style={{ width: 44, height: 44, borderRadius: 12, background: on ? 'var(--text-primary)' : 'var(--surface-1)', color: on ? 'var(--bg-color)' : 'var(--text-secondary)', border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', boxShadow: on ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION: Details */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '28px 32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)', boxShadow: 'none' }} /> Service Details
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Short Description <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} required style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Describe what this service includes..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Service Features (Bullet Points)</label>
              <textarea
                className="form-input"
                value={form.features}
                onChange={e => {
                  let val = e.target.value;
                  val = val.replace(/^[\s​]*[•\-*]\s+/gm, '');
                  val = val.replace(/^[\s​]*[0-9]+\.\s+/gm, '');
                  setForm(f => ({ ...f, features: val }));
                }}
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }}
                placeholder="Industry-standard delivery&#10;High quality stems&#10;24/7 Support"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {(() => {
                  const cat = form.category;
                  const presets = ['audio', 'vocal', 'nasheed'].includes(cat) ? ["High-Quality WAV", "Commercial Use", "Industry-Standard Mixing", "Vocal Tuning", "Source Stems Included", "Unlimited Revisions"]
                    : ['video', 'lyric', 'podcast'].includes(cat) ? ["1080p / 4K Export", "Commercial Rights", "Custom Animations", "Background Music", "Sound Effects (SFX)", "Unlimited Revisions"]
                    : ["High-Res Export", "Source Files Included", "Commercial Use", "Custom Typography", "Unlimited Revisions", "Fast Delivery"];
                  return presets.map(p => (
                    <button type="button" key={p} onClick={() => { if (!form.features.includes(p)) setForm(f => ({ ...f, features: (f.features ? f.features.trim() + '\n' : '') + p })); }}
                      style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >+ {p}</button>
                  ));
                })()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckIcon size={8} color="var(--text-primary)" strokeWidth={3} /></div>
                Write each feature on a new line. Bullets/numbers are auto-removed on paste!
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>About (Details Page)</label>
              <textarea className="form-input" value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} rows={6} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.7, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Write a detailed explanation of your service. Press Enter for new paragraphs." />
            </div>
          </div>

          {/* SECTION: Packages */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-warning)', boxShadow: 'none' }} /> Pricing & Packages
            </h3>

            <div style={{ display: 'flex', padding: 6, background: 'var(--surface-1)', borderRadius: 16, marginBottom: 24, border: '1px solid var(--border-color)' }}>
              {(['basic', 'standard', 'premium'] as const).map((tab) => {
                const active = pkgTab === tab;
                return (
                  <button key={tab} type="button" onClick={() => setPkgTab(tab)}
                    style={{ flex: 1, padding: '12px 0', border: 'none', background: active ? 'var(--text-primary)' : 'transparent', color: active ? 'var(--bg-color)' : 'var(--text-secondary)', fontSize: 14, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize', borderRadius: 12, transition: 'all 0.2s', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>
                    {tab}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Package Name</label>
                <input type="text" className="form-input" value={form.packages[pkgTab].name} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], name: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. Basic Mixing" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Price (৳)</label>
                <input type="number" className="form-input" value={form.packages[pkgTab].price} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], price: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 2000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Original Price (৳) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- optional</span></label>
                <input type="number" className="form-input" value={form.packages[pkgTab].originalPrice || ''} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], originalPrice: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 3000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Delivery Time</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" className="form-input" value={form.packages[pkgTab].delivery.replace(/[^\d]/g, '')} onChange={e => { const isHour = form.packages[pkgTab].delivery.toLowerCase().includes('hour'); const val = e.target.value; const unit = isHour ? (val === '1' ? 'Hour' : 'Hours') : (val === '1' ? 'Day' : 'Days'); setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], delivery: `${val} ${unit}`.trim() } } })); }} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 3" min="0" />
                  <select value={form.packages[pkgTab].delivery.toLowerCase().includes('hour') ? 'Hours' : 'Days'} onChange={e => { const num = form.packages[pkgTab].delivery.replace(/[^\d]/g, '') || ''; const unit = e.target.value === 'Hours' ? (num === '1' ? 'Hour' : 'Hours') : (num === '1' ? 'Day' : 'Days'); setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], delivery: `${num} ${unit}`.trim() } } })); }} style={{ width: 110, boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                    <option value="Days">Days</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Revisions</label>
                <input type="text" className="form-input" value={form.packages[pkgTab].revisions} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], revisions: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. 1" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Short Description</label>
              <input type="text" className="form-input" value={form.packages[pkgTab].desc} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], desc: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="Short description of this tier..." />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Sample Video / Playlist URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>
              <input type="text" className="form-input" value={form.packages[pkgTab].sampleUrl || ''} onChange={e => setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], sampleUrl: e.target.value } } }))} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} placeholder="e.g. https://youtube.com/playlist?list=..." />
            </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Package Features</label>
                  <textarea
                    className="form-input"
                    value={form.packages[pkgTab].features}
                    onChange={e => {
                      let val = e.target.value;
                      val = val.replace(/^[\s​]*[•\-*]\s+/gm, '');
                      val = val.replace(/^[\s​]*[0-9]+\.\s+/gm, '');
                      setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], features: val } } }));
                    }}
                    rows={5}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', transition: 'border-color 0.2s' }}
                    placeholder="Source Files Included&#10;Commercial Use&#10;High Resolution"
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {["Source Files Included", "Commercial Use", "Priority Support", "Custom Branding", "Unlimited Revisions", "1 Day Delivery"].map(p => (
                      <button type="button" key={p} onClick={() => { if (!form.packages[pkgTab].features.includes(p)) setForm(f => ({ ...f, packages: { ...f.packages, [pkgTab]: { ...f.packages[pkgTab], features: (f.packages[pkgTab].features ? f.packages[pkgTab].features.trim() + '\n' : '') + p } } })); }}
                        style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--surface-2)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--text-primary)'; e.currentTarget.style.color = 'var(--bg-color)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >+ {p}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckIcon size={8} color="var(--text-primary)" strokeWidth={3} /></div>
                    Write each feature on a new line. Bullets/numbers are auto-removed on paste!
                  </div>
                </div>
              </div>

          {/* SECTION: Settings */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 24, padding: '32px', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)', boxShadow: 'none' }} /> Visibility & SEO
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Meta Title (SEO) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>
                <input type="text" className="form-input" value={form.metaTitle || ''} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} placeholder={form.title ? `${form.title} | Tanvir Studio` : 'Best Audio Services...'} style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Meta Description (SEO) <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>- Optional</span></label>
                <input type="text" className="form-input" value={form.metaDesc || ''} onChange={e => setForm(f => ({ ...f, metaDesc: e.target.value }))} placeholder="Short snippet for Google search results..." style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>URL Slug</label>
                <input type="text" className="form-input" value={form.slug} onChange={e => { setAutoSlug(false); setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })); }} placeholder={toSlug(form.title || 'auto-generated')} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 14, padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Display Order</label>
                <input type="number" className="form-input" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} min="1" style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Auto" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Visible on site</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show this service to visitors</div>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: form.active ? 'var(--color-success)' : 'var(--border-color)', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: form.active ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: 'var(--card-bg)', transition: 'left 0.2s', boxShadow: 'none' }} />
              </button>
            </div>
          </div>

          <div style={{ paddingBottom: 40 }} />
        </form>
      </div>
    </div>
  );
}
