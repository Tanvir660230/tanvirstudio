 
import React, { useState, useRef } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { storage } from '../../../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Spinner } from '../../Spinner';
import type { FireToast } from '../shared';

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
