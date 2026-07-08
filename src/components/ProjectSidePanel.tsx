import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { PanelHeader } from './projectpanel/PanelHeader';
import { TitleBlock } from './projectpanel/TitleBlock';
import { TimelineSection } from './projectpanel/TimelineSection';
import { FinancialSummarySection } from './projectpanel/FinancialSummarySection';
import { TeamSection } from './projectpanel/TeamSection';
import { MilestonesSection } from './projectpanel/MilestonesSection';
import { NotesSection } from './projectpanel/NotesSection';
import { FilesSection } from './projectpanel/FilesSection';
import { DiscussionSection } from './projectpanel/DiscussionSection';
import { PanelFooter } from './projectpanel/PanelFooter';

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
            <PanelHeader stage={stage} onClose={onClose} />

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
              <TitleBlock task={task} buildWaMessage={buildWaMessage} />

              <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Timeline Card (Side-by-side) ── */}
                <TimelineSection task={task} deadline={deadline} />

                {/* ── Payment Status ── */}
                {isAdmin && budget > 0 && (
                  <FinancialSummarySection
                    task={task}
                    isAdmin={isAdmin}
                    currency={currency}
                    budget={budget}
                    paid={paid}
                    due={due}
                    pct={pct}
                    paidFull={paidFull}
                    userData={userData}
                    localProgress={localProgress}
                    setLocalProgress={setLocalProgress}
                    progressSaveRef={progressSaveRef}
                    showPaymentInput={showPaymentInput}
                    setShowPaymentInput={setShowPaymentInput}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    paymentNote={paymentNote}
                    setPaymentNote={setPaymentNote}
                    isSubmittingPayment={isSubmittingPayment}
                    handleLogPayment={handleLogPayment}
                    handleDeletePayment={handleDeletePayment}
                    onGenerateInvoice={onGenerateInvoice}
                    safeDate={safeDate}
                  />
                )}

                {/* ── Team (Side-by-side) ── */}
                {((task.composerId && task.composerId !== 'undefined' && task.composerId !== 'null') || (task.needsHumming && task.hummingArtistId && task.hummingArtistId !== 'undefined' && task.hummingArtistId !== 'null')) && (
                  <TeamSection task={task} teams={teams} settings={settings} isAdmin={isAdmin} currency={currency} />
                )}

                {/* ── Milestones ── */}
                {ms.length > 0 && (
                  <MilestonesSection ms={ms} msDone={msDone} isAdmin={isAdmin} handleToggleMilestone={handleToggleMilestone} />
                )}

                {/* ── Description / Notes ── */}
                {(task.description || notes) && userData?.role !== 'client' && (
                  <NotesSection description={task.description} notes={notes} />
                )}

                {/* ── File Delivery ── */}
                {(isAdmin || (task.deliveryFiles || []).length > 0) && (
                  <FilesSection
                    task={task}
                    isAdmin={isAdmin}
                    showFileInput={showFileInput}
                    setShowFileInput={setShowFileInput}
                    newFileName={newFileName}
                    setNewFileName={setNewFileName}
                    newFileUrl={newFileUrl}
                    setNewFileUrl={setNewFileUrl}
                    addingFile={addingFile}
                    handleAddFile={handleAddFile}
                    handleDeleteFile={handleDeleteFile}
                  />
                )}

                {/* ── Discussion ── */}
                {userData?.role !== 'client' && (
                  <DiscussionSection
                    task={task}
                    userData={userData}
                    allComments={allComments}
                    lastComments={lastComments}
                    hiddenCommentCount={hiddenCommentCount}
                    onClose={onClose}
                    onOpenFull={onOpenFull}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    isSending={isSending}
                    handleAddMessage={handleAddMessage}
                    messagesEndRef={messagesEndRef}
                    safeDate={safeDate}
                  />
                )}

              </div>
            </div>

            {/* ─── Footer ─────────────────────────── */}
            <PanelFooter task={task} isAdmin={isAdmin} onClose={onClose} onOpenFull={onOpenFull} onGenerateInvoice={onGenerateInvoice} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
