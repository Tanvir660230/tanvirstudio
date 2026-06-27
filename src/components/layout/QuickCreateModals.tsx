import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, User, Plus, X, Banknote } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import type { Task, Client, Transaction } from '../../types';

interface QuickCreateModalsProps {
  showNewProject: boolean;
  showInvoice: boolean;
  showAddClient: boolean;
  onCloseNewProject: () => void;
  onCloseInvoice: () => void;
  onCloseAddClient: () => void;
}

const STAGES = [
  { v: 'recording',   l: 'Recording',   emoji: '🎙️' },
  { v: 'humming',     l: 'Humming',     emoji: '🎵' },
  { v: 'composition', l: 'Composition', emoji: '🎼' },
  { v: 'revision',    l: 'Revision',    emoji: '✏️' },
  { v: 'delivered',   l: 'Delivered',   emoji: '📦' },
] as const;

const DEFAULT_PROJECT_FORM = { client: '', songName: '', stage: 'recording', budget: '', deliveryDate: '' };
const DEFAULT_INVOICE_FORM = { client: '', description: '', amount: '', date: new Date().toISOString().slice(0, 10) };
const DEFAULT_CLIENT_FORM  = { name: '', email: '', phone: '', company: '', status: 'Active' };

export function QuickCreateModals({
  showNewProject, showInvoice, showAddClient,
  onCloseNewProject, onCloseInvoice, onCloseAddClient,
}: QuickCreateModalsProps) {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { settings } = useSettings();
  const { clients, addTask, addTx, addClient } = useData();

  const theme = userData?.theme || 'light';

  // New project
  const [qpForm, setQpForm] = useState(DEFAULT_PROJECT_FORM);
  const [qpSaving, setQpSaving] = useState(false);
  const [qpClientOpen, setQpClientOpen] = useState(false);

  // Invoice
  const [qiForm, setQiForm] = useState(DEFAULT_INVOICE_FORM);
  const [qiSaving, setQiSaving] = useState(false);

  // Add client
  const [qcForm, setQcForm] = useState(DEFAULT_CLIENT_FORM);
  const [qcSaving, setQcSaving] = useState(false);

  const closeProject = () => { onCloseNewProject(); setQpForm(DEFAULT_PROJECT_FORM); setQpClientOpen(false); };
  const closeInvoice = () => { onCloseInvoice(); setQiForm(DEFAULT_INVOICE_FORM); };
  const closeClient  = () => { onCloseAddClient(); setQcForm(DEFAULT_CLIENT_FORM); };

  const inputStyle = (focused?: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box',
    border: `1.5px solid ${focused ? 'var(--accent-gold)' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    boxShadow: focused ? '0 0 0 3px rgba(196,154,82,0.12)' : 'none',
    background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  const focusStyle = { borderColor: 'var(--accent-gold)', boxShadow: '0 0 0 3px rgba(196,154,82,0.12)' };
  const blurStyle  = { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', boxShadow: 'none' };

  return (
    <>
      {/* ── 1. NEW PROJECT ── */}
      <Modal isOpen={showNewProject} onClose={closeProject} title="" size="sm" noPadding>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '22px 24px 18px', background: theme === 'dark' ? 'linear-gradient(160deg, rgba(196,154,82,0.1) 0%, rgba(196,154,82,0.03) 100%)' : 'linear-gradient(160deg, rgba(196,154,82,0.07) 0%, rgba(196,154,82,0.01) 100%)', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(196,154,82,0.35)' }}>
                <Music2 size={20} color="white" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', lineHeight: 1.2 }}>New Project</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>Add to production pipeline</div>
              </div>
            </div>
            <button onClick={closeProject} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }}>
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }} className="custom-scrollbar">
            {/* Client */}
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                Client <span style={{ color: 'var(--accent-gold)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                <input
                  autoFocus
                  placeholder="Search client or type name"
                  value={qpForm.client}
                  onChange={e => { setQpForm(p => ({ ...p, client: e.target.value })); setQpClientOpen(true); }}
                  onFocus={() => setQpClientOpen(true)}
                  onBlur={() => setTimeout(() => setQpClientOpen(false), 150)}
                  style={{ ...inputStyle(), paddingLeft: 36 }}
                  onFocusCapture={e => Object.assign(e.currentTarget.style, focusStyle)}
                  onBlurCapture={e => Object.assign(e.currentTarget.style, blurStyle)}
                />
              </div>
              {qpClientOpen && qpForm.client && (() => {
                const filtered = clients.filter(c => c.name?.toLowerCase().includes(qpForm.client.toLowerCase())).slice(0, 5);
                if (!filtered.length) return null;
                return (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, marginTop: 5, background: theme === 'dark' ? 'rgba(18,18,22,0.98)' : 'rgba(255,255,255,0.99)', backdropFilter: 'blur(20px)', borderRadius: 12, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`, boxShadow: theme === 'dark' ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.13)', overflow: 'hidden' }}>
                    {filtered.map((c, i) => (
                      <div key={c.id} onMouseDown={() => { setQpForm(p => ({ ...p, client: c.name })); setQpClientOpen(false); }} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none', transition: 'background 0.1s' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{c.name}</div>
                          {c.company && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{c.company}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Project name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                Project Name <span style={{ color: 'var(--accent-gold)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Music2 size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                <input
                  placeholder="e.g. Bismillah Nasheed"
                  value={qpForm.songName}
                  onChange={e => setQpForm(p => ({ ...p, songName: e.target.value }))}
                  style={{ ...inputStyle(), paddingLeft: 36 }}
                  onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                  onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
                />
              </div>
            </div>

            {/* Stage */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 9 }}>Starting Stage</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {STAGES.map(({ v, l, emoji }) => {
                  const active = qpForm.stage === v;
                  return (
                    <button key={v} type="button" onClick={() => setQpForm(p => ({ ...p, stage: v }))} style={{ padding: '10px 4px', borderRadius: 10, border: `1.5px solid ${active ? 'var(--accent-gold)' : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, background: active ? 'rgba(196,154,82,0.1)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 18 }}>{emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)', lineHeight: 1.2, textAlign: 'center' }}>{l}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget + deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Budget</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', pointerEvents: 'none', opacity: 0.7 }}>{settings.currency}</span>
                  <input type="number" min="0" placeholder="0" value={qpForm.budget} onChange={e => setQpForm(p => ({ ...p, budget: e.target.value }))} style={{ ...inputStyle(), paddingLeft: 32 }} onFocus={e => Object.assign(e.currentTarget.style, focusStyle)} onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Deadline</label>
                <input type="date" value={qpForm.deliveryDate} onChange={e => setQpForm(p => ({ ...p, deliveryDate: e.target.value }))} style={{ ...inputStyle(), fontSize: 13 }} onFocus={e => Object.assign(e.currentTarget.style, focusStyle)} onBlur={e => Object.assign(e.currentTarget.style, blurStyle)} />
              </div>
            </div>

            {(qpForm.client || qpForm.songName) && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: theme === 'dark' ? 'rgba(196,154,82,0.06)' : 'rgba(196,154,82,0.05)', border: '1px dashed rgba(196,154,82,0.3)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>ID Preview</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-gold)' }}>
                  TSN-{qpForm.client || '…'} — {qpForm.songName || '…'}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', gap: 10, background: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.015)' }}>
            <button onClick={closeProject} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button
              disabled={qpSaving || !qpForm.client.trim() || !qpForm.songName.trim()}
              onClick={async () => {
                if (!qpForm.client.trim() || !qpForm.songName.trim()) return;
                setQpSaving(true);
                try {
                  await addTask({
                    title: `TSN-${qpForm.client.trim()} - ${qpForm.songName.trim()}`,
                    client: qpForm.client.trim(),
                    songName: qpForm.songName.trim(),
                    status: qpForm.stage as Task['status'],
                    budget: Number(qpForm.budget) || 0,
                    deliveryDate: qpForm.deliveryDate || '',
                    progress: 0,
                    payments: [],
                  } as Omit<Task, 'id'>);
                  closeProject();
                  navigate('/work');
                } catch { /* silent */ } finally { setQpSaving(false); }
              }}
              style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: qpSaving || !qpForm.client.trim() || !qpForm.songName.trim() ? (theme === 'dark' ? 'rgba(196,154,82,0.3)' : 'rgba(196,154,82,0.4)') : 'linear-gradient(135deg, var(--accent-gold), #9a6e00)', color: 'white', fontSize: 13, fontWeight: 700, cursor: qpSaving || !qpForm.client.trim() || !qpForm.songName.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: qpSaving || !qpForm.client.trim() || !qpForm.songName.trim() ? 'none' : '0 4px 16px rgba(196,154,82,0.35)' }}
            >
              {qpSaving ? <><Spinner size={14} color="white" /> Creating…</> : <><Plus size={15} strokeWidth={2.5} /> Create Project</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 2. RECORD INCOME ── */}
      <Modal isOpen={showInvoice} onClose={closeInvoice} title="Record Income" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Banknote size={16} color="var(--color-success)" strokeWidth={1.8} />
            <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>Quick income entry — goes to Finance ledger</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Client</label>
            <input className="form-input" placeholder="Client name" value={qiForm.client} onChange={e => setQiForm(p => ({ ...p, client: e.target.value }))} list="qi-client-list" autoFocus />
            <datalist id="qi-client-list">
              {clients.slice(0, 10).map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="e.g. Mixing & Mastering — June" value={qiForm.description} onChange={e => setQiForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Amount ({settings.currency}) *</label>
              <input className="form-input" type="number" placeholder="0" value={qiForm.amount} onChange={e => setQiForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={qiForm.date} onChange={e => setQiForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeInvoice}>Cancel</button>
            <button
              className="btn btn-primary" style={{ flex: 1, background: 'var(--gradient-green)' }}
              disabled={qiSaving || !qiForm.description.trim() || !qiForm.amount}
              onClick={async () => {
                if (!qiForm.description.trim() || !qiForm.amount) return;
                setQiSaving(true);
                try {
                  await addTx({
                    title: qiForm.description.trim(),
                    type: 'in',
                    amount: Number(qiForm.amount),
                    category: 'service',
                    description: qiForm.client ? `Client: ${qiForm.client}` : '',
                    status: 'Completed',
                    date: qiForm.date,
                  } as Omit<Transaction, 'id'>);
                  closeInvoice();
                  navigate('/finance');
                } catch { /* silent */ } finally { setQiSaving(false); }
              }}
            >
              {qiSaving ? 'Saving...' : 'Record Income'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 3. ADD CLIENT ── */}
      <Modal isOpen={showAddClient} onClose={closeClient} title="Add Client" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="e.g. Ahmed Rahman" value={qcForm.name} onChange={e => setQcForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="ahmed@email.com" value={qcForm.email} onChange={e => setQcForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" placeholder="+880..." value={qcForm.phone} onChange={e => setQcForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Company / Label</label>
              <input className="form-input" placeholder="Optional" value={qcForm.company} onChange={e => setQcForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={qcForm.status} onChange={e => setQcForm(p => ({ ...p, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="Prospective">Prospective</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeClient}>Cancel</button>
            <button
              className="btn btn-primary" style={{ flex: 1, background: 'var(--gradient-blue)' }}
              disabled={qcSaving || !qcForm.name.trim()}
              onClick={async () => {
                if (!qcForm.name.trim()) return;
                setQcSaving(true);
                try {
                  await addClient({
                    name: qcForm.name.trim(),
                    email: qcForm.email.trim(),
                    phone: qcForm.phone.trim(),
                    company: qcForm.company.trim(),
                    status: qcForm.status as Client['status'],
                  } as Omit<Client, 'id'>);
                  closeClient();
                  navigate('/clients');
                } catch { /* silent */ } finally { setQcSaving(false); }
              }}
            >
              {qcSaving ? 'Saving...' : 'Add Client'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
