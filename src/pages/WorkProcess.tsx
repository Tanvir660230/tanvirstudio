/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate, useLocation } from 'react-router-dom';

import { Plus, CheckCircle2, Clock, CircleDashed, Briefcase, Search, Send, Music2, Download } from 'lucide-react';

import { Toast } from '../components/Toast';

import { InvoiceModal } from '../components/InvoiceModal';

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

  DndContext,

  closestCorners,

  pointerWithin,

  KeyboardSensor,

  MouseSensor,

  TouchSensor,

  useSensor,

  useSensors,

  DragOverlay,

} from '@dnd-kit/core';

import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';

import {

  SortableContext,

  sortableKeyboardCoordinates,

  verticalListSortingStrategy,

} from '@dnd-kit/sortable';

import { SortableTask } from '../components/SortableTask';

import { ProjectSidePanel } from '../components/ProjectSidePanel';

import { StageEmptyState } from '../components/StageEmptyState';



import { DroppableStageTab } from '../components/workflow/DroppableStageTab';

import { AddTaskModal } from '../components/workflow/AddTaskModal';

import { TaskDetailsModal } from '../components/workflow/TaskDetailsModal';

import { EditProjectModal } from '../components/workflow/EditProjectModal';

import { WorkflowStats } from '../components/workflow/WorkflowStats';

import { MobileWorkView } from '../components/workflow/MobileWorkView';
import { WorkProcessToolbar } from '../components/workflow/WorkProcessToolbar';
import { WorkProcessBulkBar } from '../components/workflow/WorkProcessBulkBar';
import { ArchivedProjectsView } from '../components/workflow/ArchivedProjectsView';








export function WorkProcess() {

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

      handleOpenModal();

      window.history.replaceState({}, '', location.pathname);

    }

  }, [location.state?.openNewProject]);



  useEffect(() => {

    if (location.state?.stage) {

      setActiveStage(location.state.stage);

      navigate(location.pathname, { replace: true, state: null });

    }

  }, [location.state?.stage]);



  useEffect(() => {

    if (location.state?.openTaskId && rawTasks.length > 0) {

      const taskId = location.state.openTaskId;

      const task = rawTasks.find((t: any) => t.id === taskId);



      if (task && task.status) {

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

      if (conflict && !window.confirm(`⚠️ Scheduling conflict: "${conflict.title}" is already booked at this time.\n\nContinue anyway?`)) {

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



  return (

    <div ref={containerRef} style={{position: 'relative' }}>



      {/* ── MOBILE VIEW ─ shown only on small screens ── */}

      <div className="mobile-only">

        <MobileWorkView

          columns={columns}

          filteredTasks={filteredTasks}

          isArchiveReady={isArchiveReady}

          viewMode={viewMode}

          setViewMode={setViewMode}

          searchQuery={searchQuery}

          setSearchQuery={setSearchQuery}

          openDetails={handleOpenDetails}

          handleOpenModal={handleOpenModal}

          onTaskMove={handleMobileTaskMove}

          userRole={userData?.role}

          currency={currency}

        />

      </div>



      {/* ── DESKTOP VIEW ─ hidden on mobile ── */}

      <div className="desktop-only">

      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>

        <div className="page-header-left">

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>

            <div className="icon-badge" style={{ background: 'var(--gradient-purple)', color: '#fff', boxShadow: 'none' }}>

              <Music2 size={18} strokeWidth={2.5} />

            </div>

            <h1 className="page-title">Production Suite</h1>

          </div>

        </div>



        <div className="page-actions" style={{ alignItems: 'center', gap: '8px' }}>

          <div className="tab-bar" style={{ flexShrink: 0 }}>

            <button className={`tab-item${viewMode === 'active' ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => setViewMode('active')}>Active</button>

            <button className={`tab-item${viewMode === 'archive' ? ' active' : ''}`} style={{ flex: 1 }} onClick={() => setViewMode('archive')}>Archive</button>

          </div>



          <div className="desktop-only" style={{ position: 'relative' }}>

            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

            <input

              type="text"

              placeholder="Search projects..."

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="form-input"

              style={{ width: 220, paddingLeft: 36, height: 38 }}

            />

          </div>



          {(userData?.role === 'admin' || userData?.role === 'composer') && (

            <button className="btn btn-gradient" style={{ flexShrink: 0, padding: '9px 18px', fontSize: 14, fontWeight: 700, borderRadius: 10, gap: 7 }} onClick={handleOpenModal}>

              <Plus size={16} strokeWidth={2.5} /> <span className="desktop-only">New Project</span>

            </button>

          )}

        </div>



        <div className="mobile-only-search" style={{ width: '100%', marginTop: 'var(--space-3)', position: 'relative' }}>

          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />

          <input

            type="text"

            placeholder="Search projects..."

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}

            className="form-input"

            style={{ width: '100%', paddingLeft: 36, height: 42 }}

          />

        </div>

      </div>



      {/* Stats Strip */}

      {viewMode === 'active' && (

        <WorkflowStats rawTasks={userData?.role === 'admin' ? rawTasks : filteredTasks} currency={currency} isAdmin={userData?.role === 'admin'} />

      )}



      {viewMode === 'active' ? (

        <>

          {/* Stage Tab Navigation — wrapped in DndContext for cross-stage dropping */}

          <DndContext

            sensors={sensors}

            collisionDetection={customCollisionDetection}

            onDragStart={handleDragStart}

            onDragOver={handleDragOver}

            onDragEnd={handleDragEnd}

          >

            {/* ─── Apple-Style Stage Cards — like Reminders' Smart Lists ─── */}

            <div className="stage-tabs-container" style={{

              display: 'grid',

              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',

              gap: '10px', marginBottom: '28px'}}>

              {(() => {

                const now = new Date();

                return columns.map(col => {

                  const colTasks = filteredTasks.filter((t: any) => t.status === col.id && !isArchiveReady(t));

                  const colCount = colTasks.length;

                  const overdueCount = colTasks.filter((t: any) =>

                    t.deliveryDate &&

                    new Date(t.deliveryDate) < now &&

                    t.status !== 'completed' && t.status !== 'delivered'

                  ).length;

                  const isActive = activeStage === col.id;

                  const isDropTarget = hoveredStage === col.id && !!activeId;



                  return (

                    <DroppableStageTab

                      key={col.id}

                      col={col}

                      isActive={isActive}

                      isDropTarget={isDropTarget}

                      activeId={activeId}

                      colCount={colCount}

                      overdueCount={overdueCount}

                      onClick={() => setActiveStage(col.id)}

                    />

                  );

                });

              })()}

            </div>







            {/* Stage View */}

            {(() => {

              const activeCol = columns.find(c => c.id === activeStage)!;



              // Base stage tasks

              let stageTasks = filteredTasks.filter((t: any) => t.status === activeStage && !isArchiveReady(t));



              // Payment filter

              if (stageFilter === 'paid') {

                stageTasks = stageTasks.filter((t: any) => {

                  const b = Number(t.budget) || 0;

                  const p = (t.payments || []).reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);

                  return b > 0 && p >= b;

                });

              } else if (stageFilter === 'unpaid') {

                stageTasks = stageTasks.filter((t: any) => {

                  const b = Number(t.budget) || 0;

                  const p = (t.payments || []).reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);

                  return b === 0 || p < b;

                });

              }



              // Worker filter

              if (workerFilter !== 'all') {

                stageTasks = stageTasks.filter((t: any) =>

                  t.composerId === workerFilter || t.hummingArtistId === workerFilter

                );

              }



              // Sort

              const sorted = [...stageTasks].sort((a: any, b: any) => {

                if (activeStage === 'recording') {

                  if (a.recordingDate && b.recordingDate) {

                    return new Date(a.recordingDate).getTime() - new Date(b.recordingDate).getTime();

                  }

                  if (a.recordingDate) return -1;

                  if (b.recordingDate) return 1;

                }



                if (stageSort === 'deadline') {

                  if (a.deliveryDate && b.deliveryDate) return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();

                  if (a.deliveryDate) return -1;

                  if (b.deliveryDate) return 1;

                  return 0;

                }

                if (stageSort === 'priority') {

                  // Overdue first, then due today, then due soon, then rest

                  const urgScore = (t: any) => {

                    if (!t.deliveryDate) return 99;

                    const d = Math.ceil((new Date(t.deliveryDate).getTime() - Date.now()) / 86400000);

                    if (d < 0) return 0;

                    if (d === 0) return 1;

                    if (d <= 3) return 2;

                    return 3;

                  };

                  return urgScore(a) - urgScore(b);

                }

                // dateAdded — newest first

                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

              });



              const totalBudget = stageTasks.reduce((s: number, t: any) => s + (Number(t.budget) || 0), 0);



              return (

                <AnimatePresence mode="wait">

                  <motion.div

                    key={activeStage}

                    initial={{ opacity: 0, y: 10 }}

                    animate={{ opacity: 1, y: 0 }}

                    exit={{ opacity: 0, y: -10 }}

                    transition={{ duration: 0.15, ease: 'easeOut' }}

                    style={{ paddingBottom: '60px' }}

                  >

                    {/* Stage Header */}

                    <div style={{

                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',

                      marginBottom: '16px', padding: '0 2px'}}>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>

                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>

                          {activeCol.title}

                        </h2>

                        <span style={{ fontSize: '14px', color: 'var(--text-tertiary)', fontWeight: '500' }}>

                          {sorted.length} of {stageTasks.length}

                          {userData?.role === 'admin' && totalBudget > 0 ? ` · ${currency}${totalBudget.toLocaleString()}` : ''}

                        </span>

                      </div>

                    </div>



                    {/* Sort + Filter Toolbar */}

                    <div className="sort-filter-toolbar custom-scrollbar" style={{

                      display: 'flex', alignItems: 'center', gap: '6px',

                      marginBottom: '14px',

                      padding: '6px 10px',

                      background: 'var(--card-bg)',

                      border: '1px solid var(--border-color)',

                      borderRadius: '11px',

                      overflowX: 'auto',

                      whiteSpace: 'nowrap'

                    }}>

                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Sort</span>

                      {(['deadline', 'priority', 'dateAdded'] as const).map(opt => (

                        <button

                          key={opt}

                          onClick={() => setStageSort(opt)}

                          style={{

                            padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer',

                            fontSize: '12px', fontWeight: stageSort === opt ? '600' : '400',

                            background: stageSort === opt ? 'var(--bg-color)' : 'transparent',

                            color: stageSort === opt ? 'var(--text-primary)' : 'var(--text-tertiary)',

                            boxShadow: stageSort === opt ? '0 1px 3px rgba(0,0,0,0.09)' : 'none',

                            transition: 'all 0.13s'}}

                        >

                          {opt === 'deadline' ? 'Deadline' : opt === 'priority' ? 'Priority' : 'Date Added'}

                        </button>

                      ))}

                      <div style={{ width: 1, height: 14, background: 'var(--border-color)', margin: '0 4px', flexShrink: 0 }} />

                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Filter</span>

                      {(['all', 'unpaid', 'paid'] as const).map(opt => (

                        <button

                          key={opt}

                          onClick={() => setStageFilter(opt)}

                          style={{

                            padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer',

                            fontSize: '12px', fontWeight: stageFilter === opt ? '600' : '400',

                            background: stageFilter === opt ? 'var(--bg-color)' : 'transparent',

                            color: stageFilter === opt

                              ? (opt === 'unpaid' ? 'var(--color-danger)' : opt === 'paid' ? 'var(--color-success)' : 'var(--text-primary)')

                              : 'var(--text-tertiary)',

                            boxShadow: stageFilter === opt ? '0 1px 3px rgba(0,0,0,0.09)' : 'none',

                            transition: 'all 0.13s'}}

                        >

                          {opt === 'all' ? 'All' : opt === 'paid' ? 'Paid' : 'Unpaid'}

                        </button>

                      ))}

                      {userData?.role === 'admin' && (composers.length > 0 || hummingArtists.length > 0) && (

                        <>

                          <div style={{ width: 1, height: 14, background: 'var(--border-color)', margin: '0 4px', flexShrink: 0 }} />

                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', padding: '0 4px' }}>Worker</span>

                          <button

                            onClick={() => setWorkerFilter('all')}

                            style={{ padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: workerFilter === 'all' ? '600' : '400', background: workerFilter === 'all' ? 'var(--bg-color)' : 'transparent', color: workerFilter === 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: workerFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.09)' : 'none', transition: 'all 0.13s' }}

                          >All</button>

                          {[...composers, ...hummingArtists].filter((u: any, i: number, arr: any[]) => arr.findIndex((x: any) => (x.uid || x.id) === (u.uid || u.id)) === i).map((u: any) => {

                            const uid = u.uid || u.id;

                            return (

                              <button key={uid}

                                onClick={() => setWorkerFilter(workerFilter === uid ? 'all' : uid)}

                                style={{ padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: workerFilter === uid ? '600' : '400', background: workerFilter === uid ? 'var(--bg-color)' : 'transparent', color: workerFilter === uid ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: workerFilter === uid ? '0 1px 3px rgba(0,0,0,0.09)' : 'none', transition: 'all 0.13s', whiteSpace: 'nowrap' }}

                              >{u.name || u.displayName || 'Worker'}</button>

                            );

                          })}

                        </>

                      )}

                      <div style={{ flex: 1 }} />

                      {stageFilter !== 'all' && (

                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingRight: '4px' }}>

                          {sorted.length} of {stageTasks.length}

                        </span>

                      )}

                      {userData?.role === 'admin' && (

                        <>

                          <button

                            onClick={() => { setIsSelectMode(v => !v); setSelectedTaskIds(new Set()); }}

                            style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${isSelectMode ? '#007AFF40' : 'transparent'}`, cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: isSelectMode ? 'rgba(0,122,255,0.1)' : 'transparent', color: isSelectMode ? 'var(--color-info)' : 'var(--text-tertiary)', transition: 'all 0.13s', flexShrink: 0 }}

                          >{isSelectMode ? 'Cancel' : 'Select'}</button>

                          <button

                            onClick={exportTasksCSV}

                            title="Export all projects as CSV"

                            style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: 'transparent', color: 'var(--text-tertiary)', transition: 'all 0.13s', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}

                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(52,199,89,0.1)'; e.currentTarget.style.color = 'var(--color-success)'; }}

                            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}

                          ><Download size={12} /> CSV</button>

                        </>

                      )}

                    </div>



                    {/* Bulk action bar */}

                    {isSelectMode && selectedTaskIds.size > 0 && (

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: 10, flexWrap: 'wrap' }}>

                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-info)', flexShrink: 0 }}>{selectedTaskIds.size} selected</span>

                        <div style={{ flex: 1 }} />

                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>MOVE TO</span>

                        {columns.filter(c => c.id !== activeStage).slice(0, 4).map(c => (

                          <button key={c.id} onClick={() => handleBulkMoveStage(c.id)} style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${c.color}30`, background: `${c.color}10`, color: c.color, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.title}</button>

                        ))}

                        <div style={{ width: 1, height: 14, background: 'var(--border-color)', flexShrink: 0 }} />

                        <button onClick={handleBulkDelete} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid rgba(255,59,48,0.3)', background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Delete</button>

                      </div>

                    )}



                    {/* Project Cards */}

                    {sorted.length === 0 ? (

                      <StageEmptyState

                        stageId={activeCol.id}

                        stageTitle={activeCol.title}

                        isFiltered={stageFilter !== 'all'}

                        filterLabel={stageFilter}

                        isAdmin={userData?.role === 'admin'}

                        onAdd={handleOpenModal}

                        onClearFilter={() => setStageFilter('all')}

                      />

                    ) : (

                      <>

                        {/* List Header for alignment (Matches Client Hub) */}

                        <div className="desktop-only" style={{

                          display: 'grid',

                          gridTemplateColumns: (userData?.role !== 'client' ? '16px ' : '') + `minmax(160px,2fr) minmax(140px,1fr) minmax(180px,1.4fr)`,

                          gap: '16px',

                          padding: '0 20px 8px 20px',

                          alignItems: 'center'

                        }}>

                          {userData?.role !== 'client' && <div></div>}

                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>Project Info</div>

                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', paddingLeft: '20px' }}>Status & Timers</div>

                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', paddingLeft: '20px' }}>Financials</div>

                        </div>



                        <SortableContext items={sorted.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                            {sorted.map((task: any, idx: number) => (

                              <motion.div

                                key={task.id}

                                initial={{ opacity: 0, y: 8 }}

                                animate={{ opacity: 1, y: 0 }}

                                transition={{ delay: idx * 0.03, duration: 0.22 }}

                              >

                                <SortableTask

                                  task={task}

                                  userRole={userData?.role}

                                  currency={currency}

                                  openDetails={isSelectMode ? toggleSelectTask : handleOpenDetails}

                                  navigate={navigate}

                                  isHighlighted={highlightedTaskId === task.id}

                                  isSelected={selectedTaskIds.has(task.id)}

                                  onToggleSelect={isSelectMode ? toggleSelectTask : undefined}

                                />

                              </motion.div>

                            ))}

                          </div>

                        </SortableContext>

                      </>

                    )}

                  </motion.div>

                </AnimatePresence>

              );

            })()}



            {/* DragOverlay renders the card being dragged, floating above everything */}

            <DragOverlay>

              {activeTask ? (

                <div style={{ cursor: 'grabbing', zIndex: 10000, pointerEvents: 'none' }}>

                  <SortableTask task={activeTask} isOverlay={true} userRole={userData?.role} currency={currency} openDetails={handleOpenDetails} navigate={navigate} />

                </div>

              ) : null}

            </DragOverlay>

          </DndContext>

        </>

      ) : (

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {(() => {

            const completedTasks = filteredTasks.filter((t: any) => isArchiveReady(t));



            if (completedTasks.length === 0) {

              return (

                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>

                  <CheckCircle2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />

                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>No archived projects yet</div>

                  <div style={{ fontSize: '14px', marginTop: '8px' }}>Projects archive after 7 days and full client payment clearance.</div>

                </div>

              );

            }



            // Group by Month and Year

            const grouped = completedTasks.reduce((acc: any, task: any) => {

              const dateObj = task.completedAt ? new Date(task.completedAt) : (task.createdAt ? new Date(task.createdAt) : new Date());

              const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              if (!acc[monthYear]) acc[monthYear] = [];

              acc[monthYear].push(task);

              return acc;

            }, {});



            // Sort groups by newest first

            const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());



            return sortedMonths.map(month => (

              <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>

                  {month} <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginLeft: '8px', fontWeight: '600' }}>({grouped[month].length} projects)</span>

                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                  {grouped[month]

                    .sort((a: any, b: any) => {

                      const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;

                      const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;

                      return db - da;

                    })

                    .map((task: any) => (

                      <SortableTask

                        key={task.id}

                        task={task}

                        userRole={userData?.role}

                        currency={currency}

                        openDetails={handleOpenDetails}

                        navigate={navigate}

                        isHighlighted={false}

                      />

                    ))}

                </div>

              </div>

            ));

          })()}

        </div>

      )}



      </div>{/* end desktop-only */}



      <ProjectSidePanel

        task={rawTasks.find((t: any) => t.id === sidePanelTask?.id) || sidePanelTask}

        isOpen={isSidePanelOpen}

        onClose={() => setIsSidePanelOpen(false)}

        onOpenFull={handleOpenFullDetails}

        onGenerateInvoice={(t) => { setSelectedTask(t); setShowInvoice(true); setIsSidePanelOpen(false); }}

        userRole={userData?.role}

        currency={currency}

        teams={teams}

      />



      <AddTaskModal

        isOpen={isModalOpen}

        onClose={() => setIsModalOpen(false)}

        newTask={newTask}

        setNewTask={setNewTask}

        handleAddTask={handleAddTask}

        isSubmitting={isSubmitting}

        currency={currency}

        clients={clients}

        composers={composers}

        hummingArtists={hummingArtists}

        rawTasks={rawTasks}

        clientSearch={clientSearch}

        setClientSearch={setClientSearch}

        isClientDropdownOpen={isClientDropdownOpen}

        setIsClientDropdownOpen={setIsClientDropdownOpen}

        isAddingNewClientDetails={isAddingNewClientDetails}

        setIsAddingNewClientDetails={setIsAddingNewClientDetails}

        setShowToast={setShowToast}

        isAdmin={userData?.role === 'admin' || userData?.role === 'composer'}

      />



      <TaskDetailsModal

        isDetailsOpen={isDetailsOpen}

        setIsDetailsOpen={setIsDetailsOpen}

        selectedTask={selectedTask}

        setSelectedTask={setSelectedTask}

        updateTask={updateTask}

        rawTasks={rawTasks}

        columns={columns}

        teams={teams}

        userData={userData}

        currency={currency}

        isConfirmingDelete={isConfirmingDelete}

        setIsConfirmingDelete={setIsConfirmingDelete}

        setShowToast={setShowToast}

        handleStatusChange={handleStatusChange}

        setShowInvoice={setShowInvoice}

        setEditTaskData={setEditTaskData}

        setIsEditOpen={setIsEditOpen}

        partialPaymentInput={partialPaymentInput}

        setPartialPaymentInput={setPartialPaymentInput}

        isSubmitting={isSubmitting}

        handlePartialPayment={handlePartialPayment}

        workerPaymentInput={workerPaymentInput}

        setWorkerPaymentInput={setWorkerPaymentInput}

        handleWorkerPayment={handleWorkerPayment}

        forcePay={forcePay}

        setForcePay={setForcePay}

        toggleMilestone={toggleMilestone}

        chatInput={chatInput}

        setChatInput={setChatInput}

        handleSendChat={handleSendChat}

        chatEndRef={chatEndRef}

        handleDeleteTask={handleDeleteTask}

      />













      <EditProjectModal

        isEditOpen={isEditOpen}

        setIsEditOpen={setIsEditOpen}

        editTaskData={editTaskData}

        setEditTaskData={setEditTaskData}

        handleEditTask={handleEditTask}

        columns={columns}

        composers={composers}

        hummingArtists={hummingArtists}

        milestoneInput={milestoneInput}

        setMilestoneInput={setMilestoneInput}

        isAdmin={userData?.role === 'admin' || userData?.role === 'composer'}

        clients={clients}

      />



      <AnimatePresence>

        {showInvoice && (

          <InvoiceModal task={selectedTask} onClose={() => setShowInvoice(false)} />

        )}

      </AnimatePresence>

      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} onUndo={pendingDeleteTask ? () => { clearTimeout(pendingDeleteTask.timer); setPendingDeleteTask(null); setShowToast(false); fireToast(`"${pendingDeleteTask.task.title}" restored`); } : undefined} />}

    </div>



  );

}



