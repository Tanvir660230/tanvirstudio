import { useMemo, useState, useEffect } from 'react';

import { calcComposerComm, calcHummingComm, calcTaskPaid, paymentRatio } from '../utils/commissionUtils';

import { Plus, FileText, Minus, PackageOpen, CalendarCheck, X, Check, Star, Download } from 'lucide-react';

import { Toast } from '../components/Toast';

import { useNavigate } from 'react-router-dom';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';

import { useSettings } from '../contexts/SettingsContext';

import { useData } from '../contexts/DataContext';

import { useAuth } from '../contexts/AuthContext';

import { useGlobalStats } from '../hooks/useGlobalStats';

import { useDeadlineAlerts } from '../hooks/useDeadlineAlerts';

import { KPICards } from '../components/dashboard/KPICards';

import { PageSkeleton } from '../components/SkeletonLoader';

import { PriorityTasks } from '../components/dashboard/PriorityTasks';

import { MonthlyChart } from '../components/dashboard/MonthlyChart';

import { DashboardAlerts } from '../components/dashboard/DashboardAlerts';

import { sendOrderAcceptedToClient, sendOrderDeclinedToClient } from '../utils/emailApi';











export function Dashboard() {

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {

    const handler = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);

  }, []);



  const { userData } = useAuth();

  const { settings } = useSettings();

  const { currency, notifyOverdue, notifyUpcoming } = settings;

  const navigate = useNavigate();

  const go = (path: string, state?: any) => { navigate(path, state); window.scrollTo(0, 0); };



  const { tasks, tasksLoading, transactions, txLoading, clients, clientsLoading, users, updateTask, addWebsiteTestimonial } = useData();



  useDeadlineAlerts(tasks, userData?.uid, userData?.role === 'admin' && !tasksLoading);



  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [acceptDate, setAcceptDate] = useState('');

  const [toastMsg, setToastMsg] = useState('');

  const [toastType, setToastType] = useState<'success'|'error'|'warning'|'info'>('success');

  const [showToast, setShowToast] = useState(false);

  const fireToast = (msg: string, type: 'success'|'error'|'warning'|'info' = 'success') => { setToastMsg(msg); setToastType(type); setShowToast(true); };



  // Review modal state

  const [reviewOrder, setReviewOrder] = useState<any>(null);

  const [reviewRating, setReviewRating] = useState(5);

  const [reviewHover, setReviewHover] = useState(0);

  const [reviewText, setReviewText] = useState('');

  const [reviewSubmitting, setReviewSubmitting] = useState(false);



  const isAdmin  = userData?.role === 'admin';
  const isWorker = userData?.role === 'composer' || userData?.role === 'humming_artist';
  const isClient = userData?.role === 'client';

  // Loading skeleton logic has been moved to the bottom, after all hooks, to prevent React Hook errors.

  // â”€â”€ Pre-aggregated stats (admin only — null = doc not yet initialised) â”€â”€â”€â”€â”€â”€â”€

  const { stats: globalStats, currentBalance: statsBalance, monthIncome } = useGlobalStats(isAdmin);

  const nowDate      = useMemo(() => new Date(), []);

  const thisMonthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

  const prevM        = nowDate.getMonth() === 0 ? 11 : nowDate.getMonth() - 1;

  const prevY        = nowDate.getMonth() === 0 ? nowDate.getFullYear() - 1 : nowDate.getFullYear();

  const lastMonthKey = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;

  const statsThisMonth = monthIncome(thisMonthKey);

  const statsLastMonth = monthIncome(lastMonthKey);



  // â”€â”€ Financials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Use pre-aggregated stats when available (correct for any number of transactions).

  // Fall back to client-side scan when stats doc not yet initialised (first run).

  const { totalIncome, currentBalance, lastMonthIncome } = useMemo(() => {

    if (globalStats !== null) {

      return { totalIncome: statsThisMonth, currentBalance: statsBalance, lastMonthIncome: statsLastMonth };

    }

    let thisMonthIncome = 0;

    let lastMonthIncomeVal = 0;

    let allTimeIncome = 0;

    let allTimeExpenses = 0;

    transactions.forEach(t => {

      if (t.status === 'Completed') {

        const d = new Date(t.createdAt || t.date || 0);

        if (t.type === 'in') {

          allTimeIncome += Number(t.amount || 0);

          if (d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear()) thisMonthIncome += Number(t.amount || 0);

          if (d.getMonth() === prevM && d.getFullYear() === prevY) lastMonthIncomeVal += Number(t.amount || 0);

        }

        if (t.type === 'out') allTimeExpenses += Number(t.amount || 0);

      }

    });

    return { totalIncome: thisMonthIncome, currentBalance: allTimeIncome - allTimeExpenses, lastMonthIncome: lastMonthIncomeVal };

  }, [transactions, globalStats, statsBalance, statsThisMonth, statsLastMonth, prevM, prevY, nowDate]);



  // â”€â”€ Role-filtered tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const filteredTasks = useMemo(() => tasks.filter(t => {

    if (userData?.role === 'client')        return t.clientEmail === userData.email || t.client === userData.name;

    if (userData?.role === 'humming_artist') return t.hummingArtistId === userData.uid;

    if (userData?.role === 'composer')       return t.composerId === userData.uid;

    return true;

  }), [tasks, userData]);



  const { activeProjects, avgProgress } = useMemo(() => {

    const active = filteredTasks.filter(t => t.status !== 'completed');

    const avg    = filteredTasks.length > 0

      ? Math.round(filteredTasks.reduce((s, t) => s + (Number(t.progress) || 0), 0) / filteredTasks.length)

      : 0;

    return { activeProjects: active.length, avgProgress: avg };

  }, [filteredTasks]);



  // â”€â”€ Worker financials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { workerEarned, workerAvailable, workerPendingClient, workerPaid, workerDue } = useMemo(() => {

    let earned = 0, available = 0, paid = 0;

    if (userData) {

      tasks.forEach(t => {

        const ratio = paymentRatio(t);

        if (t.composerId === userData.uid && ['revision','delivered','completed'].includes(t.status)) {

          const c = calcComposerComm(t, settings.defaultComposerComm);

          earned += c; available += c * ratio; paid += Number(t.composerPaid||0);

        }

        if (t.hummingArtistId === userData.uid && ['composition','revision','delivered','completed'].includes(t.status)) {

          const c = calcHummingComm(t, settings.defaultHummingComm);

          earned += c; available += c * ratio; paid += Number(t.hummingArtistPaid||0);

        }

      });

    }

    return { workerEarned: earned, workerAvailable: available, workerPendingClient: earned - available, workerPaid: paid, workerDue: available - paid };

  }, [tasks, userData, settings]);



  // â”€â”€ Client financials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { clientPaid, clientDue } = useMemo(() => {

    let paid = 0, due = 0;

    if (isClient && userData) filteredTasks.forEach(t => {

      const budget = Number(t.budget) || 0;

      const tp = (t.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      paid += tp; if (budget > tp) due += budget - tp;

    });

    return { clientPaid: paid, clientDue: due };

  }, [filteredTasks, isClient, userData]);



  // â”€â”€ Admin: global totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { totalClientDues, totalWorkerLiability } = useMemo(() => {

    let clientDues = 0, workerLiability = 0;

    if (isAdmin) tasks.forEach(t => {

      const tp    = calcTaskPaid(t);

      const ratio = paymentRatio(t);

      if ((Number(t.budget) || 0) > tp) clientDues += (Number(t.budget) || 0) - tp;

      if (t.composerId && ['revision','delivered','completed'].includes(t.status)) {

        const due = calcComposerComm(t, settings.defaultComposerComm) * ratio - (Number(t.composerPaid)||0);

        if (due > 0) workerLiability += due;

      }

      if (t.needsHumming && t.hummingArtistId && ['composition','revision','delivered','completed'].includes(t.status)) {

        const due = calcHummingComm(t, settings.defaultHummingComm) * ratio - (Number(t.hummingArtistPaid)||0);

        if (due > 0) workerLiability += due;

      }

    });

    return { totalClientDues: clientDues, totalWorkerLiability: workerLiability };

  }, [tasks, isAdmin, settings]);



  // â”€â”€ Admin: pipeline stage counts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const stagePipeline = useMemo(() => {

    const stages = [

      { key: 'new',         label: 'New',         color: 'var(--color-info)' },

      { key: 'humming',     label: 'Humming',      color: 'var(--accent-purple)' },

      { key: 'composition', label: 'Composition',  color: 'var(--accent-indigo)' },

      { key: 'revision',    label: 'Revision',     color: 'var(--color-warning)' },

      { key: 'delivered',   label: 'Delivered',    color: 'var(--color-success)' },

    ];

    const active = tasks.filter(t => t.status !== 'completed');

    const counts = stages.map(s => ({

      ...s,

      count: active.filter(t => ((t.status === 'pending' || !t.status) ? 'new' : t.status) === s.key).length,

    }));

    const max = Math.max(...counts.map(s => s.count), 1);

    return counts.map(s => ({ ...s, pct: Math.round((s.count / max) * 100) }));

  }, [tasks]);



  // â”€â”€ Today's sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const todaySessions = useMemo(() => {

    const todayStr = new Date().toISOString().slice(0, 10);

    return tasks

      .filter(t => t.recordingDate && t.recordingDate.startsWith(todayStr))

      .sort((a, b) => new Date(a.recordingDate || 0).getTime() - new Date(b.recordingDate || 0).getTime());

  }, [tasks]);



  // â”€â”€ Admin: overdue + upcoming â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const overdueTasks = useMemo(() => {

    const today = new Date(); today.setHours(0,0,0,0);

    return tasks

      .filter(t => !['completed','delivered'].includes(t.status) && t.deliveryDate && new Date(t.deliveryDate) < today)

      .sort((a, b) => new Date(a.deliveryDate || 0).getTime() - new Date(b.deliveryDate || 0).getTime())

      .slice(0, 6);

  }, [tasks]);



  const upcomingDeadlines = useMemo(() => {

    const today = new Date(); today.setHours(0,0,0,0);

    const in7   = new Date(today); in7.setDate(in7.getDate() + 7);

    return tasks

      .filter(t => !['completed','delivered'].includes(t.status) && t.deliveryDate && new Date(t.deliveryDate) >= today && new Date(t.deliveryDate) <= in7)

      .sort((a, b) => new Date(a.deliveryDate || 0).getTime() - new Date(b.deliveryDate || 0).getTime())

      .slice(0, 6);

  }, [tasks]);



  // â”€â”€ Admin: per-client dues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const clientDuesList = useMemo(() => {

    const map: Record<string, { name: string; due: number; count: number }> = {};

    tasks.forEach(t => {

      const budget = Number(t.budget) || 0;

      const paid   = (t.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      const due    = budget - paid;

      if (due > 0 && t.client) {

        if (!map[t.client]) map[t.client] = { name: t.client, due: 0, count: 0 };

        map[t.client].due += due; map[t.client].count += 1;

      }

    });

    return Object.values(map).sort((a, b) => b.due - a.due).slice(0, 6);

  }, [tasks]);



  // â”€â”€ Admin: per-worker dues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const workerDuesList = useMemo(() => {

    const map: Record<string, { name: string; due: number; role: string }> = {};

    tasks.forEach(t => {

      const ratio = paymentRatio(t);

      if (t.composerId && ['revision','delivered','completed'].includes(t.status)) {

        const due = calcComposerComm(t, settings.defaultComposerComm) * ratio - (Number(t.composerPaid)||0);

        if (due > 0) {

          const name = users.find(u => u.id === t.composerId)?.name || 'Composer';

          if (!map[t.composerId]) map[t.composerId] = { name, due: 0, role: 'Composer' };

          map[t.composerId].due += due;

        }

      }

      if (t.needsHumming && t.hummingArtistId && ['composition','revision','delivered','completed'].includes(t.status)) {

        const due = calcHummingComm(t, settings.defaultHummingComm) * ratio - (Number(t.hummingArtistPaid)||0);

        if (due > 0) {

          const name = users.find(u => u.id === t.hummingArtistId)?.name || 'Artist';

          if (!map[t.hummingArtistId]) map[t.hummingArtistId] = { name, due: 0, role: 'Humming Artist' };

          map[t.hummingArtistId].due += due;

        }

      }

    });

    return Object.values(map).sort((a, b) => b.due - a.due);

  }, [tasks, users, settings]);



  // â”€â”€ Admin: all-time company financials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { allTimeGrossRevenue } = useMemo(() => {
    let income = 0;
    transactions.forEach(t => {
      if (t.status === 'Completed') {
        if (t.type === 'in')  income   += Number(t.amount || 0);
      }
    });
    return { allTimeGrossRevenue: income };

  }, [transactions]);



  // â”€â”€ Admin: Top Clients by Revenue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const topClientsAllTime = useMemo(() => {

    const map: Record<string, { name: string; revenue: number; count: number }> = {};

    tasks.forEach(t => {

      const budget = Number(t.budget) || 0;

      if (t.client && budget > 0) {

        if (!map[t.client]) map[t.client] = { name: t.client, revenue: 0, count: 0 };

        map[t.client].revenue += budget;

        map[t.client].count += 1;

      }

    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  }, [tasks]);



  // â”€â”€ Admin: Worker Utilization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const workerUtilization = useMemo(() => {

    const workers = users.filter((u: any) => u.role === 'composer' || u.role === 'humming_artist');

    return workers.map((w: any) => {

      const active = tasks.filter((t: any) =>

        !['completed'].includes(t.status) &&

        (t.composerId === w.uid || t.composerId === w.id || t.hummingArtistId === w.uid || t.hummingArtistId === w.id)

      );

      const overdue = active.filter((t: any) => {

        const today = new Date(); today.setHours(0,0,0,0);

        return t.deliveryDate && new Date(t.deliveryDate) < today;

      });

      return { id: w.uid || w.id, name: w.name || w.displayName || 'Worker', role: w.role, active: active.length, overdue: overdue.length };

    }).sort((a, b) => b.active - a.active);

  }, [users, tasks]);



  // â”€â”€ Admin: Recent Cashflow Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const recentTransactions = useMemo(() => {

    return [...transactions]

      .filter(t => t.status === 'Completed')

      .sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime())

      .slice(0, 6);

  }, [transactions]);



  // â”€â”€ New orders from homepage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const newOrders = useMemo(() =>

    tasks

      .filter((t: any) => t.publicOrder && t.status === 'pending')

      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),

  [tasks]);



  // â”€â”€ Client: my submitted orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const myOrders = useMemo(() =>

    isClient

      ? tasks

          .filter((t: any) => t.publicOrder && t.clientEmail && userData?.email &&

            t.clientEmail.toLowerCase() === userData.email.toLowerCase())

          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      : [],

  [tasks, isClient, userData?.email]);



  // â”€â”€ Chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const toJSDate = (val: any): Date => {

    if (!val) return new Date(0);

    if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();

    if (val instanceof Date) return val;

    const d = new Date(val); return isNaN(d.getTime()) ? new Date(0) : d;

  };



  const chartData = useMemo(() => {

    const last6 = Array.from({ length: 6 }, (_, i) => {

      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));

      return d.toLocaleString('en-US', { month: 'short' });

    });

    return last6.map(month => {

      if (isWorker) {

        let monthEarned = 0, count = 0;

        filteredTasks.filter(t => toJSDate(t.createdAt).toLocaleString('en-US', { month: 'short' }) === month).forEach(t => {

          const ratio = paymentRatio(t);

          if (userData?.role === 'composer' && t.composerId === userData?.uid && ['revision','delivered','completed'].includes(t.status)) {

            monthEarned += calcComposerComm(t, settings.defaultComposerComm) * ratio; count++;

          }

          if (userData?.role === 'humming_artist' && t.hummingArtistId === userData?.uid && ['composition','revision','delivered','completed'].includes(t.status)) {

            monthEarned += calcHummingComm(t, settings.defaultHummingComm) * ratio; count++;

          }

        });

        return { name: month, income: monthEarned, tasks: count };

      } else if (isClient) {

        let spent = 0;

        const mt = filteredTasks.filter(t => toJSDate(t.createdAt).toLocaleString('en-US', { month: 'short' }) === month);

        mt.forEach(t => { spent += (t.payments||[]).reduce((s: number, p: any) => s + (Number(p.amount)||0), 0); });

        return { name: month, spent, tasks: mt.length };

      } else {

        const mt = transactions.filter(t => toJSDate(t.createdAt || t.date).toLocaleString('en-US', { month: 'short' }) === month);

        return {

          name: month,

          income:  mt.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount||0), 0),

          expense: mt.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount||0), 0),

        };

      }

    });

  }, [filteredTasks, transactions, isWorker, isClient, userData, settings]);



  const priorityTasks = useMemo(() => filteredTasks

    .filter(t => t.status !== 'completed' && t.status !== 'delivered')

    .sort((a, b) => { if (!a.deliveryDate) return 1; if (!b.deliveryDate) return -1; return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(); })

    .slice(0, 5), [filteredTasks]);



  // Removed loading skeleton



  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  //  ADMIN DASHBOARD

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  if (isAdmin) {

    const monthlyGoal = settings.monthlyGoal || 0;

    const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((totalIncome / monthlyGoal) * 100)) : 0;



    return (

      <div className="admin-dashboard" style={{animation: 'fadeIn 0.4s ease-out' }}>



        {/* â”€â”€ 1. Welcome header â”€â”€ */}

        <div className="dash-welcome-banner" style={{ marginBottom: 28, padding: '28px 36px', background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(196,154,82,0.05) 100%)', borderRadius: 20, border: '1px solid rgba(196,154,82,0.2)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circle */}
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,154,82,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ flex: 1, minWidth: 0 }}>

            <p style={{ fontSize: 11, color: 'var(--accent-gold)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.9 }}>Welcome back</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

              <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>

                {userData?.name?.trim().split(' ')[0] || 'Tanvir'}

              </h1>

              {notifyOverdue !== false && overdueTasks.length > 0 && (

                <span onClick={() => go('/work')} style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--accent-red)', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.12)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>

                  {overdueTasks.length} overdue

                </span>

              )}

            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0', fontWeight: 400 }}>

              <span style={{ color: currentBalance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)', fontWeight: 600 }}>{currency}{currentBalance.toLocaleString()}</span> cash balance

            </p>

          </div>

          <div className="dash-welcome-actions" style={{ display: 'flex', gap: 10, flexShrink: 0 }}>

            <button onClick={() => go('/work', { state: { openNewProject: true } })} className="btn btn-primary" style={{ fontSize: 13 }}><Plus size={14} /> New project</button>

            <button onClick={() => go('/finance')} className="btn btn-secondary" style={{ fontSize: 13 }}><FileText size={14} /> Finance</button>

          </div>

        </div>



        {/* â”€â”€ 2. New Orders â”€â”€ */}

        <DashboardAlerts

          isAdmin={isAdmin}

          isWorker={isWorker}

          totalClientDues={totalClientDues}

          totalWorkerLiability={totalWorkerLiability}

          workerDue={workerDue}

          currency={currency}

        />



        <div className="admin-action-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 28 }}>

          {[

            {

              label: 'Review orders',

              value: newOrders.length,

              detail: newOrders.length > 0 ? 'Waiting for approval' : 'Inbox clear',

              icon: <PackageOpen size={16} />,

              color: 'var(--accent-gold)',

              bg: 'rgba(196,154,82,0.08)',

              path: '/new-orders',

            },

            {

              label: 'Overdue',

              value: overdueTasks.length,

              detail: overdueTasks.length > 0 ? 'Need attention' : 'No late work',

              icon: <X size={16} />,

              color: 'var(--color-danger)',

              bg: 'rgba(239,68,68,0.08)',

              path: '/work',

            },

            {

              label: 'Due this week',

              value: upcomingDeadlines.length,

              detail: todaySessions.length > 0 ? `${todaySessions.length} session${todaySessions.length > 1 ? 's' : ''} today` : 'Schedule is calm',

              icon: <CalendarCheck size={16} />,

              color: 'var(--color-info)',

              bg: 'rgba(59,130,246,0.08)',

              path: '/calendar',

            },

            {

              label: 'Worker payouts',

              value: `${currency}${Math.round(totalWorkerLiability).toLocaleString()}`,

              detail: workerDuesList.length > 0 ? `${workerDuesList.length} people pending` : 'All paid',

              icon: <FileText size={16} />,

              color: 'var(--accent-purple)',

              bg: 'rgba(139,92,246,0.08)',

              path: '/finance',

            },

          ].map(item => (

            <button

              key={item.label}

              type="button"

              onClick={() => go(item.path)}

              className="admin-action-tile"

              style={{

                display: 'flex',

                alignItems: 'flex-start',

                gap: 14,

                minWidth: 0,

                padding: '18px 16px',

                borderRadius: 16,

                border: '1px solid var(--border-color)',

                background: 'var(--card-bg)',

                color: 'var(--text-primary)',

                cursor: 'pointer',

                textAlign: 'left',

                fontFamily: 'inherit',

                boxShadow: 'var(--shadow-xs)',

              }}

            >

              <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.color, background: item.bg, marginTop: 1 }}>

                {item.icon}

              </span>

              <span style={{ minWidth: 0, flex: 1 }}>

                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</span>

                <span className="tile-value" style={{ display: 'block', marginTop: 2, fontSize: 18, fontWeight: 800, color: item.color, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>

                <span style={{ display: 'block', marginTop: 3, fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</span>

              </span>

            </button>

          ))}

        </div>



        {newOrders.length > 0 && (

          <div className="card" style={{ marginBottom: 32, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(196,154,82,0.2)', background: 'linear-gradient(180deg, rgba(196,154,82,0.05) 0%, rgba(196,154,82,0.01) 100%)', boxShadow: 'none' }}>

            <div className="admin-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(196,154,82,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                <PackageOpen size={16} color="var(--accent-gold)" />

                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>New Orders</h3>

                <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--accent-gold)', color: 'var(--card-bg)', padding: '2px 8px', borderRadius: 999 }}>{newOrders.length}</span>

              </div>

              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Accept to move to pipeline / set a record date</span>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {newOrders.slice(0, 2).map((order: any, idx: number) => {

                const visibleCount = Math.min(newOrders.length, 2);

                const isAccepting = acceptingId === order.id;

                const pkgLine = order.description?.split('\n')[0]?.replace('Package: ', '') || order.packageName || '-';

                const notesRaw = order.description?.split('Notes:\n')[1] || '';

                return (

                  <div key={order.id} className="admin-order-row" style={{ padding: '16px 18px', borderBottom: idx < visibleCount - 1 ? '1px solid var(--border-color)' : 'none' }}>

                    <div className="admin-order-main" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                      {/* Avatar */}

                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,154,82,0.15)', border: '1px solid rgba(196,154,82,0.25)', color: 'var(--accent-gold)', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                        {(order.client || '?').slice(0, 2).toUpperCase()}

                      </div>

                      {/* Info */}

                      <div style={{ flex: 1, minWidth: 0 }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>

                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{order.client || 'Unknown'}</span>

                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.2)', padding: '2px 8px', borderRadius: 6 }}>{pkgLine}</span>

                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{settings.currency}{(order.budget || 0).toLocaleString()}</span>

                        </div>

                        <div className="admin-order-meta" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>

                          <strong>{order.songName || order.title?.replace(/^TSN-- \w+\s*-\s*/, '') || '-'}</strong>

                          {order.clientPhone && <span style={{ color: 'var(--text-tertiary)', marginLeft: 10 }}>Phone: {order.clientPhone}</span>}

                          {order.clientEmail && <span style={{ color: 'var(--text-tertiary)', marginLeft: 10 }}>Email: {order.clientEmail}</span>}

                        </div>

                        {notesRaw && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>Notes: {notesRaw}</div>}

                      </div>

                      {/* Actions */}

                      {!isAccepting && (

                        <div className="admin-order-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>

                          <button onClick={async () => { try { await updateTask(order.id, { status: 'declined', declinedAt: new Date().toISOString() }); if (order.clientEmail) sendOrderDeclinedToClient(order.clientEmail, order.client || '', order.packageName || '', order.songName || '').catch(() => {}); } catch { fireToast('Failed to decline order. Please retry.', 'error'); } }} style={{ height: 36, padding: '0 16px', borderRadius: 12, border: 'none', background: 'rgba(255,59,48,0.1)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>

                            <X size={14} /> Decline

                          </button>

                          <button onClick={() => { setAcceptingId(order.id); setAcceptDate(''); }} style={{ height: 36, padding: '0 20px', borderRadius: 12, border: 'none', background: 'var(--accent-gold)', color: 'var(--card-bg)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'none' }}>

                            <CalendarCheck size={14} /> Accept

                          </button>

                        </div>

                      )}

                    </div>



                    {/* Inline date picker on Accept */}

                    {isAccepting && (

                      <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--bg-color)', border: '1px solid rgba(196,154,82,0.3)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>

                        <CalendarCheck size={15} color="var(--accent-gold)" style={{ flexShrink: 0 }} />

                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Session date <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></span>

                        <input

                          type="datetime-local"

                          value={acceptDate}

                          onChange={e => setAcceptDate(e.target.value)}

                          style={{ flex: 1, minWidth: 180, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}

                        />

                        <button

                          onClick={async () => {

                            try {

                              await updateTask(order.id, { status: 'new', recordingDate: acceptDate });

                              if (order.clientEmail) sendOrderAcceptedToClient(order.clientEmail, order.client || '', order.packageName || '', order.songName || '', acceptDate).catch(() => {});

                              setAcceptingId(null);

                              setAcceptDate('');

                              fireToast('Order accepted!');

                            } catch { fireToast('Failed to accept order. Please retry.', 'error'); }

                          }}

                          style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: 'var(--card-bg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: 'none' }}>

                          <Check size={14} /> Confirm

                        </button>

                        <button onClick={() => { setAcceptingId(null); setAcceptDate(''); }} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>

                          Cancel

                        </button>

                      </div>

                    )}

                  </div>

                );

              })}

              <div

                onClick={() => go('/new-orders')}

                style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', textAlign: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--accent-gold)' }}

                className="hover-bg-light"

              >

                {newOrders.length > 2 ? `See all ${newOrders.length} orders ->` : 'Manage Orders ->'}

              </div>

            </div>

          </div>

        )}



        {/* â”€â”€ 3. KPI Stats â”€â”€ */}

        <div className="card admin-kpi-panel" style={{ marginBottom: 28, borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>

          {monthlyGoal > 0 ? (

            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>

                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Monthly goal</span>

                <span style={{ fontSize: 12, fontWeight: 600, color: goalPct >= 100 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{currency}{totalIncome.toLocaleString()} / {currency}{monthlyGoal.toLocaleString()} / {goalPct}%</span>

              </div>

              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>

                <div style={{ height: '100%', width: `${goalPct}%`, background: goalPct >= 100 ? 'var(--accent-green)' : goalPct >= 70 ? 'var(--accent-orange)' : 'var(--accent-blue)', borderRadius: 999, transition: 'width 0.6s ease' }} />

              </div>

            </div>

          ) : (

            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>

              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No monthly goal set</span>

              <a href="/settings" style={{ fontSize: 12, color: 'var(--accent-blue)', textDecoration: 'none' }}>set one in Settings</a>

            </div>

          )}

          <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>

            {([

              { label: 'Cash balance',    value: currentBalance,       sub: `All-time: ${currency}${allTimeGrossRevenue.toLocaleString()}`, color: 'var(--color-info)' },

              { label: `${new Date().toLocaleString('en-US', { month: 'long' })} income`, value: totalIncome, trend: lastMonthIncome > 0 ? Math.round(((totalIncome - lastMonthIncome) / lastMonthIncome) * 100) : null, color: 'var(--color-success)' },

              { label: 'Owed by clients', value: totalClientDues,      color: 'var(--color-warning)' },

              { label: 'Owed to workers', value: totalWorkerLiability, color: 'var(--accent-purple)' },

            ] as Array<{ label: string; value: number; color: string; sub?: string; trend?: number | null }>).map((item, i) => (

              <div key={i} style={{

                padding: '22px 20px',

                borderRight:  i % 2 === 0 ? '1px solid var(--border-color)' : 'none',

                borderBottom: i < 2       ? '1px solid var(--border-color)' : 'none'}}>

                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{item.label}</div>

                <div style={{ fontSize: 26, fontWeight: 800, color: item.color, letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{currency}{item.value.toLocaleString()}</div>

                {item.trend !== null && item.trend !== undefined && (

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>

                    <span style={{ fontSize: 12, fontWeight: 700, color: item.trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>

                      {item.trend >= 0 ? "↑" : "↓"} {Math.abs(item.trend)}%

                    </span>

                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>vs last month</span>

                  </div>

                )}

                {item.sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 500 }}>{item.sub}</div>}

              </div>

            ))}

          </div>

        </div>



        {/* â”€â”€ 4. Pipeline â”€â”€ */}

        <div className="card" style={{ marginBottom: 32, padding: '32px', borderRadius: 24, boxShadow: 'none', border: '1px solid rgba(128,128,128,0.15)', background: 'var(--card-bg)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Active pipeline</h3>

              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1 }}>

                {stagePipeline.reduce((s, st) => s + st.count, 0)} projects

              </span>

            </div>

            <button onClick={() => go('/work')} className="btn" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontWeight: 500 }}>Open</button>

          </div>

          <div className="dash-pipeline-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 10 }}>

            {stagePipeline.map(stage => (

              <div

                key={stage.label}

                onClick={() => go('/work')}

                style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--bg-color)', borderRadius: 16, border: '1px solid rgba(128,128,128,0.15)', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'none' }}

                className="hover-lift-2"

              >

                <div style={{ fontSize: 28, fontWeight: 800, color: stage.color, lineHeight: 1, letterSpacing: '-0.5px' }}>{stage.count}</div>

                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, fontWeight: 600 }}>{stage.label}</div>

              </div>

            ))}

          </div>

        </div>



        {/* â”€â”€ 4. Today's Sessions â”€â”€ */}

        {todaySessions.length > 0 && (

          <div className="card" style={{ marginBottom: 32, padding: '24px 32px', borderRadius: 24, boxShadow: 'none', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>

              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>

                Today's sessions

                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '2px 8px', borderRadius: 999 }}>{todaySessions.length}</span>

              </h3>

              <button onClick={() => go('/calendar')} className="btn" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontWeight: 500 }}>Calendar</button>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {todaySessions.map(t => {

                const timeStr = t.recordingDate?.includes('T')

                  ? new Date(t.recordingDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

                  : null;

                const durationMin = t.recordingDuration || 60;

                const durStr = durationMin < 60 ? `${durationMin}m` : `${durationMin / 60}h`;

                return (

                  <div key={t.id} onClick={() => go('/work', { state: { openTaskId: t.id } })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)', cursor: 'pointer', transition: 'background 0.15s' }}

                    className="hover-bg-red"

                  >

                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,59,48,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--color-danger)', flexShrink: 0 }}>REC</div>

                    <div style={{ flex: 1, minWidth: 0 }}>

                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>

                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t.client || 'No client'}{timeStr ? ` / ${timeStr}` : ''}</div>

                    </div>

                    {timeStr && (

                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>

                        {timeStr} / {durStr}

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          </div>

        )}



        {/* â”€â”€ 5. Overdue + Upcoming â”€â”€ */}

        {(notifyOverdue !== false || notifyUpcoming !== false) && (overdueTasks.length > 0 || upcomingDeadlines.length > 0) && (

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="mf-dash-grid">

            <div className="card" style={{ padding: 20 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Overdue</h3>

                  {overdueTasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '2px 7px', borderRadius: 999 }}>{overdueTasks.length}</span>}

                </div>

                <button onClick={() => go('/work')} className="btn" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,59,48,0.2)', color: 'var(--color-danger)', fontWeight: 600 }}>Fix now</button>

              </div>

              {overdueTasks.length > 0 ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {overdueTasks.map(t => {

                    const daysLate = Math.ceil((new Date().getTime() - new Date(t.deliveryDate || 0).getTime()) / 86400000);

                    return (

                      <div key={t.id} onClick={() => go('/work', { state: { openTaskId: t.id } })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 10, background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.12)', cursor: 'pointer' }}>

                        <div style={{ minWidth: 0 }}>

                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>

                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{t.client}</div>

                        </div>

                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.08)', padding: '3px 8px', borderRadius: 6, flexShrink: 0, marginLeft: 10 }}>{daysLate}d late</span>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No overdue projects</div>

              )}

            </div>



            <div className="card" style={{ padding: 20 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>

                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Due this week</h3>

                <button onClick={() => go('/calendar')} className="btn" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontWeight: 500 }}>Calendar</button>

              </div>

              {upcomingDeadlines.length > 0 ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {upcomingDeadlines.map(t => {

                    const daysLeft = Math.ceil((new Date(t.deliveryDate || 0).getTime() - new Date().getTime()) / 86400000);

                    const isToday = daysLeft <= 0;

                    return (

                      <div key={t.id} onClick={() => go('/work', { state: { openTaskId: t.id } })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 10, background: isToday ? 'rgba(255,149,0,0.06)' : 'var(--bg-color)', border: `1px solid ${isToday ? 'rgba(255,149,0,0.2)' : 'var(--border-color)'}`, cursor: 'pointer' }}>

                        <div style={{ minWidth: 0 }}>

                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>

                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{t.client}</div>

                        </div>

                        <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--color-warning)' : 'var(--accent-blue)', background: isToday ? 'rgba(255,149,0,0.1)' : 'rgba(0,122,255,0.08)', padding: '3px 8px', borderRadius: 6, flexShrink: 0, marginLeft: 10 }}>

                          {isToday ? 'Today' : `${daysLeft}d`}

                        </span>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Clear this week</div>

              )}

            </div>

          </div>

        )}



        {/* â”€â”€ 5. Business Analytics Hub â”€â”€ */}

        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 24, marginBottom: 24 }} className="mf-dash-grid">

           

           {/* Top Clients by Revenue */}

           <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

                <div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Top clients</h3>

                </div>

                <button onClick={() => go('/clients')} className="btn" style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontWeight: 500 }}>View all</button>

              </div>



              {topClientsAllTime.length > 0 ? (

                <div className="mf-pie-container" style={{ display: 'grid', gap: 32, flex: 1, alignItems: 'center', width: '100%' }}>

                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 220, height: 220 }}>

                      <PieChart width={220} height={220}>
                        <defs>
                          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>


                        <Tooltip 

                          formatter={(value: any) => [`${currency}${Number(value).toLocaleString()}`, 'Revenue']}

                          contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: 'none', padding: '12px 16px', fontWeight: '700' }}

                          itemStyle={{ color: 'var(--text-primary)' }}

                        />

                        <Pie style={{ filter: "drop-shadow(0 0 12px rgba(196,154,82,0.4))" }}

                          data={topClientsAllTime}

                          dataKey="revenue"

                          nameKey="name"

                          cx="50%"

                          cy="50%"

                          innerRadius={70}

                          outerRadius={100}

                          paddingAngle={8}

                          stroke="none"

                          cornerRadius={6}

                        >

                          {topClientsAllTime.map((_entry, index) => {

                            const hue = [210, 270, 30, 160, 340][index % 5];

                            return <Cell key={`cell-${index}`} fill={`hsl(${hue}, 70%, 60%)`} />;

                          })}

                        </Pie>

                      </PieChart>

                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>

                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{topClientsAllTime.length}</span>

                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginTop: 2 }}>clients</span>

                    </div>

                  </div>



                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>

                    {topClientsAllTime.map((c, i) => {

                      const maxRevenue = Math.max(topClientsAllTime[0]?.revenue || 0, 1);

                      const p = Math.round((Number(c.revenue) / maxRevenue) * 100) || 0;

                      const hue = [210, 270, 30, 160, 340][i % 5];

                      return (

                        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>

                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: `hsl(${hue}, 70%, 60%)`, flexShrink: 0, boxShadow: 'none' }} />

                          <div style={{ flex: 1, minWidth: 0 }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>

                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>

                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '2px' }}>

                                <span style={{ fontSize: '0.85em', opacity: 0.8, fontWeight: 600 }}>{currency}</span>{c.revenue.toLocaleString()}

                              </span>

                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                              <div style={{ flex: 1, height: 3, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

                                <div style={{ height: '100%', width: `${p}%`, background: `hsl(${hue}, 70%, 60%)`, borderRadius: 999 }} />

                              </div>

                              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', minWidth: 35 }}>{c.count} proj.</div>

                            </div>

                          </div>

                        </div>

                      );

                    })}

                  </div>

                </div>

              ) : (

                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>

                  <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 700, color: 'var(--text-tertiary)' }}>CLIENTS</div>

                  <div style={{ fontSize: 15, fontWeight: 800 }}>No client revenue yet.</div>

                </div>

              )}

           </div>

           

           {/* Recent Cashflow Log */}

           <div className="card" style={{ padding: 20 }}>

              <div style={{ marginBottom: 18 }}>

                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Transactions</h3>

              </div>

              

              {recentTransactions.length > 0 ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {recentTransactions.map((tx) => {

                    const isIn = tx.type === 'in';

                    const color = isIn ? 'var(--color-success)' : 'var(--color-danger)';

                    const bg = isIn ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.06)';

                    const border = isIn ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)';

                    const dateStr = new Date(tx.createdAt || tx.date || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    

                    return (

                      <div key={tx.id || `${tx.createdAt || tx.date || 'tx'}-${tx.amount || 0}-${tx.description || ''}`} onClick={() => go('/finance')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}`, cursor: 'pointer' }}>

                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isIn ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                          {isIn ? <Plus size={16} strokeWidth={3} /> : <Minus size={16} strokeWidth={3} />}

                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>

                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

                            {tx.description || (isIn ? 'Client Payment' : 'Expense / Payout')}

                          </div>

                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 }}>{dateStr}</div>

                        </div>

                        <div style={{ fontSize: 13, fontWeight: 700, color, display: 'flex', alignItems: 'baseline', gap: '2px' }}>

                          {isIn ? '+' : '-'}<span style={{ fontSize: '0.85em', opacity: 0.8, fontWeight: 600 }}>{currency}</span>{Number(tx.amount || 0).toLocaleString()}

                        </div>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>

                  <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 700, color: 'var(--text-tertiary)' }}>CASHFLOW</div>

                  <div style={{ fontSize: 15, fontWeight: 800 }}>No recent transactions.</div>

                </div>

              )}

           </div>

        </div>



        {/* â”€â”€ 4. Ledger Overview â”€â”€ */}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="mf-dash-grid">

           {/* Client Collection */}

           <div className="card" style={{ padding: 20 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

                <div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Pending from clients</h3>

                </div>

                <button onClick={() => go('/clients')} className="btn" style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)', fontWeight: 700 }}>View all</button>

              </div>

              {clientDuesList.length > 0 ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {clientDuesList.map((c, i) => {

                    const hue = [210,270,30,160,340,190][i % 6];

                    return (

                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${hue},70%,90%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: `hsl(${hue},55%,35%)`, flexShrink: 0 }}>

                            {c.name.charAt(0).toUpperCase()}

                          </div>

                          <div>

                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>

                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 }}>{c.count} pending project{c.count > 1 ? 's' : ''}</div>

                          </div>

                        </div>

                        <div style={{ textAlign: 'right' }}>

                          <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px', fontSize: 14, fontWeight: 700, color: 'var(--color-warning)' }}>

                            <span style={{ fontSize: '0.85em', opacity: 0.8, fontWeight: 600 }}>{currency}</span>{c.due.toLocaleString()}

                          </span>

                        </div>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.4 }}>

                  <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 700, color: 'var(--text-tertiary)' }}>CLEAR</div>

                  <div style={{ fontSize: 14, fontWeight: 700 }}>All clients cleared</div>

                </div>

              )}

           </div>

           

           {/* Worker Settlement */}

           <div className="card" style={{ padding: 20 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

                <div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Workers owed</h3>

                </div>

                <button onClick={() => go('/finance')} className="btn" style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)', fontWeight: 700 }}>Pay</button>

              </div>

              {workerDuesList.length > 0 ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {workerDuesList.map((w, i) => {

                    const hue = [30, 210, 160, 270, 340][i % 5];

                    return (

                      <div key={w.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `hsl(${hue},70%,90%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: `hsl(${hue},55%,35%)`, flexShrink: 0 }}>

                            {w.name.charAt(0).toUpperCase()}

                          </div>

                          <div>

                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</div>

                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 }}>{w.role}</div>

                          </div>

                        </div>

                        <div style={{ textAlign: 'right' }}>

                          <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '2px', fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)' }}>

                            <span style={{ fontSize: '0.85em', opacity: 0.8, fontWeight: 600 }}>{currency}</span>{Math.round(w.due).toLocaleString()}

                          </span>

                        </div>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div style={{ textAlign: 'center', padding: '28px 0', opacity: 0.4 }}>

                  <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 700, color: 'var(--text-tertiary)' }}>CLEAR</div>

                  <div style={{ fontSize: 14, fontWeight: 700 }}>All workers paid</div>

                </div>

              )}

           </div>

        </div>



        {/* â”€â”€ 5. Worker Utilization â”€â”€ */}

        {workerUtilization.length > 0 && (

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

              <div>

                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Team</h3>

              </div>

              <button onClick={() => go('/work')} className="btn" style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)', fontWeight: 700 }}>View work</button>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>

              {workerUtilization.map((w) => {

                const maxActive = Math.max(...workerUtilization.map(x => x.active), 1);

                const pct = Math.round((w.active / maxActive) * 100);

                const hue = w.role === 'composer' ? 210 : 330;

                return (

                  <div key={w.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>

                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `hsl(${hue},70%,90%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: `hsl(${hue},55%,35%)`, flexShrink: 0 }}>

                        {w.name.charAt(0).toUpperCase()}

                      </div>

                      <div style={{ minWidth: 0 }}>

                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>

                        <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'capitalize', marginTop: 1 }}>{w.role.replace('_', ' ')}</div>

                      </div>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>

                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{w.active} active task{w.active !== 1 ? 's' : ''}</span>

                      {w.overdue > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-danger)', background: 'rgba(255,59,48,0.1)', padding: '2px 8px', borderRadius: 999 }}>{w.overdue} overdue</span>}

                    </div>

                    <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

                      <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${hue},70%,60%)`, borderRadius: 999, transition: 'width 0.6s ease' }} />

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        )}



        {/* â”€â”€ 6. Analytics â”€â”€ */}

        <div style={{ marginBottom: 24 }}>

          <MonthlyChart isWorker={false} isClient={false} data={chartData} />

        </div>

      </div>

    );

  }



  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  //  WORKER / CLIENT DASHBOARD

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  const orderStatusInfo = (status: string) => {

    if (status === 'pending')   return { label: 'Under Review', color: 'var(--accent-gold)', bg: 'rgba(196,154,82,0.1)' };

    if (status === 'new')       return { label: 'Accepted', color: 'var(--color-success)', bg: 'rgba(52,199,89,0.1)' };

    if (status === 'declined')  return { label: 'Declined', color: 'var(--color-danger)', bg: 'rgba(255,59,48,0.1)' };

    if (status === 'completed') return { label: 'Completed', color: 'var(--color-info)', bg: 'rgba(0,122,255,0.1)' };

    return { label: status, color: 'var(--text-secondary)', bg: 'var(--surface-1)' };

  };



  const handleSubmitReview = async () => {

    if (!reviewOrder || reviewSubmitting) return;

    setReviewSubmitting(true);

    try {

      await addWebsiteTestimonial({

        name: userData?.name || reviewOrder.clientName || 'Client',

        role: reviewOrder.packageName || 'Studio Client',

        text: reviewText.trim() || `Great experience with the ${reviewOrder.packageName || 'studio'} package!`,

        rating: reviewRating,

        projectRef: reviewOrder.orderRef || '',

        approved: false,

        createdAt: new Date().toISOString(),

      });

      setReviewOrder(null);

      setReviewText('');

      setReviewRating(5);

      fireToast('Review submitted! Thank you.', 'success');

    } catch {

      fireToast('Failed to submit review. Please try again.', 'error');

    } finally {

      setReviewSubmitting(false);

    }

  };



  /* â”€â”€ Review Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const ReviewModal = reviewOrder ? (

    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      <div style={{ background: 'var(--card-bg)', borderRadius: 24, border: '1px solid rgba(128,128,128,0.2)', padding: '32px 32px 40px', width: '100%', maxWidth: 400, boxShadow: 'none' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>

          <div>

            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.6px' }}>Leave a Review</div>

            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>{reviewOrder.packageName} — {reviewOrder.songName || reviewOrder.title || 'Your Project'}</div>

          </div>

          <button onClick={() => setReviewOrder(null)} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'rgba(128,128,128,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }}><X size={16} /></button>

        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>

          {[1,2,3,4,5].map(n => (

            <button key={n} onMouseEnter={() => setReviewHover(n)} onMouseLeave={() => setReviewHover(0)} onClick={() => setReviewRating(n)}

              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>

              <Star size={32} fill={(reviewHover || reviewRating) >= n ? 'var(--accent-gold)' : 'transparent'} color={(reviewHover || reviewRating) >= n ? 'var(--accent-gold)' : 'var(--border-color)'} strokeWidth={1.5} />

            </button>

          ))}

        </div>

        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 16, fontWeight: 700 }}>

          {(['','Poor','Fair','Good','Very Good','Excellent!'][reviewRating] ?? '')}

        </div>

        <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience with Tanvir Studio (optional)..." rows={4}

          style={{ width: '100%', boxSizing: 'border-box', padding: '16px', borderRadius: 16, border: '1px solid rgba(128,128,128,0.2)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxShadow: 'none' }} />

        <button onClick={handleSubmitReview} disabled={reviewSubmitting}

          style={{ width: '100%', marginTop: 24, padding: '16px', borderRadius: 16, border: 'none', background: 'var(--accent-gold)', color: 'var(--card-bg)', fontSize: 16, fontWeight: 700, cursor: reviewSubmitting ? 'not-allowed' : 'pointer', opacity: reviewSubmitting ? 0.7 : 1, boxShadow: 'none', transition: 'transform 0.2s' }}>

          {reviewSubmitting ? 'Submitting...' : 'Submit Review'}

        </button>

      </div>

    </div>

  ) : null;



  // Show full-page skeleton ONLY when Firebase is connecting for the very first time.
  // The `tasksLoading` variables are now correctly false if we already have local cache.
  // This is placed here (after all hooks) to prevent "Rendered more hooks than during the previous render" errors.
  const loading = tasksLoading || (isAdmin && txLoading) || (isAdmin && clientsLoading);

  if (loading) return <PageSkeleton />;

  return (

    <div style={{}}>

      <div className="page-header">

        <div className="page-header-left">

          <h1 className="page-title">{userData?.name?.trim().split(' ')[0] || 'Hey'}</h1>

        </div>

        <div className="page-actions">

          {userData?.role === 'composer' && (

            <button onClick={() => go('/work', { state: { openNewProject: true } })} className="btn btn-primary">

              <Plus size={16} /> New Project

            </button>

          )}

        </div>

      </div>



      <DashboardAlerts isAdmin={isAdmin} isWorker={isWorker} totalClientDues={totalClientDues} totalWorkerLiability={totalWorkerLiability} workerDue={workerDue} currency={currency} />



      <KPICards

        isWorker={isWorker} isAdmin={isAdmin} isClient={isClient}

        activeProjects={activeProjects} avgProgress={Math.round(avgProgress)}

        workerEarned={workerEarned} workerAvailable={workerAvailable} workerPendingClient={workerPendingClient} workerPaid={workerPaid}

        clientPaid={clientPaid} clientDue={clientDue}

        currentBalance={currentBalance} totalIncome={totalIncome}

        currency={settings.currency} clientsCount={clients.length}

      />



      {/* â”€â”€ My Orders (client only) â”€â”€ */}

      {isClient && (

        <div className="card" style={{ marginBottom: 32, borderRadius: 24, overflow: 'hidden', boxShadow: 'none', border: '1px solid rgba(128,128,128,0.15)' }}>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(128,128,128,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>

            <PackageOpen size={16} color="var(--accent-gold)" />

            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>My Orders</h3>

            {myOrders.length > 0 && (

              <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '1px 7px', borderRadius: 999 }}>{myOrders.length}</span>

            )}

          </div>

          {myOrders.length === 0 ? (

            <div style={{ padding: '40px 18px', textAlign: 'center' }}>

              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px' }}>No orders yet</p>

              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 16px' }}>Browse our services and place an order to get started.</p>

              <button onClick={() => go('/services')} style={{ background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: 'var(--card-bg)', border: 'none', borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: 'none' }}>

                Browse Services →

              </button>

            </div>

          ) : (

            <div style={{ display: 'flex', flexDirection: 'column' }}>

              {myOrders.map((order: any, idx: number) => {

                const info = orderStatusInfo(order.status);

                const recordDate = order.recordingDate ? new Date(order.recordingDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;

                return (

                  <div key={order.id} style={{ padding: '14px 18px', borderBottom: idx < myOrders.length - 1 ? '1px solid var(--border-color)' : 'none' }}>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                      <div style={{ flex: 1, minWidth: 0 }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>

                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{order.songName || order.title?.replace(/^TSN-- \w+\s*-\s*/, '') || '—'}</span>

                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', border: '1px solid rgba(196,154,82,0.2)', padding: '1px 7px', borderRadius: 6 }}>{order.packageName || '—'}</span>

                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-tertiary)' }}>

                          {order.orderRef && <span style={{ fontWeight: 700, letterSpacing: '.04em' }}>#{order.orderRef}</span>}

                          {order.createdAt && <span>{new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>}

                          {recordDate && order.status === 'new' && <span>Session: {recordDate}</span>}

                        </div>

                        {order.status === 'pending' && (

                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>Your order is under review. We'll contact you shortly.</p>

                        )}

                        {order.status === 'declined' && (

                          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>We couldn't take this project at this time. Please contact us for alternatives.</p>

                        )}

                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

                        <span style={{ fontSize: 11, fontWeight: 700, color: info.color, background: info.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{info.label}</span>

                        {order.status === 'completed' && (

                          <button onClick={() => { setReviewOrder(order); setReviewRating(5); setReviewText(''); }}

                            style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.08)', border: '1px solid rgba(196,154,82,0.25)', padding: '3px 10px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>

                            <Star size={10} /> Review

                          </button>

                        )}

                      </div>

                    </div>

                    {/* File Delivery */}

                    {(order.deliveryFiles || []).length > 0 && (

                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(52,199,89,0.06)', borderRadius: 10, border: '1px solid rgba(52,199,89,0.15)' }}>

                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Project Files Ready</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                          {(order.deliveryFiles as any[]).map((f: any, fi: number) => (

                            <a key={fi} href={f.url} target="_blank" rel="noreferrer"

                              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--color-success)', textDecoration: 'none' }}>

                              <Download size={13} /> {f.name || `File ${fi + 1}`}

                            </a>

                          ))}

                        </div>

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          )}

        </div>

      )}



      <div className="dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', minWidth: 0 }}>

        <div style={{ minWidth: 0, overflow: 'hidden' }}><PriorityTasks tasks={priorityTasks} /></div>

        <div style={{ minWidth: 0, overflow: 'hidden' }}><MonthlyChart isWorker={isWorker} isClient={isClient} data={chartData} /></div>

      </div>



      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

      {ReviewModal}

    </div>

  );

}

