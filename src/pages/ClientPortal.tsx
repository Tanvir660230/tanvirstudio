import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { Task } from '../types';
import { PackageOpen, Clock, CheckCircle, ExternalLink, Calendar, Copy, CreditCard, X, MessageSquare, Send, BellRing } from 'lucide-react';
import { requestAndSaveFCMToken } from '../lib/firebase';
import { SEO } from '../components/SEO';
import { Toast } from '../components/Toast';

const font = "var(--font-sans)";

export function ClientPortal() {
  const { userData } = useAuth();
  const { tasks, addTx, updateTask } = useData();

  const [paymentTask, setPaymentTask] = useState<Task | null>(null);
  const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTimestamp, setFeedbackTimestamp] = useState('');
  const [trxId, setTrxId] = useState('');
  const [amount, setAmount] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success'|'error'|'warning'>('success');
  const [showToast, setShowToast] = useState(false);
  const fireToast = (msg: string, type: 'success'|'error'|'warning' = 'error') => { setToastMsg(msg); setToastType(type); setShowToast(true); };
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>(
    typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'success' : 'idle'
  );

  const enablePush = async () => {
    if (!userData?.uid) return;
    setPushStatus('loading');
    const token = await requestAndSaveFCMToken(userData.uid);
    if (token) {
      setPushStatus('success');
    } else {
      setPushStatus('denied');
      alert('Notification permission denied or unavailable.');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentTask || !trxId || !amount) return;
    setPaymentStatus('loading');
    try {
      await addTx({
        title: `Advance for ${paymentTask.title}`,
        date: new Date().toISOString(),
        type: 'in',
        category: 'Services',
        amount: Number(amount),
        method: 'bKash',
        status: 'pending',
        reference: trxId,
        taskId: paymentTask.id,
        notes: `Submitted by client ${userData?.name}`
      });
      setPaymentStatus('success');
      setTimeout(() => {
        setPaymentStatus('idle');
        setPaymentTask(null);
        setTrxId('');
        setAmount('');
      }, 2000);
    } catch (e) {
      console.error(e);
      setPaymentStatus('idle');
      fireToast('Payment submission failed. Please try again.');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackTask || !feedbackText) return;
    try {
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        text: feedbackText,
        mediaTimestamp: feedbackTimestamp || undefined,
        authorId: userData?.uid,
        authorName: userData?.name || 'Client',
        createdAt: new Date().toISOString()
      };
      
      const updatedComments = [...(feedbackTask.comments || []), newComment];
      await updateTask(feedbackTask.id, { comments: updatedComments });
      
      setFeedbackTask(null);
      setFeedbackText('');
      setFeedbackTimestamp('');
    } catch (e) {
      console.error(e);
      fireToast('Failed to submit feedback. Please try again.');
    }
  };

  const myTasks = useMemo(() => {
    if (!userData) return [];
    return tasks.filter((t: Task) => 
      t.clientEmail === userData.email || t.clientUid === userData.uid
    ).sort((a: Task, b: Task) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  }, [tasks, userData]);

  const activeCount = myTasks.filter(t => t.status !== 'completed' && t.status !== 'delivered' && t.status !== 'cancelled').length;
  const completedCount = myTasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', fontFamily: font }}>
      <SEO title="Client Portal | Tanvir Studio" />
      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome back, {userData?.name || (userData as any)?.displayName || 'Client'}!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Here you can track the progress of your active projects and access delivered files.</p>
      </motion.div>

      {/* Referral Program Card */}
      {(userData as any)?.referralCode && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'linear-gradient(135deg, rgba(196,154,82,0.15), rgba(212,172,104,0.05))', border: '1px solid var(--accent-gold)', borderRadius: 16, padding: '24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}
        >
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-gold)', marginBottom: 6 }}>Refer a Friend & Earn Rewards</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Share your referral code. When they book a service, you both get a discount on your next project!</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-1)', padding: '8px 16px', borderRadius: 12, border: '1px dashed var(--accent-gold)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)' }}>CODE:</span>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '2px', color: 'var(--text-primary)' }}>{(userData as any).referralCode}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText((userData as any).referralCode);
                alert('Referral code copied to clipboard!');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Copy size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Push Notification Card */}
      {pushStatus !== 'success' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '20px 24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(91,159,255,0.1)', color: '#5b9fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellRing size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Enable Push Notifications</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Get instant alerts when your project is completed or updated.</p>
            </div>
          </div>
          <button 
            onClick={enablePush}
            disabled={pushStatus === 'loading'}
            style={{ background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: pushStatus === 'loading' ? 'not-allowed' : 'pointer' }}
          >
            {pushStatus === 'loading' ? 'Enabling...' : pushStatus === 'denied' ? 'Permission Denied' : 'Enable Now'}
          </button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div style={{ background: 'var(--surface-1)', padding: 24, borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(217,173,98,0.1)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PackageOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Projects</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{myTasks.length}</div>
          </div>
        </div>
        <div style={{ background: 'var(--surface-1)', padding: 24, borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(52,209,138,0.1)', color: '#34d18a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active/In-Progress</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{activeCount}</div>
          </div>
        </div>
        <div style={{ background: 'var(--surface-1)', padding: 24, borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(91,159,255,0.1)', color: '#5b9fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{completedCount}</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>Your Projects</h2>

      {myTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-1)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
          <PackageOpen size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No projects found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You don't have any active or past projects with us yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {myTasks.map((task: Task, i: number) => {
            const isDone = task.status === 'completed' || task.status === 'delivered';
            const statusColor = isDone ? '#34d18a' : (task.status === 'in_progress' ? '#5b9fff' : 'var(--accent-gold)');
            const statusLabel = task.status.replace('_', ' ').toUpperCase();

            return (
              <motion.div key={task.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, background: `${statusColor}15`, padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 8 }}>
                      {statusLabel}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{task.title || 'Untitled Project'}</h3>
                  </div>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, flex: 1 }}>
                  {task.description ? (
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>
                  ) : 'No description provided.'}
                </div>

                {task.deadline && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                    <Calendar size={14} /> Expected Delivery: {new Date(task.deadline).toLocaleDateString()}
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 'auto', display: 'flex', gap: 10 }}>
                  {(task.status === 'new' || task.status === 'pending') && (
                    <button 
                      onClick={() => setPaymentTask(task)}
                      style={{ flex: 1, background: 'rgba(196,154,82,0.1)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <CreditCard size={14} /> Pay Advance
                    </button>
                  )}
                  {task.status === 'review' || task.status === 'in_progress' ? (
                    <button 
                      onClick={() => setFeedbackTask(task)}
                      style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text-primary)', padding: '10px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border-color)' }}
                    >
                      <MessageSquare size={14} /> Leave Feedback
                    </button>
                  ) : null}
                  {task.driveFolderLink && (
                    <a href={task.driveFolderLink} target="_blank" rel="noreferrer" style={{ flex: 1, background: 'linear-gradient(135deg, var(--accent-gold-light), #8a6422)', color: '#fff', padding: '10px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      Access Files <ExternalLink size={14} />
                    </a>
                  )}
                  {!task.driveFolderLink && task.status !== 'new' && task.status !== 'pending' && (
                    <div style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text-tertiary)', padding: '10px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                      Files Not Available Yet
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {paymentTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setPaymentTask(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} 
            style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
          >
            <button onClick={() => setPaymentTask(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Advance Payment</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
              Please send the advance amount via bKash to <strong>01XXX-XXXXXX</strong> and enter your TrxID below to verify.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Amount Sent (BDT)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-primary)', outline: 'none', fontSize: 15 }} />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>bKash TrxID</label>
              <input type="text" value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="e.g. 8A7B6C5D" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-primary)', outline: 'none', fontSize: 15 }} />
            </div>

            <button 
              onClick={handlePaymentSubmit}
              disabled={!amount || !trxId || paymentStatus !== 'idle'}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: paymentStatus === 'success' ? '#34d18a' : 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', color: '#fff', fontSize: 15, fontWeight: 700, cursor: (!amount || !trxId || paymentStatus !== 'idle') ? 'not-allowed' : 'pointer', opacity: (!amount || !trxId || paymentStatus === 'loading') ? 0.7 : 1 }}
            >
              {paymentStatus === 'loading' ? 'Verifying...' : paymentStatus === 'success' ? 'Submitted!' : 'Submit TrxID'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setFeedbackTask(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} 
            style={{ position: 'relative', width: '100%', maxWidth: 500, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 24, padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button onClick={() => setFeedbackTask(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Project Feedback</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
              Leave notes or timestamped feedback for <strong>{feedbackTask.title}</strong>.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Timestamp (Optional)</label>
              <input type="text" value={feedbackTimestamp} onChange={e => setFeedbackTimestamp(e.target.value)} placeholder="e.g. 01:23" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-primary)', outline: 'none', fontSize: 15 }} />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Feedback *</label>
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="E.g. Make the bass louder at this part..." rows={4} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'var(--surface-1)', color: 'var(--text-primary)', outline: 'none', fontSize: 15, resize: 'vertical' }} />
            </div>

            <button 
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', color: '#fff', fontSize: 15, fontWeight: 700, cursor: !feedbackText ? 'not-allowed' : 'pointer', opacity: !feedbackText ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Send size={16} /> Submit Feedback
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
