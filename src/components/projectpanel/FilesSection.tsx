import React from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Card } from './Card';

interface FilesSectionProps {
  task: any;
  isAdmin: boolean;
  showFileInput: boolean;
  setShowFileInput: (val: boolean) => void;
  newFileName: string;
  setNewFileName: (val: string) => void;
  newFileUrl: string;
  setNewFileUrl: (val: string) => void;
  addingFile: boolean;
  handleAddFile: () => void;
  handleDeleteFile: (index: number) => void;
}

export function FilesSection({
  task, isAdmin,
  showFileInput, setShowFileInput,
  newFileName, setNewFileName,
  newFileUrl, setNewFileUrl,
  addingFile, handleAddFile, handleDeleteFile,
}: FilesSectionProps) {
  return (
    <Card title="Project Files" icon={<Download size={15} color="var(--color-success)" />} color="var(--color-success)">
      {(task.deliveryFiles || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: isAdmin ? 12 : 0 }}>
          {(task.deliveryFiles as any[]).map((f: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href={f.url} target="_blank" rel="noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-color)', border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'background 0.15s', minWidth: 0 }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(52,199,89,0.06)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-color)')}>
                <Download size={14} color="var(--color-success)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name || f.url}</span>
              </a>
              {isAdmin && (
                <button onClick={() => handleDeleteFile(i)} title="Remove file"
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        isAdmin && <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 600 }}>No files added yet.</div>
      )}
      {isAdmin && !showFileInput && (
        <button onClick={() => setShowFileInput(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(52,199,89,0.08)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          <Plus size={13} /> Add File Link
        </button>
      )}
      {isAdmin && showFileInput && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={newFileName} onChange={e => setNewFileName(e.target.value)} placeholder="File label (e.g. Final Mix - WAV)"
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          <input value={newFileUrl} onChange={e => {
            const url = e.target.value;
            setNewFileUrl(url);
            if (!newFileName.trim()) {
              // Auto-label from known cloud URL patterns
              if (url.includes('drive.google.com')) setNewFileName('Google Drive File');
              else if (url.includes('dropbox.com')) setNewFileName('Dropbox File');
              else if (url.includes('wetransfer.com')) setNewFileName('WeTransfer File');
              else if (url.includes('soundcloud.com')) setNewFileName('SoundCloud Link');
              else if (url.includes('youtube.com') || url.includes('youtu.be')) setNewFileName('YouTube Link');
              else {
                try { const seg = new URL(url).pathname.split('/').filter(Boolean).pop(); if (seg) setNewFileName(decodeURIComponent(seg)); } catch { /* ignore */ }
              }
            }
          }} placeholder="Paste Google Drive / Dropbox link..."
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowFileInput(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAddFile} disabled={!newFileUrl.trim() || addingFile}
              style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#34C759,#30D158)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: !newFileUrl.trim() || addingFile ? 'not-allowed' : 'pointer', opacity: !newFileUrl.trim() || addingFile ? 0.6 : 1 }}>
              {addingFile ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
