/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleDashed, Clock, Briefcase, Send, CheckCircle2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { sendNotification } from '../lib/firebase';
import { sendCompletionEmail } from '../utils/emailApi';
import { sendOrderCompletedSMS } from '../utils/smsApi';
import { matchesSearch } from '../utils/searchUtils';
import { arrayUnion, increment, writeBatch, doc as firestoreDoc, collection as firestoreCollection, serverTimestamp } from 'firebase/firestore';
import { atomicAddTaskWithAdvance } from '../utils/atomicOps';
import { db } from '../lib/firebase';
import {
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// This hook owns all page-level state, stage/status transition logic, drag & drop
// handling, and activity logging (mkLog) for the WorkProcess board. It is a
// mechanical extraction of what used to live directly inside WorkProcess.tsx —
// no behavior was changed while moving it here.
export function useWorkProcessBoard() {
  const { userData } = useAuth();
  const {
    tasks: rawTasks, addTask, updateTask, removeTask,
    users: teams,
    clients, addClient: addClientRecord,
    transactions, addTx, removeTx,
    workerPayments, removeWorkerPayment
  } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { currency, defaultComposerComm, defaultHummingComm } = settings;

  const mkLog = (type: string, from: string, to: string, note?: string) => ({
    type, ...(from ? { from } : {}), to,
    by: userData?.name || 'System',
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const fireToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMsg(msg); setToastType(type); setShowToast(true);
  };
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');

  const [milestoneInput, setMilestoneInput] = useState('');
  const [partialPaymentInput, setPartialPaymentInput] = useState('');
  const [workerPaymentInput, setWorkerPaymentInput] = useState({ composer: '', humming: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forcePay, setForcePay] = useState(false);

  const [newTask, setNewTask] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isAddingNewClientDetails, setIsAddingNewClientDetails] = useState(false);
  const [editTaskData, setEditTaskData] = useState<any>(null);

  const [viewMode, setViewMode] = useState<'active' | 'archive'>('active');
  const [activeStage, setActiveStage] = useState<string>('recording');
  const [stageSort, setStageSort] = useState<'deadline' | 'dateAdded' | 'priority'>('deadline');
  const [stageFilter, setStageFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sidePanelTask, setSidePanelTask] = useState<any>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{ id: string; task: any; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const toggleSelectTask = (id: string) => setSelectedTaskIds(prev => { const s = new Set(prev); if (s.has(id)) { s.delete(id); } else { s.add(id); } return s; });
  const clearSelection = () => { setSelectedTaskIds(new Set()); setIsSelectMode(false); };

  const handleOpenDetails = (task: any) => {
    setSidePanelTask(task);
    setIsSidePanelOpen(true);
  };

  const handleOpenFullDetails = (task: any) => {
    setIsSidePanelOpen(false); // Safety: always close side panel before opening full modal
    setSelectedTask(task);
    setIsConfirmingDelete(false);
    setIsDetailsOpen(true);
  };

  const exportTasksCSV = () => {
    const headers = ['TSN', 'Client', 'Song', 'Status', 'Priority', 'Budget', 'Paid', 'Due', 'Delivery Date', 'Composer', 'Recurrence', 'Created'];
    const allWorkers = teams.filter((u: any) => ['composer', 'humming_artist', 'admin'].includes(u.role));
    const rows = rawTasks.map((t: any) => {
      const paid = (t.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      const composer = allWorkers.find((u: any) => (u.uid || u.id) === t.composerId);
      return [
        t.title || '',
        t.client || '',
        t.songName || '',
        t.status || '',
        t.priority || 'normal',
        Number(t.budget) || 0,
        paid,
        Math.max(0, (Number(t.budget) || 0) - paid),
        t.deliveryDate || '',
        composer?.name || '',
        t.recurrence || 'none',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tanvir-studio-projects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    fireToast('CSV exported!');
  };

  const handleOpenModal = () => {
    // Find the highest existing TSN number to avoid ID collisions after deletions
    const maxId = rawTasks.reduce((max: number, t: any) => {
      const match = (t.title || '').match(/^TSN(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const nextNum = (maxId + 1).toString().padStart(2, '0');
    setNewTask({
      title: `TSN${nextNum}`,
      songName: '',
      description: '',
      priority: 'normal',
      client: '', clientEmail: '', clientPhone: '', status: 'recording', progress: 0, budget: '',
      advance: '', composerCommissionPct: defaultComposerComm, composerCommissionType: 'percentage', composerCommissionAmount: 0, composerId: '', needsHumming: false,
      hummingArtistId: '', hummingArtistCommissionPct: defaultHummingComm, hummingArtistCommissionType: 'percentage', hummingArtistCommissionAmount: 0,
      recordingDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      recordingDuration: 60,
      deliveryDate: new Date(Date.now() + (settings.autoCompleteDays ?? 7) * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
      milestones: [] as any[],
      recurrence: 'none',
    });
    setClientSearch('');
    setIsAddingNewClientDetails(false);
    setIsModalOpen(true);
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Auto-scroll chat: scroll the container, not the page
  useEffect(() => {
    const el = chatEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [selectedTask?.comments?.length, selectedTask?.id]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = [
    { id: 'recording', title: 'Recording', icon: <CircleDashed size={18} />, color: 'var(--color-info)' },
    { id: 'arrangement', title: 'Arrangement', icon: <Clock size={18} />, color: 'var(--color-info)' },
    { id: 'humming', title: 'Humming', icon: <Clock size={18} />, color: 'var(--color-info)' },
    { id: 'composition', title: 'Composition', icon: <Clock size={18} />, color: 'var(--color-info)' },
    { id: 'revision', title: 'Revision', icon: <Briefcase size={18} />, color: 'var(--color-info)' },
    { id: 'delivered', title: 'Delivered', icon: <Send size={18} />, color: 'var(--color-info)' },
    { id: 'completed', title: 'Completed', icon: <CheckCircle2 size={18} />, color: '#8E8E93' },
  ];

  const getClientPaid = (task: any) => (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const getClientDue = (task: any) => Math.max(0, (Number(task.budget) || 0) - getClientPaid(task));
  const isArchiveReady = (task: any) => {
    if (task.status !== 'completed') return false;
    if (getClientDue(task) > 0) return false;
    const anchorDate = task.deliveredAt || task.completedAt;
    if (!anchorDate) return false;
    const diffDays = Math.floor((Date.now() - new Date(anchorDate).getTime()) / 86400000);
    return diffDays >= 7;
  };

  useEffect(() => {
    if (location.state?.openNewProject) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleOpenModal();
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.openNewProject]);

  useEffect(() => {
    if (location.state?.stage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStage(location.state.stage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state?.stage]);

  useEffect(() => {
    if (location.state?.openTaskId && rawTasks.length > 0) {
      const taskId = location.state.openTaskId;
      const task = rawTasks.find((t: any) => t.id === taskId);

      if (task && task.status) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveStage(task.status);
        setHighlightedTaskId(taskId);
        setSidePanelTask(task);
        setIsSidePanelOpen(true);
        setTimeout(() => setHighlightedTaskId(null), 4000);
      }

      setTimeout(() => {
        const el = document.getElementById(`task-${taskId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);

      // Bug #9 fix: use navigate() instead of window.history.replaceState to keep React Router in sync
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, rawTasks]);

  // Bug #6 fix: useMemo prevents re-filtering on every render
  const filteredTasks = useMemo(() => rawTasks.filter((t: any) => {
    let roleMatch = true;
    if (userData?.role === 'client') {
      roleMatch = t.client === userData.name || t.clientEmail === userData.email;
    } else if (userData?.role === 'composer') {
      roleMatch = t.composerId === userData.uid;
    } else if (userData?.role === 'humming_artist') {
      roleMatch = t.hummingArtistId === userData.uid && ['humming', 'composition', 'revision', 'delivered', 'completed'].includes(t.status);
    }
    const searchMatch = matchesSearch(searchQuery, t.title, t.client, t.songName, t.clientEmail, t.clientPhone);
    return roleMatch && searchMatch;
  }), [rawTasks, userData, searchQuery]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask?.title?.trim() || !newTask?.client?.trim() || isSubmitting) return;

    // Calendar conflict detection: warn if recording date overlaps an existing session
    if (newTask.recordingDate) {
      const newStart = new Date(newTask.recordingDate).getTime();
      const newDuration = (Number(newTask.recordingDuration) || 60) * 60 * 1000;
      const newEnd = newStart + newDuration;
      const conflict = rawTasks.find((t: any) => {
        if (!t.recordingDate || t.status === 'completed') return false;
        const tStart = new Date(t.recordingDate).getTime();
        const tEnd = tStart + ((Number(t.recordingDuration) || 60) * 60 * 1000);
        return newStart < tEnd && newEnd > tStart;
      });
      if (conflict && !window.confirm(`⚠️ Scheduling conflict: "${conflict.title}" is already booked at this time.\n\nContinue anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Check if client is new, if so add to clients collection
      let finalClientEmail = newTask.clientEmail;
      const clientNameLower = newTask.client.trim().toLowerCase();
      const clientEmailLower = (newTask.clientEmail || '').trim().toLowerCase();
      // Bug #3 fix: match by both name AND email to prevent duplicates
      const existingClient = clients.find((c: any) =>
        (c.name || '').trim().toLowerCase() === clientNameLower ||
        (clientEmailLower && (c.email || '').trim().toLowerCase() === clientEmailLower)
      );

      let savedClientId: string | null = existingClient?.id || null;
      if (!existingClient) {
        // Automatically create new client record
        const newClientRef = await addClientRecord({
          name: newTask.client.trim(),
          email: newTask.clientEmail || '',
          company: '',
          phone: newTask.clientPhone || '',
          status: 'Active',
          createdAt: new Date().toISOString()
        });
        savedClientId = newClientRef?.id || null;
      } else {
        finalClientEmail = newTask.clientEmail || existingClient.email || '';
      }

      // 2. Prepare task payload
      // NOTE: `advance` is NOT stored as a separate field — only in `payments` array.
      // This prevents dual-source-of-truth issues in payment calculations.
      const advanceAmount = Number(newTask.advance) || 0;
      const budgetAmount = Number(newTask.budget) || 0;
      if (advanceAmount > 0 && budgetAmount > 0 && advanceAmount > budgetAmount) {
        fireToast(`Advance (${currency}${advanceAmount.toLocaleString()}) cannot exceed budget (${currency}${budgetAmount.toLocaleString()}).`, 'error');
        setIsSubmitting(false);
        return;
      }

      const { advance: _ignoreAdvance, ...newTaskRest } = newTask;
      const taskPayload: any = {
        ...newTaskRest,
        clientEmail: finalClientEmail,
        progress: Number(newTask.progress),
        budget: Number(newTask.budget) || 0,
        composerCommissionPct: Number(newTask.composerCommissionPct) || defaultComposerComm,
        composerCommissionType: newTask.composerCommissionType || 'percentage',
        composerCommissionAmount: Number(newTask.composerCommissionAmount) || 0,
        hummingArtistCommissionPct: Number(newTask.hummingArtistCommissionPct) || defaultHummingComm,
        hummingArtistCommissionType: newTask.hummingArtistCommissionType || 'percentage',
        hummingArtistCommissionAmount: Number(newTask.hummingArtistCommissionAmount) || 0,
        payments: advanceAmount > 0 ? [{ date: new Date().toISOString(), amount: advanceAmount, note: 'Advance' }] : [],
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        createdAt: new Date().toISOString(),
        activityLog: [{ type: 'created', to: newTask.status || 'recording', by: userData?.name || 'Admin', at: new Date().toISOString() }],
        ...(savedClientId ? { clientId: savedClientId } : {}),
      };
      if (newTask.status === 'completed' && Number(newTask.budget || 0) > advanceAmount) {
        taskPayload.status = 'delivered';
        taskPayload.deliveredAt = new Date().toISOString();
      } else if (newTask.status === 'completed') {
        taskPayload.progress = 100;
        taskPayload.completedAt = new Date().toISOString();
      }
      if (newTask.status === 'delivered' || newTask.status === 'completed') {
        taskPayload.deliveredAt = new Date().toISOString();
      }

      if (!newTask.needsHumming) {
        taskPayload.hummingArtistId = '';
      }

      const advanceTxData = advanceAmount > 0 ? {
        title: `Project Advance: ${newTask.title}`,
        amount: advanceAmount,
        type: 'in' as const,
        client: newTask.client,
        status: 'Completed' as const,
        category: 'Project Revenue',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString(),
      } : null;

      await atomicAddTaskWithAdvance(taskPayload, advanceTxData);

      // Notify Composer
      if (newTask.composerId) {
        await sendNotification(newTask.composerId, 'New Assignment', `You have been assigned to: ${newTask.title}`, 'assignment');
      }

      // Notify Client
      const clientUser = teams.find((u: any) => u.email === finalClientEmail || u.name === newTask.client);
      if (clientUser) {
        await sendNotification(clientUser.uid, 'Project Started', `Your project "${newTask.title}" has been added to our queue.`, 'progress');
      }

      setIsModalOpen(false); fireToast('Project added!'); setNewTask(null);
      setClientSearch('');
    } catch (error) { console.error('Error adding task:', error); fireToast('Failed to add project. Please try again.', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskData?.id || !editTaskData?.title?.trim() || !editTaskData?.client?.trim()) return;
    try {
      const { id, ...data } = editTaskData;

      // Guard: budget cannot drop below already-collected payments
      const previousTask = rawTasks.find((t: any) => t.id === id);
      const alreadyPaid = ((previousTask?.payments || []) as any[]).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      if (Number(data.budget) < alreadyPaid) {
        fireToast(`Budget cannot be less than already-collected payments (${currency}${alreadyPaid.toLocaleString()}).`, 'error');
        return;
      }

      const updates: any = {
        ...data,
        budget: Number(data.budget),
        // Bug #8 fix: use settings defaults instead of hardcoded 15
        composerCommissionPct: Number(data.composerCommissionPct) || defaultComposerComm,
        composerCommissionType: data.composerCommissionType || 'percentage',
        composerCommissionAmount: Number(data.composerCommissionAmount) || 0,
        hummingArtistCommissionPct: Number(data.hummingArtistCommissionPct) || defaultHummingComm,
        hummingArtistCommissionType: data.hummingArtistCommissionType || 'percentage',
        hummingArtistCommissionAmount: Number(data.hummingArtistCommissionAmount) || 0,
      };

      if ((data.status === 'delivered' || data.status === 'completed') && !previousTask?.deliveredAt) {
        updates.deliveredAt = new Date().toISOString();
      }
      if (data.status === 'completed' && getClientDue({ ...previousTask, ...data }) > 0) {
        fireToast('Due clear na hole project complete kora jabe na — Delivered e rakha hoyeche.', 'warning');
        updates.status = 'delivered';
        if (!previousTask?.deliveredAt) updates.deliveredAt = new Date().toISOString();
      } else if (data.status === 'completed' && !previousTask?.completedAt) {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
      }

      await updateTask(id, updates);

      // SMS on completed — only for web orders with a phone number
      if (updates.status === 'completed' && previousTask?.publicOrder && previousTask?.clientPhone) {
        sendOrderCompletedSMS(previousTask.clientPhone, previousTask.client || '', previousTask.songName || previousTask.title || '', previousTask.packageName || '').catch(() => fireToast('Status updated, but SMS notification failed.', 'error'));
      }

      setIsEditOpen(false);

      if (selectedTask?.id === id) {
        const freshTask = rawTasks.find((t: any) => t.id === id) || {};
        setSelectedTask({ ...freshTask, ...editTaskData, id });
      }

      fireToast('Project updated!');
    } catch (error) { console.error('Error updating task:', error); fireToast('Failed to update project. Please try again.', 'error'); }
  };

  const handlePartialPayment = async () => {
    if (!partialPaymentInput || !selectedTask || isSubmitting) return;
    const amount = Number(partialPaymentInput);
    if (amount <= 0) return;
    const freshTask = rawTasks.find((t: any) => t.id === selectedTask.id) || selectedTask;
    const alreadyPaid = (freshTask.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const remainingDue = (Number(freshTask.budget) || 0) - alreadyPaid;
    if (remainingDue <= 0) {
      fireToast('This project is already fully paid.', 'error');
      return;
    }
    if (amount > remainingDue) {
      fireToast(`Cannot log more than the remaining due (${currency}${remainingDue.toLocaleString()}).`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const newPayment = { date: new Date().toISOString(), amount, note: 'Partial Payment' };
      const newPayments = [...(freshTask.payments || []), newPayment];

      const batch = writeBatch(db);
      batch.update(firestoreDoc(db, 'tasks', selectedTask.id), {
        payments: arrayUnion(newPayment),
        activityLog: arrayUnion(mkLog('payment', '', `${currency}${amount.toLocaleString()} received`)),
      });
      batch.set(firestoreDoc(firestoreCollection(db, 'transactions')), {
        title: `Partial Payment: ${selectedTask.title}`,
        amount,
        type: 'in',
        client: selectedTask.client,
        status: 'Completed',
        category: 'Project Revenue',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString(),
      });
      await batch.commit();

      setSelectedTask({ ...freshTask, payments: newPayments });
      setPartialPaymentInput('');
      fireToast('Payment logged!');
    } catch (error) { console.error('Payment log failed:', error); fireToast('Failed to log payment. Please try again.', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleWorkerPayment = async (role: 'composer' | 'hummingArtist') => {
    const inputAmount = role === 'composer' ? workerPaymentInput.composer : workerPaymentInput.humming;
    if (!inputAmount || !selectedTask || isSubmitting) return;
    const amount = Number(inputAmount);
    if (amount <= 0) return;
    setIsSubmitting(true);
    try {
      const isComposer = role === 'composer';
      const fieldPaid = isComposer ? 'composerPaid' : 'hummingArtistPaid';
      const freshTask = rawTasks.find((t: any) => t.id === selectedTask.id) || selectedTask;
      const currentPaid = Number(freshTask[fieldPaid]) || 0;
      const commType = isComposer ? (freshTask.composerCommissionType || 'percentage') : (freshTask.hummingArtistCommissionType || 'percentage');
      const commPct = isComposer ? (freshTask.composerCommissionPct || defaultComposerComm) : (freshTask.hummingArtistCommissionPct || defaultHummingComm);
      const flatAmount = isComposer ? (freshTask.composerCommissionAmount || 0) : (freshTask.hummingArtistCommissionAmount || 0);
      const budget = Number(freshTask.budget) || 0;
      const totalEarned = commType === 'flat' ? flatAmount : (budget * commPct) / 100;

      const taskPaid = (freshTask.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      const paymentRatio = budget > 0 ? Math.min(1, taskPaid / budget) : 1;

      let stageComplete = false;
      if (isComposer) {
        stageComplete = ['revision', 'delivered', 'completed'].includes(freshTask.status);
      } else {
        stageComplete = ['composition', 'revision', 'delivered', 'completed'].includes(freshTask.status);
      }

      if (!stageComplete && !forcePay) {
        fireToast("Cannot disburse before required stage is completed. Enable 'Force Pay' to override.", 'error');
        setIsSubmitting(false);
        return;
      }

      const eligibleEarned = forcePay ? totalEarned : (totalEarned * paymentRatio);
      const due = eligibleEarned - currentPaid;

      if (amount > due) {
        if (paymentRatio < 1 && totalEarned - currentPaid >= amount && !forcePay) {
          fireToast(`Client payment pending — max payout is ${currency}${eligibleEarned.toLocaleString()}. Enable 'Force Pay' to override.`, 'warning');
        } else {
          fireToast(`Cannot disburse more than ${currency}${due.toLocaleString()}.`, 'error');
        }
        setIsSubmitting(false);
        return;
      }

      // Atomic batch: all 3 writes succeed or fail together
      // increment() prevents race condition
      const batch = writeBatch(db);
      const taskRef = firestoreDoc(db, 'tasks', selectedTask.id);
      batch.update(taskRef, { [fieldPaid]: increment(amount) });

      const txRef = firestoreDoc(firestoreCollection(db, 'transactions'));
      batch.set(txRef, {
        title: `Worker Payout: ${selectedTask.title} (${isComposer ? 'Composer' : 'Humming Artist'})`,
        amount, type: 'out', client: selectedTask.client, status: 'Completed',
        category: 'Worker Payout',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: new Date().toISOString()
      });

      const wpRef = firestoreDoc(firestoreCollection(db, 'workerPayments'));
      batch.set(wpRef, {
        workerId: isComposer ? selectedTask.composerId : selectedTask.hummingArtistId,
        workerName: isComposer ? (teams.find((u: any) => u.uid === selectedTask.composerId)?.name || 'Composer') : (teams.find((u: any) => u.uid === selectedTask.hummingArtistId)?.name || 'Artist'),
        amount, note: `Project Payout: ${selectedTask.title}`,
        paidAt: new Date().toISOString(), paidBy: userData?.name || 'Admin'
      });

      await batch.commit();
      setSelectedTask((prev: any) => ({ ...prev, [fieldPaid]: currentPaid + amount }));

      const workerId = isComposer ? selectedTask.composerId : selectedTask.hummingArtistId;
      if (workerId) {
        await sendNotification(workerId, 'Payment Received', `You have been paid ${currency} ${amount} for project: ${selectedTask.title}`, 'payment');
      }

      setWorkerPaymentInput(prev => ({ ...prev, [role === 'composer' ? 'composer' : 'humming']: '' }));
      fireToast('Worker payment disbursed!');
    } catch (error) { console.error('Worker payment failed:', error); fireToast('Failed to disburse payment. Please try again.', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const getNextStatus = (current: string, task: any, direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (current === 'recording') return 'arrangement';
      if (current === 'arrangement') return task.needsHumming ? 'humming' : 'composition';
      if (current === 'humming') return 'composition';
      if (current === 'composition') return 'revision';
      if (current === 'revision') return 'delivered';
      if (current === 'delivered') return 'completed';
      return 'completed';
    } else {
      if (current === 'completed') return 'delivered';
      if (current === 'delivered') return 'revision';
      if (current === 'revision') return 'composition';
      if (current === 'composition') return task.needsHumming ? 'humming' : 'arrangement';
      if (current === 'humming') return 'arrangement';
      if (current === 'arrangement') return 'recording';
      return 'recording';
    }
  };

  const moveTask = async (e: React.MouseEvent, id: string, direction: 'next' | 'prev') => {
    e.stopPropagation();
    if (userData?.role === 'client') return; // Clients cannot move tasks

    const task = rawTasks.find((t: any) => t.id === id);
    if (!task) return;

    const nextStatus = getNextStatus(task.status, task, direction);
    try {
      if (nextStatus === 'completed' && getClientDue(task) > 0) {
        fireToast(`Due ${currency}${getClientDue(task).toLocaleString()} clear na hole archive kora jabe na.`, 'error');
        return;
      }
      const moveUpdates: any = { status: nextStatus, progress: nextStatus === 'completed' ? 100 : task.progress };
      if (nextStatus === 'delivered') moveUpdates.deliveredAt = new Date().toISOString();
      if (nextStatus === 'completed') moveUpdates.completedAt = new Date().toISOString();
      moveUpdates.activityLog = arrayUnion(mkLog('status', task.status, nextStatus));
      await updateTask(id, moveUpdates);

      // Trigger Email Notification on Delivered
      if (nextStatus === 'delivered' && task.clientEmail) {
        sendCompletionEmail(task.clientEmail || '', task.client || 'Client', task.songName || task.title || '', task.driveFolderLink || '')
          .catch(() => fireToast('Status updated, but delivery email failed to send.', 'error'));
      }

      // SMS on completed — only for web orders with a phone number
      if (nextStatus === 'completed' && task.publicOrder && task.clientPhone) {
        sendOrderCompletedSMS(task.clientPhone, task.client || '', task.songName || task.title || '' || '', task.packageName || '').catch(() => fireToast('Status updated, but SMS notification failed.', 'error'));
      }

      if (nextStatus === 'completed' && task.recurrence && task.recurrence !== 'none') {
        const maxId = rawTasks.reduce((max: number, t: any) => {
          const m = (t.title || '').match(/^TSN(\d+)/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        const nextNum = (maxId + 1).toString().padStart(2, '0');
        const daysAhead = task.recurrence === 'weekly' ? 7 : 30;
        const nextDelivery = new Date(Date.now() + daysAhead * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

        const { id: _id, completedAt: _c, deliveredAt: _d, payments: _p, progress: _prog, comments: _cm, ...taskBase } = task;
        await addTask({
          ...taskBase,
          title: `TSN${nextNum} ${task.client} - ${task.songName || task.title || ''.split(' - ')[1] || 'Recurring'}`,
          status: 'recording',
          progress: 0,
          payments: [],
          comments: [],
          deliveryDate: nextDelivery,
          createdAt: new Date().toISOString(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
        fireToast(`Recurring copy created (${task.recurrence})!`, 'info');
      }

      // Notify Client about progress
      const clientUser = teams.find((u: any) => u.email === task.clientEmail || u.name === task.client);
      const statusTitle = columns.find(c => c.id === nextStatus)?.title || nextStatus;
      if (clientUser) {
        await sendNotification(clientUser.uid, 'Project Update', `Your project "${task.title}" is now in "${statusTitle}" phase.`, 'progress');
      }
    } catch (error) { console.error('Error moving task:', error); fireToast('Failed to move project. Please try again.', 'error'); }
  };

  const toggleMilestone = async (taskId: string, index: number) => {
    if (userData?.role === 'client') return;
    const task = rawTasks.find((t: any) => t.id === taskId);
    if (!task || !task.milestones) return;
    const newMilestones = [...task.milestones];
    newMilestones[index] = { ...newMilestones[index], completed: !newMilestones[index].completed };
    try {
      await updateTask(taskId, { milestones: newMilestones });
      if (selectedTask?.id === taskId) setSelectedTask({ ...selectedTask, milestones: newMilestones });
    } catch (error) { console.error('Error toggling milestone:', error); fireToast('Failed to update milestone.', 'error'); }
  };

  const handleDeleteTask = (id: string) => {
    const task = rawTasks.find((t: any) => t.id === id);
    if (!task) return;
    if (pendingDeleteTask) {
      clearTimeout(pendingDeleteTask.timer);
      // execute previous pending delete immediately
      const prev = pendingDeleteTask;
      const prevTaskTitle = prev.task.title || '';
      const prevRelatedTx = transactions.filter((t: any) => t.taskId === prev.id || (prevTaskTitle && (t.title || '').includes(prevTaskTitle)));
      const prevRelatedWp = workerPayments.filter((wp: any) => wp.taskId === prev.id || (prevTaskTitle && (wp.note || '').includes(prevTaskTitle)));
      Promise.all([removeTask(prev.id), ...prevRelatedTx.map((t: any) => removeTx(t.id)), ...prevRelatedWp.map((wp: any) => removeWorkerPayment(wp.id))]).catch((err: unknown) => { console.error('Error deleting previous task:', err); fireToast('Delete failed — please retry.', 'error'); });
    }
    setIsDetailsOpen(false);
    setIsConfirmingDelete(false);
    const timer = setTimeout(async () => {
      try {
        const taskTitle = task.title || '';
        const relatedTx = transactions.filter((t: any) => t.taskId === id || (taskTitle && (t.title || '').includes(taskTitle)));
        const relatedWp = workerPayments.filter((wp: any) => wp.taskId === id || (taskTitle && (wp.note || '').includes(taskTitle)));
        await Promise.all([removeTask(id), ...relatedTx.map((t: any) => removeTx(t.id)), ...relatedWp.map((wp: any) => removeWorkerPayment(wp.id))]);
      } catch (error) { console.error('Error deleting task:', error); fireToast('Delete failed — please retry.', 'error'); }
      setPendingDeleteTask(null);
    }, 5000);
    setPendingDeleteTask({ id, task, timer });
    setToastMsg(`"${task.title}" deleted`);
    setToastType('warning');
    setShowToast(true);
  };

  const handleBulkMoveStage = async (stage: string) => {
    try {
      await Promise.all([...selectedTaskIds].map(id => updateTask(id, { status: stage })));
      fireToast(`${selectedTaskIds.size} tasks moved to ${stage}`);
      clearSelection();
    } catch (err) { console.error(err); fireToast('Failed to move tasks. Please try again.', 'error'); }
  };

  const handleBulkDelete = () => {
    const ids = [...selectedTaskIds];
    const count = ids.length;
    ids.forEach(id => handleDeleteTask(id));
    clearSelection();
    fireToast(`${count} tasks deleted`);
  };

  const handleDragStart = (event: DragStartEvent) => { if (userData?.role !== 'client') setActiveId(event.active.id as string); };
  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (overId && columns.find(c => c.id === overId)) {
      setHoveredStage(overId);
    } else {
      setHoveredStage(null);
    }
  };
  const customCollisionDetection = (args: any) => {
    // Strictly follow the cursor
    const collisions = pointerWithin(args);

    // If no pointer collisions, fallback to closestCorners for sortable stability
    return collisions.length > 0 ? collisions : closestCorners(args);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setHoveredStage(null);
    if (userData?.role === 'client') return;
    const { active, over } = event;
    if (!over) return;
    const activeTask = rawTasks.find((t: any) => t.id === active.id);
    if (!activeTask) return;
    // Bug #7 fix: cast to string to prevent type mismatch with DnD Kit's UniqueIdentifier
    const overId = String(over.id);
    const overColumnId = columns.find(c => c.id === overId) ? overId : (rawTasks.find((t: any) => t.id === overId)?.status);

    if (overColumnId && activeTask.status !== overColumnId) {
      try {
        if (overColumnId === 'completed' && getClientDue(activeTask) > 0) {
          fireToast(`Due ${currency}${getClientDue(activeTask).toLocaleString()} clear na hole archive kora jabe na.`, 'error');
          return;
        }
        const updates: any = {
          status: overColumnId,
          progress: overColumnId === 'completed' ? 100 : activeTask.progress
        };

        if (overColumnId === 'delivered') {
          updates.deliveredAt = new Date().toISOString();
        }
        if (overColumnId === 'completed') {
          updates.completedAt = new Date().toISOString();
        }
        updates.activityLog = arrayUnion(mkLog('status', activeTask.status, overColumnId));

        await updateTask(active.id as string, updates);

        // Notify Client
        const clientUser = teams.find((u: any) => u.email === activeTask.clientEmail || u.name === activeTask.client);
        const statusTitle = columns.find(c => c.id === overColumnId)?.title || overColumnId;
        if (clientUser) {
          await sendNotification(clientUser.uid, 'Project Update', `Your project "${activeTask.title}" is now in "${statusTitle}" phase.`, 'progress');
        }
      }
      catch (error) { console.error('Error dragging task:', error); fireToast('Failed to move project. Please try again.', 'error'); }
    }
  };

  // Auto-Complete Logic: threshold from settings (default 7 days)
  // Bug #9 fix: track by a stable key derived from delivered task IDs+dates
  const deliveredTasksKey = rawTasks
    .filter((t: any) => t.status === 'delivered' && t.deliveredAt)
    .map((t: any) => `${t.id}:${t.deliveredAt}:${getClientDue(t)}`)
    .join('|');

  useEffect(() => {
    if (userData?.role !== 'admin' || rawTasks.length === 0) return;

    const checkAutoCompletion = async () => {
      const now = new Date();
      for (const task of rawTasks) {
        if (task.status === 'delivered' && task.deliveredAt) {
          const diffDays = Math.ceil(
            (now.getTime() - new Date(task.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= (settings.autoCompleteDays ?? 7) && getClientDue(task) <= 0) {
            await updateTask(task.id, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
          }
        }
      }
    };

    checkAutoCompletion();
  }, [userData?.role, deliveredTasksKey]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedTask) return;
    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: userData?.uid || '',
      userName: userData?.name || 'User',
      role: userData?.role || 'client',
      text: chatInput,
      createdAt: new Date().toISOString(),
    };
    try {
      // Use arrayUnion for atomic append — consistent with ProjectSidePanel
      await updateTask(selectedTask.id, { comments: arrayUnion(newComment) as any });

      // Notify other parties
      const recipients = new Set<string>();
      if (selectedTask.composerId) recipients.add(selectedTask.composerId);
      if (selectedTask.hummingArtistId) recipients.add(selectedTask.hummingArtistId);

      // Admin
      const adminUser = teams.find((u: any) => u.role === 'admin');
      if (adminUser) recipients.add(adminUser.uid);

      // Client
      const clientUser = teams.find((u: any) => u.email === selectedTask.clientEmail || u.name === selectedTask.client);
      if (clientUser) recipients.add(clientUser.uid);

      // Remove sender from recipients
      recipients.delete(userData?.uid || '');

      recipients.forEach(rid => {
        sendNotification(rid, `New Message: ${selectedTask.title}`, `${userData?.name}: ${chatInput.substring(0, 30)}${chatInput.length > 30 ? '...' : ''}`, 'chat').catch((err: unknown) => console.error('[notification]', err));
      });

      // guard against double-show when Firestore real-time fires before this runs
      setSelectedTask((prev: any) => {
        const existingIds = new Set((prev.comments || []).map((c: any) => c.id));
        const safeComments = existingIds.has(newComment.id)
          ? (prev.comments || [])
          : [...(prev.comments || []), newComment];
        return { ...prev, comments: safeComments };
      });
      setChatInput('');
    } catch (error) {
      console.error('Error sending chat:', error);
      fireToast('Failed to send message. Please try again.', 'error');
    }
  };

  const activeTask = activeId ? rawTasks.find((t: any) => t.id === activeId) : null;
  const composers = teams.filter((u: any) => u.role === 'composer' || u.role === 'admin');
  const hummingArtists = teams.filter((u: any) => u.role === 'humming_artist' || u.role === 'admin');

  // Helper: update status, optimistically sync selectedTask, and notify client
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTask) return;
    if (newStatus === 'completed' && getClientDue(selectedTask) > 0) {
      fireToast(`Due ${currency}${getClientDue(selectedTask).toLocaleString()} clear na hole archive kora jabe na.`, 'error');
      return;
    }
    const updates: any = { status: newStatus };
    const forwardStatuses = ['pending', 'in_progress', 'revision', 'delivered', 'completed'];
    const prevIdx = forwardStatuses.indexOf(selectedTask.status);
    const nextIdx = forwardStatuses.indexOf(newStatus);
    const isReversal = nextIdx < prevIdx;
    if (isReversal) {
      // Clear timestamps that no longer apply
      if (nextIdx < forwardStatuses.indexOf('completed')) updates.completedAt = null;
      if (nextIdx < forwardStatuses.indexOf('delivered')) updates.deliveredAt = null;
    } else {
      if ((newStatus === 'delivered' || newStatus === 'completed') && !selectedTask.deliveredAt) {
        updates.deliveredAt = new Date().toISOString();
      }
      if (newStatus === 'completed' && !selectedTask.completedAt) {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
      }
    }
    updates.activityLog = arrayUnion(mkLog('status', selectedTask.status, newStatus));
    try {
      await updateTask(selectedTask.id, updates);
      // Optimistic update — exclude arrayUnion sentinel from React state
      const { activityLog: _logEntry, ...updatesForState } = updates;
      setSelectedTask((prev: any) => ({ ...prev, ...updatesForState }));
      // Notify client
      const clientUser = teams.find((u: any) => u.email === selectedTask.clientEmail || u.name === selectedTask.client);
      const statusTitle = columns.find(c => c.id === newStatus)?.title || newStatus;
      if (clientUser) {
        await sendNotification(clientUser.uid, 'Project Update', `Your project "${selectedTask.title}" is now in "${statusTitle}" phase.`, 'progress');
      }
    } catch (error) { console.error('Status change failed:', error); fireToast('Failed to update status. Please try again.', 'error'); }
  };

  // Mobile DnD: move task to a new stage
  const handleMobileTaskMove = async (taskId: string, newStageId: string) => {
    const task = rawTasks.find((t: any) => t.id === taskId);
    if (!task) return;
    if (newStageId === 'completed' && getClientDue(task) > 0) {
      fireToast(`Due ${currency}${getClientDue(task).toLocaleString()} clear na hole complete kora jabe na.`, 'error');
      return;
    }
    const updates: any = { status: newStageId };
    if (newStageId === 'delivered' || newStageId === 'completed') updates.deliveredAt = new Date().toISOString();
    if (newStageId === 'completed') { updates.completedAt = new Date().toISOString(); updates.progress = 100; }
    updates.activityLog = arrayUnion(mkLog('status', task.status, newStageId));
    try {
      await updateTask(taskId, updates);
      const clientUser = teams.find((u: any) => u.email === task.clientEmail || u.name === task.client);
      const statusTitle = columns.find(c => c.id === newStageId)?.title || newStageId;
      if (clientUser) await sendNotification(clientUser.uid, 'Project Update', `Your project "${task.title}" is now in "${statusTitle}" phase.`, 'progress');
    } catch (err) { console.error('Mobile move failed:', err); fireToast('Failed to move project. Please try again.', 'error'); }
  };

  return {
    // context data
    userData, teams, clients, rawTasks, currency, updateTask, navigate,
    columns,
    // toast
    showToast, setShowToast, toastMsg, toastType, fireToast, pendingDeleteTask, setPendingDeleteTask,
    // modal open state
    isModalOpen, setIsModalOpen,
    isDetailsOpen, setIsDetailsOpen,
    isEditOpen, setIsEditOpen,
    showInvoice, setShowInvoice,
    selectedTask, setSelectedTask,
    // drag / dnd
    activeId, sensors, activeTask, handleDragStart, handleDragOver, handleDragEnd, customCollisionDetection,
    // refs
    containerRef, chatEndRef,
    // search / chat
    searchQuery, setSearchQuery, chatInput, setChatInput, handleSendChat,
    // add/edit form inputs
    milestoneInput, setMilestoneInput,
    partialPaymentInput, setPartialPaymentInput,
    workerPaymentInput, setWorkerPaymentInput,
    isSubmitting, forcePay, setForcePay,
    newTask, setNewTask,
    clientSearch, setClientSearch,
    isClientDropdownOpen, setIsClientDropdownOpen,
    isAddingNewClientDetails, setIsAddingNewClientDetails,
    editTaskData, setEditTaskData,
    // view / stage
    viewMode, setViewMode,
    activeStage, setActiveStage,
    stageSort, setStageSort,
    stageFilter, setStageFilter,
    workerFilter, setWorkerFilter,
    hoveredStage,
    highlightedTaskId,
    isConfirmingDelete, setIsConfirmingDelete,
    // side panel
    isSidePanelOpen, setIsSidePanelOpen, sidePanelTask, handleOpenDetails, handleOpenFullDetails,
    // bulk select
    isSelectMode, setIsSelectMode, selectedTaskIds, setSelectedTaskIds, toggleSelectTask, clearSelection,
    handleBulkMoveStage, handleBulkDelete,
    // computed helpers
    getClientPaid, getClientDue, isArchiveReady, filteredTasks, composers, hummingArtists,
    // handlers
    exportTasksCSV, handleOpenModal, handleAddTask, handleEditTask, handlePartialPayment, handleWorkerPayment,
    getNextStatus, moveTask, toggleMilestone, handleDeleteTask, handleStatusChange, handleMobileTaskMove,
  };
}
