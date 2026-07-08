import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcComposerComm, calcHummingComm, calcTaskPaid, paymentRatio } from '../utils/commissionUtils';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalStats } from './useGlobalStats';
import { useDeadlineAlerts } from './useDeadlineAlerts';

/**
 * Consolidates all Dashboard data-fetching, role derivation, and stats
 * aggregation (admin + worker + client) behind a single hook so the
 * Dashboard page component only has to worry about rendering.
 */
export function useDashboardData() {
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

        const d = new Date((t.createdAt as any) || (t.date as any) || 0);

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

      .sort((a, b) => new Date((b.createdAt as any) || (b.date as any) || 0).getTime() - new Date((a.createdAt as any) || (a.date as any) || 0).getTime())

      .slice(0, 6);

  }, [transactions]);



  // â”€â”€ New orders from homepage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const newOrders = useMemo(() =>

    tasks

      .filter((t: any) => t.publicOrder && t.status === 'pending')

      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),

  [tasks]);



  // â”€â”€ Client: my submitted orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const myOrders = useMemo(() => {
    if (!isClient || !userData?.email) return [];
    const email = userData.email.toLowerCase();
    return tasks
      .filter((t: any) => t.publicOrder && t.clientEmail && t.clientEmail.toLowerCase() === email)
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [tasks, isClient, userData]);



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

  return {
    isMobile, userData, settings, currency, notifyOverdue, notifyUpcoming, go,
    tasks, tasksLoading, transactions, txLoading, clients, clientsLoading, users, updateTask, addWebsiteTestimonial,
    isAdmin, isWorker, isClient,
    totalIncome, currentBalance, lastMonthIncome,
    filteredTasks, activeProjects, avgProgress,
    workerEarned, workerAvailable, workerPendingClient, workerPaid, workerDue,
    clientPaid, clientDue,
    totalClientDues, totalWorkerLiability,
    stagePipeline, todaySessions, overdueTasks, upcomingDeadlines,
    clientDuesList, workerDuesList, allTimeGrossRevenue, topClientsAllTime, workerUtilization, recentTransactions,
    newOrders, myOrders, chartData, priorityTasks,
  };
}
