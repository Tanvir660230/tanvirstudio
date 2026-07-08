/* eslint-disable @typescript-eslint/no-unused-vars, react-refresh/only-export-components */
import React, { useState, useRef } from 'react';
import { storage } from '../../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Upload, Mic, Sliders, Music2, Headphones, Video, Film, Monitor, Scissors, Palette, FileText, Zap, Layers, Code2, BookOpen } from 'lucide-react';
import { Spinner } from '../Spinner';

export type FireToast = (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

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

export function ListSkeleton({ count = 4 }: { count?: number }) {
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

export const toSlug = (s: string) =>
  (s || '').toLowerCase().replace(/[&']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

// ─── Services shared constants ─────────────────────────────────────────────────
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

// ─── Shared UI ────────────────────────────────────────────────────────────────
export function SectionCard({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
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

export function ImageInputWithPreview({ label, value, onChange, required, circular }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; circular?: boolean }) {
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

export function AudioInputWithUpload({ label, value, onChange, required, storageKey, fireToast }: {
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
