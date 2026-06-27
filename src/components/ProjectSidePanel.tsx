import React, { useState, useEffect, useRef } from 'react';
import { calcComposerComm, calcHummingComm } from '../utils/commissionUtils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, User, CheckCircle2,
  AlertCircle, Clock, Music2, Mic, ChevronRight,
  StickyNote, MessageSquare, Send, Plus, Wallet, Users, Check, CreditCard, FileText, Download, Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const READY_STATUSES = ['delivered', 'completed'];

interface ProjectSidePanelProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: (task: any) => void;
  onGenerateInvoice?: (task: any) => void;
  userRole?: string;
  currency?: string;
  teams?: any[];
}

const STAGE_META: Record<string, { label: string; color: string }> = {
  recording:   { label: 'Recording',   color: 'var(--color-danger)' },
  arrangement: { label: 'Arrangement', color: 'var(--accent-purple)' },
  humming:     { label: 'Humming',     color: '#30B0C7' },
  composition: { label: 'Composition', color: 'var(--color-info)' },
  revision:    { label: 'Revision',    color: 'var(--color-warning)' },
  delivered:   { label: 'Delivered',   color: 'var(--color-success)' },
  completed:   { label: 'Completed',   color: '#8E8E93' },
};

const Card = ({ children, title, icon, color }: { children: React.ReactNode, title?: string, icon?: React.ReactNode, color?: string }) => (
  <div style={{ flexShrink: 0, background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', opacity: 0.5 }} />
    
    {title && (
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
        {icon && (
          <div style={{ background: `${color}1A`, width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
            {icon}
          </div>
        )}
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{title}</span>
      </div>
    )}
    <div style={{ padding: title ? '16px' : '0' }}>
      {children}
    </div>
  </div>
);

export function ProjectSidePanel({ task, isOpen, onClose, onOpenFull, onGenerateInvoice, userRole, currency = '৳', teams = [] }: ProjectSidePanelProps) {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('Partial Payment');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showFileInput, setShowFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [addingFile, setAddingFile] = useState(false);
  const [localProgress, setLocalProgress] = useState<number>(task?.progress ?? 0);
  const progressSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localToast, setLocalToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireLocalToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setLocalToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setLocalToast(null), 3000);
  };

  const scrollToBottom = () => {
    const container = messagesEndRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 300);
    }
  }, [isOpen, task?.comments?.length]);

  useEffect(() => {
    setLocalProgress(task?.progress ?? 0);
  }, [task?.id, task?.progress]);

  // Cleanup debounce timers on unmount to prevent stale Firestore writes
  useEffect(() => {
    return () => {
      if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const syncNow = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      window.clearTimeout(syncNow);
      window.clearInterval(interval);
    };
  }, [isOpen]);

  if (!task) return null;

  const isAdmin = userRole === 'admin' || userRole === 'composer';

  /* ── WhatsApp message ─────────────────────────────────── */
  const buildWaMessage = () => {
    const name    = task.client || 'there';
    const project = task.songName || task.title || 'your project';
    const pkg     = task.packageName ? ` (${task.packageName})` : '';
    const ref     = task.orderRef ? `\nRef: ${task.orderRef}` : '';

    const budgetN = Number(task.budget) || 0;
    const paidN   = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const dueN    = Math.max(0, budgetN - paidN);

    const paymentBlock = budgetN > 0
      ? `\n\n*Payment Summary*\nBudget: ${currency}${budgetN.toLocaleString()}\nPaid: ${currency}${paidN.toLocaleString()}\nDue: ${dueN > 0 ? currency + dueN.toLocaleString() : 'Fully Paid'}`
      : '';

    const sessionBlock = task.recordingDate
      ? `\n\nSession: ${new Date(task.recordingDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`
      : '';

    const STATUS_LABEL: Record<string, string> = {
      recording:   'Recording',
      arrangement: 'Arrangement',
      humming:     'Vocal Humming',
      composition: 'Composition',
      revision:    'Revision',
      delivered:   'Delivered',
      completed:   'Completed',
      pending:     'Under Review',
      new:         'Accepted',
      declined:    'Declined',
    };
    const STATUS_NOTE: Record<string, string> = {
      recording:   'We have started the recording session for your project.',
      arrangement: 'Our team is currently working on the arrangement.',
      humming:     'The vocal humming stage is now in progress.',
      composition: 'Composition work is actively underway.',
      revision:    'Your revision is in progress — changes are being applied.',
      delivered:   'Your project files have been delivered. Please review them and share any feedback.',
      completed:   'Your project is fully complete. It has been a pleasure working with you.',
      pending:     'We have received your order and are reviewing it. You will hear from us within 24 hours.',
      new:         'Your order has been accepted. We will contact you shortly with the next steps.',
      declined:    'Unfortunately we are unable to proceed with this order at this time. Please contact us to discuss alternatives.',
    };
    const statusLabel = STATUS_LABEL[task.status] || task.status;
    const statusNote  = STATUS_NOTE[task.status]  || '';

    return [
      `*Tanvir Studio — Project Update*`,
      ``,
      `Hi ${name},`,
      ``,
      `*Project:* ${project}${pkg ? `\n*Package:* ${pkg.replace(/[()]/g, '')}` : ''}`,
      `*Status:*  ${statusLabel}`,
      ``,
      statusNote,
      paymentBlock ? paymentBlock.trimStart() : '',
      sessionBlock ? sessionBlock.trimStart() : '',
      ref ? ref.trimStart() : '',
      ``,
      `_Thank you for choosing Tanvir Studio._`,
    ].filter(line => line !== '').join('\n');
  };
  const stage   = STAGE_META[task.status] || { label: task.status, color: '#8E8E93' };

  const safeDate = (val: any, opts: Intl.DateTimeFormatOptions, fallback = '') => {
    if (!val) return fallback;
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('en-US', opts);
  };

  /* ── Deadline ─────────────────────────────────── */
  const deadline = (() => {
    if (!task.deliveryDate) return { line1: 'No deadline set', line2: null, color: 'var(--text-tertiary)', urgent: false, icon: <Calendar size={18} /> };
    const d = new Date(task.deliveryDate);
    if (isNaN(d.getTime())) return { line1: 'No deadline set', line2: null, color: 'var(--text-tertiary)', urgent: false, icon: <Calendar size={18} /> };
    const diff = Math.ceil((d.getTime() - now) / 86400000);
    const fmt  = safeDate(task.deliveryDate, { month: 'short', day: 'numeric', year: 'numeric' });
    const done = task.status === 'completed' || task.status === 'delivered';
    if (done)     return { line1: fmt, line2: 'Project delivered', color: 'var(--text-secondary)', urgent: false, icon: <CheckCircle2 size={18} /> };
    if (diff < 0)  return { line1: `${Math.abs(diff)}d overdue`, line2: fmt, color: 'var(--color-danger)', urgent: true, icon: <AlertCircle size={18} /> };
    if (diff === 0) return { line1: 'Due today', line2: fmt, color: 'var(--color-warning)', urgent: true, icon: <AlertCircle size={18} /> };
    if (diff <= 3)  return { line1: `${diff}d left`, line2: fmt, color: 'var(--color-warning)', urgent: false, icon: <Clock size={18} /> };
    return { line1: fmt, line2: `${diff}d from now`, color: 'var(--text-primary)', urgent: false, icon: <Calendar size={18} /> };
  })();

  /* ── Finance ───────────────────────────────────── */
  const budget   = Number(task.budget) || 0;
  const paid     = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const due      = budget - paid;
  const pct      = budget > 0 ? Math.min(100, Math.round((paid / budget) * 100)) : 0;
  const paidFull = due <= 0 && budget > 0;

  /* ── Milestones ────────────────────────────────── */
  const ms     = task.milestones || [];
  const msDone = ms.filter((m: any) => m.completed).length;

  /* ── Notes / Description ───────────────────────── */
  const notes = task.notes || task.remarks || '';

  /* ── Recent comments ──────────────────────────── */
  const allComments = (task.comments || []).filter((c: any) => c.text?.trim().length > 0);
  const lastComments = allComments.slice(-3);
  const hiddenCommentCount = Math.max(0, allComments.length - 3);

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !task.id || isSending) return;
    setIsSending(true);
    try {
      const commentObj = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: newMessage.trim(),
        userName: userData?.name || 'User',
        userId: userData?.uid,
        createdAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'tasks', task.id), { comments: arrayUnion(commentObj) });
      setNewMessage('');
    } catch (err) {
      console.error(err);
      fireLocalToast('Failed to send message. Try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogPayment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!paymentAmount.trim() || isSubmittingPayment || !task?.id) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > due) {
      fireLocalToast(`Cannot exceed remaining due (${currency}${due.toLocaleString()}).`, 'error');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const newPayment = { date: new Date().toISOString(), amount, note: paymentNote };
      const logEntry = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'payment', oldValue: '',
        newValue: `${currency}${amount.toLocaleString('en-US')} received`,
        timestamp: new Date().toISOString()
      };
      await updateDoc(doc(db, 'tasks', task.id), {
        payments: arrayUnion(newPayment),
        activityLog: arrayUnion(logEntry)
      });
      setPaymentAmount('');
      setPaymentNote('Partial Payment');
      setShowPaymentInput(false);
      fireLocalToast(`${currency}${amount.toLocaleString()} payment logged.`);
    } catch (err) {
      console.error('Failed to log payment:', err);
      fireLocalToast('Failed to save payment. Try again.', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleAddFile = async () => {
    const url = newFileUrl.trim();
    if (!url || addingFile || !task?.id) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fireLocalToast('Invalid URL — must start with http:// or https://', 'error');
      return;
    }
    setAddingFile(true);
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        deliveryFiles: arrayUnion({ name: newFileName.trim() || url, url }),
      });
      setNewFileName('');
      setNewFileUrl('');
      setShowFileInput(false);
      fireLocalToast('File link added.');
    } catch (err) {
      console.error('Failed to add file:', err);
      fireLocalToast('Failed to save file. Try again.', 'error');
    } finally {
      setAddingFile(false);
    }
  };

  const handleDeleteFile = async (index: number) => {
    if (!task?.id) return;
    const updated = (task.deliveryFiles as any[]).filter((_: any, i: number) => i !== index);
    try {
      await updateDoc(doc(db, 'tasks', task.id), { deliveryFiles: updated });
      fireLocalToast('File removed.');
    } catch (err) {
      console.error('Failed to delete file:', err);
      fireLocalToast('Failed to remove file.', 'error');
    }
  };

  const handleDeletePayment = async (index: number) => {
    if (!task?.id) return;
    if (!window.confirm('Remove this payment entry?')) return;
    const updated = (task.payments as any[]).filter((_: any, i: number) => i !== index);
    try {
      await updateDoc(doc(db, 'tasks', task.id), { payments: updated });
      fireLocalToast('Payment entry removed.');
    } catch (err) {
      console.error('Failed to delete payment:', err);
      fireLocalToast('Failed to remove payment.', 'error');
    }
  };

  const handleToggleMilestone = async (index: number) => {
    if (!task?.id) return;
    const updated = (task.milestones as any[]).map((m: any, i: number) =>
      i === index ? { ...m, completed: !m.completed } : m
    );
    try {
      await updateDoc(doc(db, 'tasks', task.id), { milestones: updated });
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
      fireLocalToast('Failed to update milestone.', 'error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 400,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
            style={{
              position: 'fixed', top: 0, right: 0,
              width: 'min(520px, 100vw)', height: '100vh',
              background: 'var(--bg-color)',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'none',
              zIndex: 500,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* ─── Top bar ─────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 28px', background: 'var(--card-bg)', 
              borderBottom: '1px solid var(--border-color)', flexShrink: 0,
              position: 'relative', zIndex: 10,
              boxShadow: 'none'
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                fontSize: '11px', fontWeight: '800',
                color: stage.color, background: `${stage.color}15`,
                padding: '6px 12px', borderRadius: '10px',
                letterSpacing: '0.6px', textTransform: 'uppercase',
                boxShadow: 'none'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, boxShadow: 'none' }} />
                {stage.label}
              </span>

              <button
                type="button"
                aria-label="Close panel"
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-color)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'none',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ─── Scrollable body ─────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">

              {/* Local toast */}
              <AnimatePresence>
                {localToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{
                      margin: '12px 20px 0', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                      background: localToast.type === 'error' ? 'rgba(255,59,48,0.12)' : localToast.type === 'warning' ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)',
                      color: localToast.type === 'error' ? 'var(--color-danger)' : localToast.type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)',
                      border: `1px solid ${localToast.type === 'error' ? 'rgba(255,59,48,0.25)' : localToast.type === 'warning' ? 'rgba(255,149,0,0.25)' : 'rgba(52,199,89,0.25)'}`,
                    }}
                  >
                    {localToast.msg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Title block ─────────────────────── */}
              <div style={{ padding: '28px 28px 0', flexShrink: 0, marginBottom: 24 }}>
                <h2 
                  onClick={() => navigator.clipboard.writeText(task.title || 'Untitled Project')}
                  title="Click to copy project name"
                  style={{
                    fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)',
                    margin: '0 0 14px', letterSpacing: '-0.8px', lineHeight: 1.2,
                    cursor: 'pointer', transition: 'color 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-info)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                >
                  {task.title || 'Untitled Project'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--card-bg)', padding: '14px', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '800' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={13} color="var(--text-secondary)" /> 
                    </div>
                    <span>{task.client || 'No client assigned'}</span>
                    {task.clientEmail && (
                      <>
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        <a href={`mailto:${task.clientEmail}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s', fontWeight: '700' }} onMouseOver={e=>e.currentTarget.style.color='var(--color-info)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}>{task.clientEmail}</a>
                      </>
                    )}
                  </div>
                  {task.clientPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 34 }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>{task.clientPhone}</span>
                      <a href={`https://wa.me/${(() => {
                        const raw = task.clientPhone.trim();
                        const d = raw.replace(/\D/g, '');
                        // Already has country code (10+ digits not starting with 0)
                        if (d.length >= 10 && !d.startsWith('0')) return d;
                        // BD local format: 01XXXXXXXX → 8801XXXXXXXX
                        if (d.startsWith('0') && d.length === 11) return '880' + d.slice(1);
                        // Already starts with 880
                        if (d.startsWith('880')) return d;
                        return d;
                      })()}?text=${encodeURIComponent(buildWaMessage())}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, background: '#25D36615', color: '#25D366', padding: '4px 10px', borderRadius: 12, textDecoration: 'none', fontWeight: 800, textTransform: 'uppercase', boxShadow: 'none' }}>
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Timeline Card (Side-by-side) ── */}
                <div style={{ flexShrink: 0, display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: deadline.urgent ? 'linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,59,48,0.02))' : 'var(--card-bg)', borderRadius: 16, border: `1px solid ${deadline.urgent ? 'rgba(255,59,48,0.2)' : 'var(--border-color)'}`, boxShadow: deadline.urgent ? '0 8px 24px rgba(255,59,48,0.1)' : '0 8px 30px rgba(0,0,0,0.04)', minWidth: 0 }}>
                    <div style={{ background: deadline.urgent ? 'linear-gradient(135deg, #FF3B30, #FF6B22)' : 'var(--bg-color)', border: deadline.urgent ? 'none' : '1px solid var(--border-color)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deadline.urgent ? 'white' : 'var(--text-secondary)', flexShrink: 0, boxShadow: deadline.urgent ? '0 4px 12px rgba(255,59,48,0.3)' : 'none' }}>
                      {deadline.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: deadline.color, marginBottom: 2, letterSpacing: '0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deadline.line1}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deadline.line2 || 'Not scheduled'}</div>
                    </div>
                  </div>
                  {task.recordingDate && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'none', minWidth: 0 }}>
                      <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        <Clock size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rec Session</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(() => {
                            try {
                              const d = new Date(task.recordingDate);
                              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              const hasTime = typeof task.recordingDate === 'string' && task.recordingDate.includes('T');
                              return hasTime ? `${dateStr} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : dateStr;
                            } catch { return 'Invalid date'; }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Payment Status ── */}
                {isAdmin && budget > 0 && (
                  <Card title="Financial Overview" icon={<Wallet size={15} color="var(--color-success)" />} color="var(--color-success)">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Budget', value: budget, color: 'var(--text-primary)', bg: 'var(--bg-color)', border: 'var(--border-color)' },
                        { label: 'Received', value: paid, color: 'var(--color-success)', bg: 'linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.02))', border: 'rgba(52,199,89,0.2)' },
                        { label: 'Due', value: Math.max(0, due), color: due > 0 ? 'var(--color-danger)' : 'var(--color-success)', bg: due > 0 ? 'linear-gradient(135deg, rgba(255,59,48,0.1), rgba(255,59,48,0.02))' : 'linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.02))', border: due > 0 ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)' },
                      ].map((item, i) => (
                        <div key={i} style={{ background: item.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${item.border}` }}>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: item.color, letterSpacing: '-0.3px' }}>{currency}{item.value.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 800, letterSpacing: '0.2px' }}>Collection Progress</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: paidFull ? 'var(--color-success)' : 'var(--text-primary)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-color)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', boxShadow: 'none' }}>
                        {/* layoutId prevents re-animation from 0 when Firestore updates while panel is open */}
                        <motion.div layoutId={`progress-${task.id}`} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%', borderRadius: 8, background: paidFull ? 'linear-gradient(90deg, #34C759, #30D158)' : 'linear-gradient(90deg, #007AFF, #34AADC)', boxShadow: 'none' }} />
                      </div>
                    </div>

                    {/* Work progress slider — admin/composer only */}
                    {(userData?.role === 'admin' || userData?.role === 'composer') && task.status !== 'completed' && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 800, letterSpacing: '0.2px' }}>Work Progress</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: localProgress >= 100 ? 'var(--color-success)' : 'var(--text-primary)' }}>{localProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={localProgress}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setLocalProgress(val);
                            if (progressSaveRef.current) clearTimeout(progressSaveRef.current);
                            progressSaveRef.current = setTimeout(() => {
                              updateDoc(doc(db, 'tasks', task.id), { progress: val }).catch(() => {});
                            }, 600);
                          }}
                          style={{ width: '100%', accentColor: 'var(--color-info)', cursor: 'pointer' }}
                        />
                      </div>
                    )}

                    {isAdmin && (
                      <div style={{ marginTop: 10 }}>
                        {!showPaymentInput ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            {due > 0 && (
                              <button
                                onClick={() => {
                                  setPaymentAmount(due.toString());
                                  setPaymentNote(paid === 0 ? (due === budget ? 'Full Payment' : 'Advance Payment') : 'Final Payment');
                                  setShowPaymentInput(true);
                                }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                              >
                                <Plus size={14} /> Log Payment
                              </button>
                            )}
                            {onGenerateInvoice && (
                              <button
                                onClick={() => onGenerateInvoice(task)}
                                title="Generate Invoice"
                                style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--bg-color)', color: 'var(--text-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                              >
                                <FileText size={16} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleLogPayment} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 14, boxShadow: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Log New Payment</div>
                              {due > 0 && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button type="button" onClick={() => { setPaymentAmount(Math.round(due / 2).toString()); setPaymentNote('Advance Payment'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>50%</button>
                                  <button type="button" onClick={() => { setPaymentAmount(due.toString()); setPaymentNote(paid === 0 ? 'Full Payment' : 'Final Payment'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)', border: '1px solid rgba(52,199,89,0.2)', cursor: 'pointer', fontWeight: 600 }}>100%</button>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 600 }}>{currency}</span>
                                <input 
                                  type="number" 
                                  value={paymentAmount}
                                  onChange={(e) => {
                                    setPaymentAmount(e.target.value);
                                    if (e.target.value && Number(e.target.value) < due) setPaymentNote('Partial Payment');
                                    if (e.target.value && Number(e.target.value) === due) setPaymentNote(paid === 0 ? 'Full Payment' : 'Final Payment');
                                  }}
                                  placeholder="Amount"
                                  disabled={isSubmittingPayment}
                                  style={{ width: '100%', padding: '9px 10px 9px 28px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, transition: 'all 0.2s', outline: 'none' }}
                                  onFocus={(e) => e.target.style.borderColor = 'var(--color-success)'}
                                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                />
                              </div>
                              <input 
                                type="text"
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                placeholder="Note (e.g. Partial)"
                                disabled={isSubmittingPayment}
                                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, transition: 'all 0.2s', outline: 'none' }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-success)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                              />
                            </div>
                            
                            {/* Dynamic Balance Preview */}
                            {paymentAmount && !isNaN(Number(paymentAmount)) && (
                              <div style={{ fontSize: 11, color: Number(paymentAmount) > due ? 'var(--color-danger)' : 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {Number(paymentAmount) > due 
                                  ? <><AlertCircle size={12} /> Overpaying by {currency}{(Number(paymentAmount) - due).toLocaleString()}</>
                                  : Number(paymentAmount) === due 
                                    ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Balance will be fully cleared</span>
                                    : `Remaining balance: ${currency}${(due - Number(paymentAmount)).toLocaleString()}`}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: paymentAmount ? 0 : 8 }}>
                              <button 
                                type="button" 
                                onClick={() => setShowPaymentInput(false)}
                                disabled={isSubmittingPayment}
                                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-color)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface-1)'}
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                disabled={isSubmittingPayment || !paymentAmount}
                                style={{ flex: 1.5, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #34C759, #30D158)', color: 'var(--card-bg)', fontSize: 12, fontWeight: 700, cursor: isSubmittingPayment || !paymentAmount ? 'not-allowed' : 'pointer', opacity: isSubmittingPayment || !paymentAmount ? 0.6 : 1, boxShadow: 'none', transition: 'transform 0.1s' }}
                                onMouseDown={(e) => { if (!isSubmittingPayment && paymentAmount) e.currentTarget.style.transform = 'scale(0.97)'; }}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                              >
                                {isSubmittingPayment ? 'Saving...' : 'Save Payment'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Payment history */}
                    {(task.payments || []).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Payment History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(task.payments || []).map((p: any, i: number) => (
                            <div key={p.date ? `${p.date}-${p.amount}-${i}` : i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: 'none', flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{Number(p.amount).toLocaleString()}</div>
                                  {p.note && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 600 }}>{p.note}</div>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700 }}>{safeDate(p.date, { month: 'short', day: 'numeric' })}</span>
                                {isAdmin && (
                                  <button onClick={() => handleDeletePayment(i)} title="Remove entry"
                                    style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* ── Team (Side-by-side) ── */}
                {((task.composerId && task.composerId !== 'undefined' && task.composerId !== 'null') || (task.needsHumming && task.hummingArtistId && task.hummingArtistId !== 'undefined' && task.hummingArtistId !== 'null')) && (
                  <Card title="Assigned Team" icon={<Users size={15} color="var(--accent-purple)" />} color="var(--accent-purple)">
                    <div style={{ display: 'flex', gap: 12 }}>
                      {(task.composerId && task.composerId !== 'undefined' && task.composerId !== 'null') && (() => {
                        const pct = Number(task.composerCommissionPct) || settings.defaultComposerComm;
                        const earned = READY_STATUSES.includes(task.status) ? calcComposerComm(task, settings.defaultComposerComm) : 0;
                        const paidWorker = task.composerPaid || 0;
                        const dueWorker = Math.max(0, earned - paidWorker);
                        const composerName = teams.find((u: any) => u.uid === task.composerId)?.name || task.composerName || 'Lead Composer';
                        const feeLabel = task.composerCommissionType === 'flat' ? `${currency}${Number(task.composerCommissionAmount || 0).toLocaleString()} flat fee` : `${pct}% commission`;
                        return (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: 14, background: 'var(--bg-color)', border: '1px solid var(--border-color)', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,122,255,0.15), rgba(0,122,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music2 size={16} color="var(--color-info)" /></div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Lead Composer</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{composerName}</div>
                                {isAdmin && <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 2 }}>{feeLabel}</div>}
                              </div>
                            </div>
                            {isAdmin && (
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Earned</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Paid</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)' }}>{currency}{paidWorker.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Due</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: dueWorker > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{Math.max(0, dueWorker).toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(task.needsHumming && task.hummingArtistId && task.hummingArtistId !== 'undefined' && task.hummingArtistId !== 'null') && (() => {
                        const pct = Number(task.hummingArtistCommissionPct) || settings.defaultHummingComm;
                        const earned = READY_STATUSES.includes(task.status) ? calcHummingComm(task, settings.defaultHummingComm) : 0;
                        const paidWorker = task.hummingArtistPaid || 0;
                        const dueWorker = Math.max(0, earned - paidWorker);
                        const hummingName = teams.find((u: any) => u.uid === task.hummingArtistId)?.name || task.hummingArtistName || 'Vocal Artist';
                        const feeLabel = task.hummingArtistCommissionType === 'flat' ? `${currency}${Number(task.hummingArtistCommissionAmount || 0).toLocaleString()} flat fee` : `${pct}% commission`;
                        return (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: 14, background: 'var(--bg-color)', border: '1px solid var(--border-color)', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(255,149,0,0.15), rgba(255,149,0,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Mic size={16} color="var(--color-warning)" /></div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Vocal Artist</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hummingName}</div>
                                {isAdmin && <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 2 }}>{feeLabel}</div>}
                              </div>
                            </div>
                            {isAdmin && (
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Earned</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{currency}{earned.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Paid</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)' }}>{currency}{paidWorker.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Due</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: dueWorker > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{currency}{Math.max(0, dueWorker).toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                )}

                {/* ── Milestones ── */}
                {ms.length > 0 && (
                  <Card title={`Milestones (${msDone}/${ms.length})`} icon={<CheckCircle2 size={15} color="var(--color-info)" />} color="var(--color-info)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ms.map((m: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => isAdmin && handleToggleMilestone(i)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: m.completed ? 'linear-gradient(135deg, rgba(52,199,89,0.08), rgba(52,199,89,0.02))' : 'var(--bg-color)', border: `1px solid ${m.completed ? 'rgba(52,199,89,0.25)' : 'var(--border-color)'}`, transition: 'all 0.2s', cursor: isAdmin ? 'pointer' : 'default', width: '100%', textAlign: 'left' }}
                        >
                          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: m.completed ? 'linear-gradient(135deg, #34C759, #28A745)' : 'transparent', border: `2px solid ${m.completed ? 'transparent' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: m.completed ? '0 2px 8px rgba(52,199,89,0.3)' : 'none' }}>
                            {m.completed && <Check size={12} color="white" strokeWidth={4} />}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: m.completed ? 600 : 800, color: m.completed ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: m.completed ? 'line-through' : 'none', flex: 1, letterSpacing: '-0.1px' }}>{m.text || m.title || m.name}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── Description / Notes ── */}
                {(task.description || notes) && userData?.role !== 'client' && (
                  <Card title="Notes & Instructions" icon={<StickyNote size={15} color="var(--color-warning)" />} color="var(--color-warning)">
                    {task.description && (
                      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500, marginBottom: notes ? 10 : 0 }}>
                        {task.description}
                      </div>
                    )}
                    {notes && (
                      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                        {notes}
                      </div>
                    )}
                  </Card>
                )}

                {/* ── File Delivery ── */}
                {(isAdmin || (task.deliveryFiles || []).length > 0) && (
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
                            style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#34C759,#30D158)', color: 'var(--card-bg)', fontSize: 12, fontWeight: 700, cursor: !newFileUrl.trim() || addingFile ? 'not-allowed' : 'pointer', opacity: !newFileUrl.trim() || addingFile ? 0.6 : 1 }}>
                            {addingFile ? 'Saving...' : 'Save File'}
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* ── Discussion ── */}
                {userData?.role !== 'client' && (
                <div style={{ flexShrink: 0, background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', opacity: 0.5 }} />
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to bottom, var(--bg-color), transparent)' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(175,82,222,0.15), rgba(175,82,222,0.05))', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
                      <MessageSquare size={14} color="var(--accent-purple)" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Team Discussion</span>
                    {allComments.length > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 999 }}>
                        {allComments.length} msg{allComments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                      {hiddenCommentCount > 0 && (
                        <button onClick={() => { onClose(); onOpenFull(task); }} style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontSize: 12, color: 'var(--color-info)', fontWeight: 700, textAlign: 'left' }}>
                          ↑ {hiddenCommentCount} older message{hiddenCommentCount !== 1 ? 's' : ''} — open full project to view
                        </button>
                      )}
                      {(() => {
                        const visibleComments = lastComments;
                        if (visibleComments.length === 0) return (
                          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>No messages yet.</div>
                        );
                        return visibleComments.map((c: any) => {
                          const isMine = c.userId === userData?.uid;
                          return (
                            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                              <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: 16, borderBottomRightRadius: isMine ? 4 : 16, borderBottomLeftRadius: !isMine ? 4 : 16, background: isMine ? 'linear-gradient(135deg, #007AFF, #0062CC)' : 'var(--bg-color)', border: isMine ? 'none' : '1px solid var(--border-color)', boxShadow: isMine ? '0 4px 12px rgba(0,122,255,0.2)' : '0 2px 8px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)' }}>{c.userName}</span>
                                </div>
                                <p style={{ fontSize: 13, color: isMine ? '#FFFFFF' : 'var(--text-secondary)', margin: 0, lineHeight: 1.4, fontWeight: 500, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                  {(() => {
                                    if (!c.text) return null;
                                    const tokenRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@\w+)/g;
                                    return c.text.split(tokenRegex).map((part: string, i: number) => {
                                      if (/^https?:\/\//.test(part) || /^www\./.test(part)) {
                                        const href = part.startsWith('http') ? part : `https://${part}`;
                                        return <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--color-info)', textDecoration: 'underline', fontWeight: 700 }}>{part}</a>;
                                      }
                                      if (/^@\w+/.test(part)) {
                                        return <span key={i} style={{ color: isMine ? '#FFD60A' : 'var(--color-warning)', fontWeight: 800 }}>{part}</span>;
                                      }
                                      return <span key={i}>{part}</span>;
                                    });
                                  })()}
                                </p>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', marginTop: 4, padding: '0 4px' }}>
                                {safeDate(c.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        });
                      })()}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <form onSubmit={handleAddMessage} style={{ display: 'flex', gap: 10 }}>
                      <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={isSending} style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-color)', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', boxShadow: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.currentTarget.style.borderColor='#007AFF50'} onBlur={e => e.currentTarget.style.borderColor='var(--border-color)'} />
                      <button type="submit" disabled={!newMessage.trim() || isSending} style={{ background: 'linear-gradient(135deg, #007AFF, #00C6FF)', color: 'white', border: 'none', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (newMessage.trim() && !isSending) ? 'pointer' : 'default', opacity: (newMessage.trim() && !isSending) ? 1 : 0.5, flexShrink: 0, padding: 0, boxShadow: (newMessage.trim() && !isSending) ? '0 4px 12px rgba(0,122,255,0.3)' : 'none', transition: 'all 0.2s' }} onMouseOver={e => (newMessage.trim() && !isSending) && (e.currentTarget.style.transform='scale(1.05)')} onMouseOut={e => (e.currentTarget.style.transform='scale(1)')}>
                        <Send size={16} strokeWidth={2.5} />
                      </button>
                    </form>
                  </div>
                </div>
                )}

              </div>
            </div>

            {/* ─── Footer ─────────────────────────── */}
            <div style={{
              padding: '20px 28px', borderTop: '1px solid var(--border-color)',
              background: 'var(--card-bg)', flexShrink: 0, display: 'flex', gap: 12,
              position: 'relative', zIndex: 10,
              boxShadow: 'none'
            }}>

              {onGenerateInvoice && isAdmin && (
                <button
                  onClick={() => { onClose(); onGenerateInvoice(task); }}
                  style={{
                    padding: '14px 18px', borderRadius: '14px',
                    background: 'rgba(175,82,222,0.1)', color: 'var(--accent-purple)',
                    border: '1px solid rgba(175,82,222,0.25)', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '800',
                    display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background='rgba(175,82,222,0.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.background='rgba(175,82,222,0.1)'; e.currentTarget.style.transform='translateY(0)'; }}
                >
                  <CreditCard size={16} /> Invoice
                </button>
              )}
              <button
                onClick={() => { onClose(); onOpenFull(task); }}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: '14px',
                  background: 'linear-gradient(135deg, var(--text-primary), #444)', color: 'var(--card-bg)',
                  border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '800', letterSpacing: '-0.2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseOver={e => {e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 24px rgba(0,0,0,0.2)'}}
                onMouseOut={e => {e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)'}}
                onMouseDown={e => {e.currentTarget.style.transform='scale(0.98)'}}
                onMouseUp={e => {e.currentTarget.style.transform='translateY(-2px)'}}
              >
                Open Full Project Intel <ChevronRight size={16} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
