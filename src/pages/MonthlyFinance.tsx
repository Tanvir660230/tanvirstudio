/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-refresh/only-export-components */

import React, { useMemo, useState, useEffect, useRef } from 'react';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';

import { useLocation } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';

import {

  AlertTriangle,

  Banknote,

  Bell,

  Briefcase,

  Check,

  CheckCircle2,

  ChevronDown,

  ChevronLeft,

  ChevronRight,

  Edit2,

  FileText,

  Home,

  MoreHorizontal,

  Plus,

  ReceiptText,

  TrendingDown,

  TrendingUp,

  UserRound,

  Wallet,

  X,

  Paperclip,

  Zap,

  Wifi,

  Mail,

} from 'lucide-react';

import './MonthlyFinance.css';

import { useAuth } from '../contexts/AuthContext';

import { useFirestore } from '../hooks/useFirestore';

import { useData } from '../contexts/DataContext';

import { useSettings } from '../contexts/SettingsContext';

import { InvoiceModal } from '../components/InvoiceModal';

import { Toast } from '../components/Toast';

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { writeBatch, doc, collection, serverTimestamp, orderBy, where } from 'firebase/firestore';

import { storage, db } from '../lib/firebase';

import { atomicPayWorker } from '../utils/atomicOps';

import { updateGlobalStats } from '../utils/statsUpdater';

import { logActivity } from '../utils/auditLog';

import { sendPaymentReminder } from '../utils/emailApi';

import {

  ClientDueList, WorkerDueList, ProjectList, TransactionList, BillList, WorkerPaymentHistory, ReportMini, EmptyBox, FinanceModals, ConfirmDialog,

} from '../components/finance/FinanceShared';



const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];



const EXPENSE_CATEGORIES = [

  { id: 'rent', label: 'House Rent', icon: <Home size={16} />, color: 'var(--color-info)' },

  { id: 'utility', label: 'Utility', icon: <Zap size={16} />, color: 'var(--color-warning)' },

  { id: 'internet', label: 'Internet', icon: <Wifi size={16} />, color: 'var(--color-success)' },

  { id: 'other', label: 'Other', icon: <MoreHorizontal size={16} />, color: '#8E8E93' },

];



const QUICK_SETUP_EXPENSES = [

  { name: 'Studio Rent', amount: 0, category: 'rent' },

  { name: 'Electricity Bill', amount: 0, category: 'utility' },

  { name: 'Internet Bill', amount: 0, category: 'internet' },

];



type FinanceTab = 'overview' | 'clients' | 'workers' | 'bills' | 'transactions' | 'report' | 'year';



const normalizeFinanceTab = (tab: any): FinanceTab => {

  if (tab === 'history') return 'transactions';

  if (tab === 'projects') return 'report';

  if (['overview', 'clients', 'workers', 'bills', 'transactions', 'report', 'year'].includes(tab)) return tab;

  return 'overview';

};



export const toJSDate = (val: any): Date | null => {

  if (!val) return null;

  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();

  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const parsed = new Date(val);

  return isNaN(parsed.getTime()) ? null : parsed;

};



export function MonthlyFinance() {

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {

    const h = () => setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', h);

    return () => window.removeEventListener('resize', h);

  }, []);



  const { userData } = useAuth();

  const { settings } = useSettings();

  const { currency, defaultComposerComm, defaultHummingComm } = settings;

  const isAdmin = userData?.role === 'admin';

  const location = useLocation();



  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [activeTab, setActiveTab] = useState<FinanceTab>(normalizeFinanceTab(location.state?.tab));

  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editAmount, setEditAmount] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  const [newExpense, setNewExpense] = useState({ name: '', amount: '', category: 'rent' });

  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);

  const [newRecurringIncome, setNewRecurringIncome] = useState({ name: '', amount: '' });

  const [showAddIncome, setShowAddIncome] = useState(false);

  const [newIncome, setNewIncome] = useState({ amount: '', note: '', account: 'bKash' });

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  const [newOneOffExpense, setNewOneOffExpense] = useState({ amount: '', note: '', category: 'General', receiptUrl: '', receiptName: '', account: 'bKash' });

  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [payModal, setPayModal] = useState<any>(null);

  const [payAmount, setPayAmount] = useState('');

  const [payNote, setPayNote] = useState('');

  const [payProcessing, setPayProcessing] = useState(false);

  const [invoiceTask, setInvoiceTask] = useState<any>(null);

  const [showToast, setShowToast] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const fireToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {

    setToastMsg(msg); setToastType(type); setShowToast(true);

  };

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
  } | null>(null);

  const showConfirm = (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) => {
    setConfirmDialog(opts);
  };

  const [chartRange, setChartRange] = useState<3 | 6 | 12>(6);

  const [txFilter, setTxFilter] = useState<{ type: 'all' | 'in' | 'out'; search: string; category: string }>({ type: 'all', search: '', category: '' });



  const { data: recurringExpenses, add: addExpense, update: updateExpense, remove: removeExpense } = useFirestore<any>('recurringExpenses', [orderBy('createdAt', 'desc')]);

  const { data: monthlyPayments, add: addPayment, remove: removePayment } = useFirestore<any>('monthlyPayments', [orderBy('createdAt', 'desc')]);

  const { data: recurringIncome, add: addRecurringIncome, remove: removeRecurringIncome } = useFirestore<any>('recurringIncome');

  const { data: monthlyIncomeReceipts, add: addIncomeReceipt, remove: removeIncomeReceipt } = useFirestore<any>('monthlyIncomeReceipts');

  const { tasks, updateTask, transactions, addTx: addTransaction, removeTx, users, addWorkerPayment, workerPayments, monthlyLedgers, addMonthlyLedger, updateMonthlyLedger, removeMonthlyLedger } = useData();



  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;



  // Deduplicated ledger lookup — take first if somehow duplicated

  const currentLedger = monthlyLedgers?.filter((l: any) => l.monthKey === monthKey)[0] ?? null;



  // In-flight guard: tracks expense+month keys submitted this session to prevent

  // the effect re-firing (from state update) before Firestore write lands in local state.

  const autoCreating = useRef(new Set<string>());



  // Auto-create monthlyPayment records for recurring expenses not yet logged this month

  useEffect(() => {

    if (!recurringExpenses?.length || !monthlyPayments) return;

    const now = new Date();

    const isCurrentOrPast = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth <= now.getMonth());

    if (!isCurrentOrPast) return;

    recurringExpenses.forEach((expense: any) => {

      const key = `${expense.id}|${monthKey}`;

      const alreadyLogged = monthlyPayments.some((p: any) => p.expenseId === expense.id && p.monthKey === monthKey);

      // Guard added BEFORE async call to prevent duplicate writes across re-renders
      if (!alreadyLogged && !autoCreating.current.has(key)) {
        autoCreating.current.add(key);

        addPayment({

          expenseId: expense.id,

          expenseName: expense.name || expense.label || 'Recurring Expense',

          amount: Number(expense.amount) || 0,

          monthKey,

          autoCreated: true,

          paid: false,

          createdAt: new Date().toISOString(),

        }).catch(() => {

          autoCreating.current.delete(key);

          fireToast(`Failed to auto-create "${expense.name || 'Recurring Expense'}" for ${monthKey}. Refresh and try again.`, 'error');

        });

      }

    });

  }, [recurringExpenses, monthlyPayments, monthKey, selectedMonth, selectedYear]);



  const startOfSelectedMonth = new Date(selectedYear, selectedMonth, 1).getTime();

  // Use previous month's closed ledger balance if available — avoids O(n) all-history scan
  const prevMonthKey = (() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const prevLedger = monthlyLedgers?.find((l: any) => l.monthKey === prevMonthKey) ?? null;

  const calculatedOpeningBalance = useMemo(() => {
    if (prevLedger?.closingBalance !== undefined) return Number(prevLedger.closingBalance);
    const startMs = startOfSelectedMonth;
    const pastIn = transactions
      .filter((tx: any) => {
        if (tx.status === 'Pending' || tx.type !== 'in') return false;
        const d = toJSDate(tx.createdAt || tx.date);
        return d && d.getTime() < startMs;
      })
      .reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    const pastOut = transactions
      .filter((tx: any) => {
        if (tx.status === 'Pending' || tx.type !== 'out') return false;
        const d = toJSDate(tx.createdAt || tx.date);
        return d && d.getTime() < startMs;
      })
      .reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    return pastIn - pastOut;
  }, [transactions, startOfSelectedMonth, prevLedger]);



  const [showCloseModal, setShowCloseModal] = useState(false);



  const isSameMonth = (dateVal: any) => {

    const date = toJSDate(dateVal);

    return !!date && date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;

  };



  const money = (amount: number) => `${currency}${Math.round(Number(amount) || 0).toLocaleString()}`;



  const getWorkerName = (uid: string) => {

    const worker = users.find((u: any) => u.id === uid || u.uid === uid);

    return worker?.name || uid?.substring(0, 8) || 'Unknown';

  };



  const getTaskPaid = (task: any) => (task.payments || []).reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);

  const getTaskDue = (task: any) => Math.max(0, (Number(task.budget) || 0) - getTaskPaid(task));

  const getTaskWorkerEntries = (task: any) => {

    const budget = Number(task.budget) || 0;

    const entries: any[] = [];

    const status = task.status;

    const READY = ['delivered', 'completed'];



    // Composer: payable only after client has approved (delivered or completed)

    if (task.composerId && READY.includes(status)) {

      const earned = task.composerCommissionType === 'flat'

        ? Number(task.composerCommissionAmount) || 0

        : Math.round((budget * (Number(task.composerCommissionPct) || defaultComposerComm)) / 100);

      const paid = Number(task.composerPaid) || 0;

      const due = Math.max(0, earned - paid);

      if (due > 0) entries.push({

        workerId: task.composerId,

        workerName: getWorkerName(task.composerId),

        role: 'Composer',

        fieldPaid: 'composerPaid',

        earned, paid, due, task,

        payStatus: READY.includes(status) ? 'ready' : 'waiting',

      });

    }



    // Humming Artist: payable only after client has approved (delivered or completed)

    if (task.needsHumming && task.hummingArtistId && READY.includes(status)) {

      const earned = task.hummingArtistCommissionType === 'flat'

        ? Number(task.hummingArtistCommissionAmount) || 0

        : Math.round((budget * (task.hummingArtistCommissionPct || defaultHummingComm)) / 100);

      const paid = Number(task.hummingArtistPaid) || 0;

      const due = Math.max(0, earned - paid);

      if (due > 0) entries.push({

        workerId: task.hummingArtistId,

        workerName: getWorkerName(task.hummingArtistId),

        role: 'Humming Artist',

        fieldPaid: 'hummingArtistPaid',

        earned, paid, due, task,

        payStatus: READY.includes(status) ? 'ready' : 'waiting',

      });

    }



    return entries;

  };



  const monthTransactions = useMemo(() => {

    return transactions

      .filter((tx: any) => isSameMonth(tx.createdAt || tx.date) && tx.status !== 'Pending')

      .sort((a: any, b: any) => (toJSDate(b.createdAt || b.date)?.getTime() || 0) - (toJSDate(a.createdAt || a.date)?.getTime() || 0));

     

  }, [transactions, selectedMonth, selectedYear]);



  const exportTransactionsCSV = () => {

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Status'];

    const rows = monthTransactions.map((tx: any) => [

      new Date(tx.createdAt || tx.date || 0).toLocaleDateString(),

      tx.type === 'in' ? 'Income' : 'Expense',

      tx.category || '',

      tx.title || tx.description || '',

      Number(tx.amount) || 0,

      tx.status || '',

    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `tanvir-studio-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.csv`;

    a.click();

    URL.revokeObjectURL(url);

    fireToast('Transactions exported!');

  };



  const txCategories = useMemo(() => {
    const cats = new Set<string>();
    monthTransactions.forEach((tx: any) => { if (tx.category) cats.add(tx.category); });
    return Array.from(cats).sort();
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((tx: any) => {
      if (txFilter.type !== 'all' && tx.type !== txFilter.type) return false;
      if (txFilter.category && (tx.category || '') !== txFilter.category) return false;
      if (txFilter.search) {
        const q = txFilter.search.toLowerCase();
        return (
          (tx.title || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q) ||
          (tx.category || '').toLowerCase().includes(q) ||
          String(tx.amount || '').includes(q)
        );
      }
      return true;
    });
  }, [monthTransactions, txFilter]);

  const liveCashIn = monthTransactions.filter((tx: any) => tx.type === 'in').reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);

  const liveCashOut = monthTransactions.filter((tx: any) => tx.type === 'out').reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);



  const openingBalance = calculatedOpeningBalance;

  const cashIn = liveCashIn;

  const cashOut = liveCashOut;

  const closingBalance = (openingBalance + cashIn - cashOut);

  const cashProfit = cashIn - cashOut;



  const clientDues = useMemo(() => {

    const DONE = ['delivered', 'completed'];

    return tasks

      .map((task: any) => {

        const budget = Number(task.budget) || 0;

        const paid = getTaskPaid(task);

        const due = Math.max(0, budget - paid);

        // 'overdue' = work done/delivered but payment still pending

        // 'in-progress' = work still ongoing, advance may be pending

        const dueType: 'overdue' | 'in-progress' = DONE.includes(task.status) ? 'overdue' : 'in-progress';

        return { ...task, budget, paid, due, dueType };

      })

      .filter((task: any) => task.due > 0)

      // Sort: completed/delivered first (most urgent), then by due amount

      .sort((a: any, b: any) => {

        if (a.dueType === 'overdue' && b.dueType !== 'overdue') return -1;

        if (b.dueType === 'overdue' && a.dueType !== 'overdue') return 1;

        return b.due - a.due;

      });

  }, [tasks]);



  const payableWorkerEntries = useMemo(() => {

    return tasks

      .flatMap((task: any) => getTaskWorkerEntries(task))

      .filter((entry: any) => entry.due > 0)

      .sort((a: any, b: any) => b.due - a.due);

     

  }, [tasks, users]);



  const workerRegistry = useMemo(() => {

    const registry: Record<string, { workerId: string; name: string; tasks: any[]; totalEarned: number; totalPaid: number; totalDue: number; readyDue: number; waitingDue: number }> = {};



    payableWorkerEntries.forEach((entry: any) => {

      if (!registry[entry.workerId]) {

        registry[entry.workerId] = {

          workerId: entry.workerId,

          name: entry.workerName,

          tasks: [],

          totalEarned: 0,

          totalPaid: 0,

          totalDue: 0,

          readyDue: 0,

          waitingDue: 0,

        };

      }

      registry[entry.workerId].tasks.push(entry);

      registry[entry.workerId].totalEarned += entry.earned;

      registry[entry.workerId].totalPaid += entry.paid;

      registry[entry.workerId].totalDue += entry.due;

      if (entry.payStatus === 'ready') {

        registry[entry.workerId].readyDue += entry.due;

      } else {

        registry[entry.workerId].waitingDue += entry.due;

      }

    });



    return registry;

  }, [payableWorkerEntries]);



  const completedProjects = useMemo(() => {

    return tasks

      .filter((task: any) => task.status === 'completed' && isSameMonth(task.completedAt))

      .map((task: any) => ({ ...task, paid: getTaskPaid(task), due: getTaskDue(task), budget: Number(task.budget) || 0 }))

      .sort((a: any, b: any) => (toJSDate(b.completedAt)?.getTime() || 0) - (toJSDate(a.completedAt)?.getTime() || 0));

     

  }, [tasks, selectedMonth, selectedYear]);



  const unpaidBills = recurringExpenses.filter((expense: any) => !monthlyPayments.some((payment: any) => payment.expenseId === expense.id && payment.monthKey === monthKey));

  const paidBills = recurringExpenses.filter((expense: any) => monthlyPayments.some((payment: any) => payment.expenseId === expense.id && payment.monthKey === monthKey));

  const totalClientDue = clientDues.reduce((sum: number, task: any) => sum + task.due, 0);

  const totalWorkerDue = payableWorkerEntries.reduce((sum: number, entry: any) => sum + entry.due, 0);

  const totalWorkerReady = payableWorkerEntries.filter((e: any) => e.payStatus === 'ready').reduce((sum: number, e: any) => sum + e.due, 0);

  const totalWorkerWaiting = payableWorkerEntries.filter((e: any) => e.payStatus === 'waiting').reduce((sum: number, e: any) => sum + e.due, 0);



  const prevMonthData = useMemo(() => {
    const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevTxs = transactions.filter((tx: any) => {
      if (tx.status === 'Pending') return false;
      const d = toJSDate(tx.createdAt || tx.date);
      return d && d.getMonth() === pm && d.getFullYear() === py;
    });
    const pIn  = prevTxs.filter((tx: any) => tx.type === 'in').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    const pOut = prevTxs.filter((tx: any) => tx.type === 'out').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);
    return { cashIn: pIn, cashOut: pOut, profit: pIn - pOut };
  }, [transactions, selectedMonth, selectedYear]);

  const kpiTrend = (curr: number, prev: number): number | undefined =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : undefined;

  const trendChartData = useMemo(() => {

    return Array.from({ length: chartRange }, (_, i) => {

      const d = new Date(selectedYear, selectedMonth - (chartRange - 1 - i), 1);

      const y = d.getFullYear();

      const m = d.getMonth();

      const label = d.toLocaleString('en-US', { month: 'short' });

      const monthTxs = transactions.filter((tx: any) => {

        if (tx.status === 'Pending') return false;

        const date = toJSDate(tx.createdAt || tx.date);

        return date && date.getFullYear() === y && date.getMonth() === m;

      });

      const cashIn = monthTxs.filter((tx: any) => tx.type === 'in').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

      const cashOut = monthTxs.filter((tx: any) => tx.type === 'out').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

      return { name: label, cashIn, cashOut, profit: cashIn - cashOut };

    });

  }, [transactions, selectedMonth, selectedYear, chartRange]);



  const expensePieData = useMemo(() => {

    const catMap: Record<string, number> = {};

    monthTransactions.filter((tx: any) => tx.type === 'out').forEach((tx: any) => {

      const cat = tx.category || 'Other';

      catMap[cat] = (catMap[cat] || 0) + (Number(tx.amount) || 0);

    });

    const total = Object.values(catMap).reduce((s: number, v) => s + v, 0);

    const limits = settings.categoryLimits || {};

    return Object.entries(catMap)

      .sort((a, b) => b[1] - a[1])

      .map(([name, value]) => ({

        name, value,

        pct: total > 0 ? Math.round((value / total) * 100) : 0,

        limit: limits[name] || 0,

        overLimit: limits[name] > 0 && value > limits[name],

      }));

  }, [monthTransactions, settings.categoryLimits]);



  const PIE_COLORS = ['var(--color-danger)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)', 'var(--accent-purple)', 'var(--accent-indigo)', '#8E8E93'];



  const yearSummaryData = useMemo(() => {

    return Array.from({ length: 12 }, (_, m) => {

      const monthTxs = transactions.filter((tx: any) => {

        if (tx.status === 'Pending') return false;

        const date = toJSDate(tx.createdAt || tx.date);

        return date && date.getFullYear() === selectedYear && date.getMonth() === m;

      });

      const mCashIn = monthTxs.filter((tx: any) => tx.type === 'in').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

      const mCashOut = monthTxs.filter((tx: any) => tx.type === 'out').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

      const mProfit = mCashIn - mCashOut;

      return { month: MONTHS[m].substring(0, 3), fullMonth: MONTHS[m], cashIn: mCashIn, cashOut: mCashOut, profit: mProfit, mIndex: m };

    });

  }, [transactions, selectedYear]);



  const budgetVsActualData = useMemo(() => {

    const taxRate = Number(settings.invoiceTaxRate) || 0;

    return completedProjects.map((task: any) => {

      const budget = Number(task.budget) || 0;

      const taxAmount = taxRate > 0 ? Math.round(budget * (taxRate / 100)) : 0;

      const grossRevenue = budget + taxAmount;

      // Use actual collected amount, not budget — reflects real cash received

      const clientPaid = getTaskPaid(task);

      const cCost = task.composerCommissionType === 'flat'

        ? Number(task.composerCommissionAmount) || 0

        : Math.round((budget * (Number(task.composerCommissionPct) || defaultComposerComm)) / 100);

      const hCost = (task.needsHumming && task.hummingArtistId)

        ? (task.hummingArtistCommissionType === 'flat'

            ? Number(task.hummingArtistCommissionAmount) || 0

            : Math.round((budget * (task.hummingArtistCommissionPct ?? defaultHummingComm)) / 100))

        : 0;

      const totalCost = cCost + hCost;

      // Cash margin: what we actually received minus worker costs

      const cashMargin = clientPaid - totalCost;

      // Full margin: what we'd earn if fully collected (budget + tax - worker costs)

      const fullMargin = grossRevenue - totalCost;

      const marginPct = grossRevenue > 0 ? Math.round((fullMargin / grossRevenue) * 100) : 0;

      const collectedPct = grossRevenue > 0 ? Math.round((clientPaid / grossRevenue) * 100) : 0;

      return { ...task, cCost, hCost, totalCost, grossRevenue, clientPaid, cashMargin, margin: fullMargin, marginPct, collectedPct, taxAmount };

    });

  }, [completedProjects, settings.invoiceTaxRate]);

  const completedValue = completedProjects.reduce((sum: number, task: any) => sum + task.budget, 0);

  const completedDue = completedProjects.reduce((sum: number, task: any) => sum + task.due, 0);



  const exportReportCSV = () => {

    const escape = (v: any) => {

      const s = String(v ?? '').replace(/"/g, '""');

      return `"${/^[=+\-@]/.test(s) ? "'" + s : s}"`;

    };

    const row = (...cols: any[]) => cols.map(escape).join(',');

    const lines: string[] = [

      row('Tanvir Studio — Monthly P&L Report', monthLabel),

      '',

      row('CASH SUMMARY'),

      row('Opening Balance', openingBalance),

      row('Cash In', cashIn),

      row('Cash Out', cashOut),

      row('Net Cash Profit', cashProfit),

      row('Closing Balance', cashIn - cashOut + openingBalance),

      '',

      row('COMPLETED PROJECTS'),

      row('Project', 'Budget', 'Collected', 'Worker Cost', 'Cash Margin', 'Full Margin', 'Margin %'),

      ...budgetVsActualData.map((r: any) => row(r.title, r.grossRevenue, r.clientPaid, r.totalCost, r.cashMargin, r.margin, r.marginPct + '%')),

      row('TOTAL', budgetVsActualData.reduce((s: number, r: any) => s + r.grossRevenue, 0), budgetVsActualData.reduce((s: number, r: any) => s + r.clientPaid, 0), budgetVsActualData.reduce((s: number, r: any) => s + r.totalCost, 0), budgetVsActualData.reduce((s: number, r: any) => s + r.cashMargin, 0), budgetVsActualData.reduce((s: number, r: any) => s + r.margin, 0)),

      '',

      row('CLIENT DUES'),

      row('Client', 'Project', 'Budget', 'Paid', 'Due'),

      ...clientDues.map((t: any) => row(t.client || '—', t.title || '—', t.budget, t.paid, t.due)),

      '',

      row('BILLS'),

      row('Name', 'Amount', 'Status'),

      ...recurringExpenses.map((e: any) => row(e.name, e.amount, paidBills.some((b: any) => b.id === e.id) ? 'Paid' : 'Unpaid')),

      '',

      row('TRANSACTIONS'),

      row('Date', 'Type', 'Category', 'Description', 'Amount', 'Status'),

      ...monthTransactions.map((tx: any) => row(

        new Date(tx.createdAt || tx.date || 0).toLocaleDateString(),

        tx.type === 'in' ? 'Income' : 'Expense',

        tx.category || '',

        tx.title || '',

        Number(tx.amount) || 0,

        tx.status || '',

      )),

    ];

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `PnL_${MONTHS[selectedMonth]}_${selectedYear}.csv`;

    a.click();

    URL.revokeObjectURL(url);

    fireToast('P&L report exported!');

  };



  // Cash flow forecast — next 3 months

  const cashForecast = useMemo(() => {

    const totalBills = recurringExpenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

    // Weighted average: most recent month 50%, 2 months ago 30%, 3 months ago 20%

    const weights = [0.5, 0.3, 0.2];

    const last3Months = Array.from({ length: 3 }, (_, i) => {

      const d = new Date(selectedYear, selectedMonth - (i + 1), 1);

      return { y: d.getFullYear(), m: d.getMonth() };

    });

    const weightedIncome = last3Months.reduce((sum, { y, m }, i) => {

      const monthIn = transactions

        .filter((tx: any) => {

          if (tx.type !== 'in' || tx.status === 'Pending') return false;

          const d = toJSDate(tx.createdAt || tx.date);

          return d && d.getFullYear() === y && d.getMonth() === m;

        })

        .reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

      return sum + monthIn * weights[i];

    }, 0);

    // Also factor in pending client dues as a receivables buffer

    const pendingReceivables = transactions

      .filter((tx: any) => tx.status === 'Pending' && tx.type === 'in')

      .reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

    return Array.from({ length: 3 }, (_, i) => {

      const d = new Date(selectedYear, selectedMonth + i + 1, 1);

      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const expectedIncome = Math.round(weightedIncome + (i === 0 ? pendingReceivables * 0.5 : 0));

      const expectedExpenses = totalBills;

      const netForecast = expectedIncome - expectedExpenses;

      return { label, expectedIncome, expectedExpenses, netForecast };

    });

  }, [recurringExpenses, transactions, selectedMonth, selectedYear]);



  const actionItems = [

    ...clientDues.slice(0, 3).map((task: any) => ({ id: `client-${task.id}`, tone: 'blue', title: `Collect from ${task.client || 'Client'}`, sub: task.title, amount: task.due, action: () => setInvoiceTask(task), label: 'Invoice' })),

    ...Object.values(workerRegistry).filter((w: any) => w.readyDue > 0).slice(0, 3).map((worker: any) => {

      const readyCount = worker.tasks.filter((e: any) => e.payStatus === 'ready').length;

      return { id: `worker-${worker.workerId}`, tone: 'orange', title: `Pay ${worker.name}`, sub: `${readyCount} ready task${readyCount !== 1 ? 's' : ''}`, amount: worker.readyDue, action: () => setPayModal(worker), label: 'Pay' };

    }),

    ...unpaidBills.slice(0, 2).map((bill: any) => ({ id: `bill-${bill.id}`, tone: 'red', title: `Pay bill: ${bill.name}`, sub: 'Fixed studio cost', amount: Number(bill.amount) || 0, action: () => togglePaid(bill), label: 'Mark Paid' })),

  ].slice(0, 6);



  const navigateMonth = (dir: number) => {

    let month = selectedMonth + dir;

    let year = selectedYear;

    if (month > 11) { month = 0; year += 1; }

    if (month < 0) { month = 11; year -= 1; }

    setSelectedMonth(month);

    setSelectedYear(year);

  };



  const makeSelectedMonthDate = () => {

    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    return new Date(selectedYear, selectedMonth, Math.min(now.getDate(), maxDays), now.getHours(), now.getMinutes()).toISOString();

  };



  const togglePaid = async (expense: any, confirmed = false) => {

    if (!isAdmin) return;

    const existingPayment = monthlyPayments.find((payment: any) => payment.expenseId === expense.id && payment.monthKey === monthKey);



    // Double-entry guard: warn if a manual Cash Out for same amount exists this month

    if (!confirmed && !existingPayment) {

      const amt = Number(expense.amount) || 0;

      const manualDuplicate = monthTransactions.find((tx: any) =>

        tx.type === 'out' &&

        tx.category !== 'Fixed Bill' &&

        Math.abs((Number(tx.amount) || 0) - amt) <= 1 &&

        isSameMonth(tx.createdAt || tx.date),

      );

      if (manualDuplicate) {

        showConfirm({

          title: 'Possible Duplicate',

          message: `A Cash Out of ${money(amt)} already exists this month ("${manualDuplicate.title || 'Cash Out'}"). Marking this bill paid will record the same amount twice.`,

          confirmLabel: 'Mark Paid Anyway',

          danger: true,

          onConfirm: () => { setConfirmDialog(null); togglePaid(expense, true); },

        });

        return;

      }

    }



    const batch = writeBatch(db);



    if (existingPayment) {

      // Atomically remove payment record + its transaction

      batch.delete(doc(db, 'monthlyPayments', existingPayment.id));

      const txToDelete = transactions.find((tx: any) => tx.category === 'Fixed Bill' && tx.title === `Bill: ${expense.name}` && isSameMonth(tx.createdAt || tx.date));

      if (txToDelete) batch.delete(doc(db, 'transactions', txToDelete.id));

      try { await batch.commit(); } catch { fireToast('Failed to update bill. Please try again.', 'error'); return; }

      logActivity({ by: userData?.name || 'Admin', byUid: userData?.uid || '', action: 'bill.unpaid', collection: 'monthlyPayments', docId: existingPayment.id, docTitle: expense.name, before: { amount: expense.amount, monthKey } }).catch(() => {});

      return;

    }



    // Atomically create payment record + expense transaction

    const createdAt = makeSelectedMonthDate();

    const paymentRef = doc(collection(db, 'monthlyPayments'));

    const txRef = doc(collection(db, 'transactions'));

    batch.set(paymentRef, { expenseId: expense.id, monthKey, amount: Number(expense.amount) || 0, name: expense.name, paidAt: createdAt, createdAt: serverTimestamp() });

    batch.set(txRef, {

      title: `Bill: ${expense.name}`,

      amount: Number(expense.amount) || 0,

      type: 'out',

      category: 'Fixed Bill',

      status: 'Completed',

      date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),

      createdAt: serverTimestamp(),

      user: userData?.name || 'Admin',

    });

    try { await batch.commit(); } catch { fireToast('Failed to mark bill as paid. Please try again.', 'error'); return; }

    updateGlobalStats({ expenses: Number(expense.amount) || 0, date: createdAt }).catch(() => {});

    logActivity({ by: userData?.name || 'Admin', byUid: userData?.uid || '', action: 'bill.paid', collection: 'monthlyPayments', docId: paymentRef.id, docTitle: expense.name, after: { amount: expense.amount, monthKey } }).catch(() => {});

  };



  const payAll = async () => {

    if (!isAdmin || unpaidBills.length === 0) return;

    const batch = writeBatch(db);

    const createdAt = makeSelectedMonthDate();

    let totalExpenses = 0;

    for (const expense of unpaidBills) {

      const amount = Number(expense.amount) || 0;

      totalExpenses += amount;

      const paymentRef = doc(collection(db, 'monthlyPayments'));

      const txRef = doc(collection(db, 'transactions'));

      batch.set(paymentRef, { expenseId: expense.id, monthKey, amount, name: expense.name, paidAt: createdAt, createdAt: serverTimestamp() });

      batch.set(txRef, {

        title: `Bill: ${expense.name}`,

        amount,

        type: 'out',

        category: 'Fixed Bill',

        status: 'Completed',

        date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),

        createdAt: serverTimestamp(),

        user: userData?.name || 'Admin',

      });

    }

    try { await batch.commit(); } catch { fireToast('Failed to pay all bills. Please try again.', 'error'); return; }

    updateGlobalStats({ expenses: totalExpenses, date: createdAt }).catch(() => {});

    logActivity({ by: userData?.name || 'Admin', byUid: userData?.uid || '', action: 'bills.paid_all', collection: 'monthlyPayments', docId: monthKey, docTitle: `Pay All — ${monthLabel}`, after: { count: unpaidBills.length, total: totalExpenses } }).catch(() => {});

  };



  const saveEditAmount = async (expense: any) => {

    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) return;

    await updateExpense(expense.id, { amount: Number(editAmount) });

    setEditingId(null);

    setEditAmount('');

  };



  const handleAddExpense = async (event: React.FormEvent) => {

    event.preventDefault();

    if (!isAdmin || !newExpense.name || !newExpense.amount || Number(newExpense.amount) <= 0) return;

    try {
      await addExpense({ name: newExpense.name.trim(), amount: Number(newExpense.amount), category: newExpense.category, createdAt: new Date().toISOString() });
    } catch { fireToast('Failed to add bill. Please try again.', 'error'); return; }

    setNewExpense({ name: '', amount: '', category: 'rent' });
    setShowAddForm(false);

  };



  const handleDeleteExpense = (expense: any) => {

    if (!isAdmin) return;

    showConfirm({

      title: 'Delete Bill',

      message: `Delete "${expense.name}" from recurring bills? This will not affect payments already logged.`,

      confirmLabel: 'Delete Bill',

      danger: true,

      onConfirm: async () => { setConfirmDialog(null); await removeExpense(expense.id); },

    });

  };



  const handleSendReminder = async (task: any, daysOverdue: number) => {

    if (!task.clientEmail) { fireToast('No email on file for this client.', 'error'); return; }

    try {

      await sendPaymentReminder(

        task.clientEmail,

        task.client || 'Client',

        settings.studioName || 'Tanvir Studio',

        task.title || 'Studio Project',

        currency || '৳',

        Number(task.due) || 0,

        daysOverdue,

      );

      fireToast(`Reminder sent to ${task.clientEmail}!`, 'success');

    } catch {

      fireToast('Failed to send reminder. Check email settings.', 'error');

    }

  };



  const receivedIncomeKeys = useMemo(() => new Set(

    monthlyIncomeReceipts

      .filter((r: any) => r.monthKey === monthKey)

      .map((r: any) => r.incomeId),

  ), [monthlyIncomeReceipts, monthKey]);



  const toggleIncomeReceived = async (income: any) => {

    if (!isAdmin) return;

    const existingReceipt = monthlyIncomeReceipts.find((r: any) => r.incomeId === income.id && r.monthKey === monthKey);

    const batch = writeBatch(db);

    if (existingReceipt) {

      batch.delete(doc(db, 'monthlyIncomeReceipts', existingReceipt.id));

      const txToDelete = transactions.find((tx: any) => tx.category === 'Recurring Income' && tx.title === `Income: ${income.name}` && isSameMonth(tx.createdAt || tx.date));

      if (txToDelete) batch.delete(doc(db, 'transactions', txToDelete.id));

      try { await batch.commit(); } catch { fireToast('Failed to update income. Please try again.', 'error'); return; }

      const refDate = existingReceipt.receivedAt || new Date().toISOString();

      updateGlobalStats({ income: -(Number(income.amount) || 0), date: refDate }).catch(() => {});

      return;

    }

    const createdAt = makeSelectedMonthDate();

    const receiptRef = doc(collection(db, 'monthlyIncomeReceipts'));

    const txRef = doc(collection(db, 'transactions'));

    batch.set(receiptRef, { incomeId: income.id, monthKey, amount: Number(income.amount) || 0, name: income.name, receivedAt: createdAt, createdAt: serverTimestamp() });

    batch.set(txRef, { title: `Income: ${income.name}`, amount: Number(income.amount) || 0, type: 'in', category: 'Recurring Income', status: 'Completed', date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), createdAt: serverTimestamp(), user: userData?.name || 'Admin' });

    try { await batch.commit(); } catch { fireToast('Failed to record income. Please try again.', 'error'); return; }

    updateGlobalStats({ income: Number(income.amount) || 0, date: createdAt }).catch(() => {});

    logActivity({ by: userData?.name || 'Admin', byUid: userData?.uid || '', action: 'recurring_income.received', collection: 'monthlyIncomeReceipts', docId: receiptRef.id, docTitle: income.name, after: { amount: income.amount, monthKey } }).catch(() => {});

  };



  const handleAddRecurringIncome = async (event: React.FormEvent) => {

    event.preventDefault();

    if (!isAdmin || !newRecurringIncome.name || !newRecurringIncome.amount || Number(newRecurringIncome.amount) <= 0) return;

    await addRecurringIncome({ name: newRecurringIncome.name.trim().slice(0, 100), amount: Number(newRecurringIncome.amount), createdAt: new Date().toISOString() });

    setNewRecurringIncome({ name: '', amount: '' });

    setShowAddIncomeForm(false);

  };



  const handleDeleteRecurringIncome = (income: any) => {

    if (!isAdmin) return;

    showConfirm({

      title: 'Delete Income Source',

      message: `Delete "${income.name}" from recurring income? This will not affect receipts already logged.`,

      confirmLabel: 'Delete',

      danger: true,

      onConfirm: async () => { setConfirmDialog(null); await removeRecurringIncome(income.id); },

    });

  };



  const handleQuickSetup = async () => {

    if (!isAdmin) return;

    for (const expense of QUICK_SETUP_EXPENSES) {

      await addExpense({ ...expense, createdAt: new Date().toISOString() });

    }

  };



  const isDuplicateTransaction = (type: 'in' | 'out', amount: number, description?: string): boolean => {
    const twentyFourHoursAgo = Date.now() - 86400000;
    return monthTransactions.some((tx: any) => {
      if (tx.type !== type) return false;
      if (Math.abs(Number(tx.amount) - amount) > 0.01) return false;
      const d = toJSDate(tx.createdAt || tx.date);
      if (!d || d.getTime() < twentyFourHoursAgo) return false;
      if (description && tx.description && tx.description.trim().toLowerCase() !== description.trim().toLowerCase()) return false;
      return true;
    });
  };

  const handleAddIncome = async (event: React.FormEvent) => {

    event.preventDefault();

    if (!isAdmin || !newIncome.amount || Number(newIncome.amount) <= 0) return;

    const amount = Number(newIncome.amount);

    const doAdd = async () => {

      const createdAt = makeSelectedMonthDate();

      await addTransaction({

        title: 'Cash In',

        amount,

        type: 'in',

        status: 'Completed',

        category: 'Manual Entry',

        account: newIncome.account || 'bKash',

        note: (newIncome.note || `Cash in for ${monthLabel}`).trim().slice(0, 300),

        date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),

        createdAt,

        user: userData?.name || 'Admin',

      });

      updateGlobalStats({ income: amount, date: createdAt }).catch(() => {});

      setShowAddIncome(false);

      setNewIncome({ amount: '', note: '', account: 'bKash' });

    };

    if (isDuplicateTransaction('in', amount)) {

      showConfirm({

        title: 'Duplicate Entry?',

        message: `A Cash In of ${money(amount)} was already recorded in the last 24 hours. Add anyway?`,

        confirmLabel: 'Add Anyway',

        onConfirm: () => { setConfirmDialog(null); doAdd(); },

      });

      return;

    }

    await doAdd();

  };



  const handleAddOneOffExpense = async (event: React.FormEvent) => {

    event.preventDefault();

    if (!isAdmin || !newOneOffExpense.amount || Number(newOneOffExpense.amount) <= 0) return;

    const amount = Number(newOneOffExpense.amount);

    const doAdd = async () => {

      const createdAt = makeSelectedMonthDate();

      await addTransaction({

        title: 'Cash Out',

        amount,

        type: 'out',

        status: 'Completed',

        category: newOneOffExpense.category,

        account: newOneOffExpense.account || 'bKash',

        note: (newOneOffExpense.note || `Cash out for ${monthLabel}`).trim().slice(0, 300),

        attachmentUrl: newOneOffExpense.receiptUrl || '',

        attachmentName: newOneOffExpense.receiptName || '',

        date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),

        createdAt,

        user: userData?.name || 'Admin',

      });

      updateGlobalStats({ expenses: amount, date: createdAt }).catch(() => {});

      setShowAddExpenseModal(false);

      setNewOneOffExpense({ amount: '', note: '', category: 'General', receiptUrl: '', receiptName: '', account: 'bKash' });

    };

    if (isDuplicateTransaction('out', amount)) {

      showConfirm({

        title: 'Duplicate Entry?',

        message: `A Cash Out of ${money(amount)} was already recorded in the last 24 hours. Add anyway?`,

        confirmLabel: 'Add Anyway',

        onConfirm: () => { setConfirmDialog(null); doAdd(); },

      });

      return;

    }

    await doAdd();

  };



  const handlePayWorker = async () => {

    if (!isAdmin || !payModal || !payAmount || payProcessing) return;

    const amount = Number(payAmount);

    if (!amount || amount <= 0) return;

    if (amount > payModal.totalDue) {

      fireToast(`Cannot pay more than ${money(payModal.totalDue)}.`, 'error');

      return;

    }



    setPayProcessing(true);

    try {

      const createdAt = new Date().toISOString();



      // Pre-compute per-task paid amounts before committing (avoids partial mutation)

      let remaining = amount;

      const taskUpdates: { taskId: string; field: 'composerPaid' | 'hummingArtistPaid'; newValue: number }[] = [];

      for (const entry of payModal.tasks) {

        if (remaining <= 0) break;

        const paidForTask = Math.min(entry.due, remaining);

        taskUpdates.push({

          taskId:   entry.task.id,

          field:    entry.fieldPaid as 'composerPaid' | 'hummingArtistPaid',

          newValue: (Number(entry.task[entry.fieldPaid]) || 0) + paidForTask,

        });

        remaining -= paidForTask;

      }



      await atomicPayWorker(

        {

          title:    `Worker Payout: ${payModal.name}`,

          amount,

          type:     'out',

          category: 'Worker Payout',

          status:   'Completed',

          date:     new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),

          createdAt,

          user:     userData?.name || 'Admin',

          note:     payNote.trim() || 'Worker payable settlement',

        },

        {

          workerId:   payModal.workerId,

          workerName: payModal.name,

          amount,

          note:    payNote.trim() || 'Worker payable settlement',

          paidAt:  createdAt,

          paidBy:  userData?.name || 'Admin',

        },

        taskUpdates,

        { name: userData?.name || 'Admin', uid: userData?.uid || '' },

      );

      updateGlobalStats({ expenses: amount, date: createdAt }).catch(() => {});



      setPayModal(null);

      setPayAmount('');

      setPayNote('');

    } catch {

      fireToast('Payment failed. Please try again.', 'error');

    } finally {

      setPayProcessing(false);

    }

  };



  const handleDeleteTx = (tx: any) => {

    if (!isAdmin) return;

    const label = tx.title || (tx.type === 'in' ? 'Cash In' : 'Cash Out');

    showConfirm({

      title: 'Delete Transaction',

      message: `Delete "${label}" (${tx.type === 'in' ? '+' : '-'}${money(Number(tx.amount))})? This cannot be undone.`,

      confirmLabel: 'Delete',

      danger: true,

      onConfirm: async () => {

        setConfirmDialog(null);

        await removeTx(tx.id);

        fireToast('Transaction deleted.', 'info');

      },

    });

  };







  return (

    <div className="mf-page studio-ledger">

      <div className="ledger-header">

        <div>

          <div className="ledger-eyebrow">Studio Ledger</div>

          <h1 className="ledger-title">Finance & Ledger</h1>

          <p className="ledger-subtitle">Cash basis finance, client dues, worker payables, and monthly studio reports.</p>

        </div>

        <div className="ledger-header-actions">

          {isAdmin && (

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, auto)', gap: 8 }}>

              <button className="ledger-action green" onClick={() => setShowAddIncome(true)}><Plus size={16} /> Cash In</button>

              <button className="ledger-action red" onClick={() => setShowAddExpenseModal(true)}><Plus size={16} /> Cash Out</button>

              <button className="ledger-action blue" onClick={() => setActiveTab('workers')}><Wallet size={16} /> Pay Worker</button>

              <button className="ledger-action neutral" onClick={() => setActiveTab('bills')}><ReceiptText size={16} /> Bill Paid</button>

            </div>

          )}

          <div className="ledger-month-card">

            <button onClick={() => navigateMonth(-1)}><ChevronLeft size={18} /></button>

            <span>{monthLabel}</span>

            <button onClick={() => navigateMonth(1)}><ChevronRight size={18} /></button>

          </div>

        </div>

      </div>



      <div className="ledger-kpi-grid">

        <KpiCard label="Balance" value={money(closingBalance)} sub="" tone={closingBalance >= 0 ? 'blue' : 'red'} icon={<Wallet size={20} />} />

        <KpiCard label="Cash in" value={money(cashIn)} sub="" tone="green" icon={<TrendingUp size={20} />} trend={kpiTrend(cashIn, prevMonthData.cashIn)} />

        <KpiCard label="Cash out" value={money(cashOut)} sub="" tone="red" icon={<TrendingDown size={20} />} trend={(() => { const t = kpiTrend(cashOut, prevMonthData.cashOut); return t !== undefined ? -t : undefined; })()} />

        <KpiCard label="Profit" value={money(cashProfit)} sub="" tone={cashProfit >= 0 ? 'green' : 'red'} icon={<Banknote size={20} />} trend={kpiTrend(cashProfit, prevMonthData.profit)} />



        <KpiCard label="Opening" value={money(openingBalance)} sub={prevLedger ? 'from closed ledger' : 'calculated'} tone="purple" icon={<Briefcase size={20} />} />

        <KpiCard label="Clients owe" value={money(totalClientDue)} sub={`${clientDues.length} projects`} tone="orange" icon={<Bell size={20} />} />

        <KpiCard label="Workers owed" value={money(totalWorkerDue)} sub={`ready ${money(totalWorkerReady)} · waiting ${money(totalWorkerWaiting)}`} tone="purple" icon={<UserRound size={20} />} />

        <KpiCard label="Completed" value={money(completedValue)} sub={`${completedProjects.length} projects`} tone="blue" icon={<CheckCircle2 size={20} />} />

      </div>



      {settings.monthlyGoal > 0 && (

        <GoalBar goal={Number(settings.monthlyGoal)} current={cashIn} money={money} />

      )}



      {/* Financial Health Score */}

      <HealthScore

        cashIn={cashIn}

        cashProfit={cashProfit}

        paidBillsCount={paidBills.length}

        totalBillsCount={recurringExpenses.length}

        totalClientDue={totalClientDue}

        avgMonthlyIncome={cashIn}

        money={money}

      />



      <div className="ledger-tabs">

        {[

          ['overview', 'Overview'],

          ['clients', 'Client Dues'],

          ['workers', 'Worker Payables'],

          ['bills', 'Bills'],

          ['transactions', 'Transactions'],

          ['report', 'Monthly Report'],

          ['year', `${selectedYear} Summary`],

        ].map(([id, label]) => (

          <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id as FinanceTab)}>{label}</button>

        ))}

      </div>



      <AnimatePresence mode="wait">

        <motion.div

          key={activeTab}

          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}

          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}

          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}

          transition={{ duration: 0.25, ease: 'easeOut' }}

        >

          {activeTab === 'overview' && (

            <>

              <ActionCenter items={actionItems} currency={currency} />



              {/* Revenue Trend Chart */}

              <section className="ledger-panel" style={{ marginBottom: 24 }}>

                <div className="ledger-panel-head">

                  <div className="ledger-panel-title-wrap">

                    <div className="ledger-panel-icon"><TrendingUp size={18} /></div>

                    <div>

                      <h2>Cash flow</h2>

                    </div>

                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>

                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} /> in

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>

                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)' }} /> out

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>

                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold, #f59e0b)' }} /> profit

                    </div>

                    <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 7, padding: 2, gap: 1, marginLeft: 4 }}>

                      {([3, 6, 12] as const).map(r => (

                        <button

                          key={r}

                          onClick={() => setChartRange(r)}

                          aria-label={`Show last ${r} months`}

                          aria-pressed={chartRange === r}

                          style={{

                            padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',

                            fontSize: 10, fontWeight: 800,

                            background: chartRange === r ? 'var(--card-bg)' : 'transparent',

                            color: chartRange === r ? 'var(--text-primary)' : 'var(--text-tertiary)',

                            boxShadow: chartRange === r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',

                          }}

                        >{r}M</button>

                      ))}

                    </div>

                  </div>

                </div>

                <div className="ledger-panel-body">

                  <div style={{ width: '100%', height: 220 }}>

                    <ResponsiveContainer width="100%" height="100%">

                      <ComposedChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>

                        <defs>

                          <linearGradient id="mfGradIn" x1="0" y1="0" x2="0" y2="1">

                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.12} />

                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />

                          </linearGradient>

                          <linearGradient id="mfGradOut" x1="0" y1="0" x2="0" y2="1">

                            <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.1} />

                            <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />

                          </linearGradient>

                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />

                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} dy={8} />

                        <YAxis hide />

                        <Tooltip

                          formatter={(val: any, name: any) => {
                            const n = Number(val || 0);
                            const labels: Record<string, string> = { cashIn: 'Cash In', cashOut: 'Cash Out', profit: 'Profit' };
                            return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, labels[name] || name];
                          }}

                          contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}

                        />

                        <Area type="monotone" dataKey="cashIn" stroke="var(--color-success)" strokeWidth={2.5} fillOpacity={1} fill="url(#mfGradIn)" />

                        <Area type="monotone" dataKey="cashOut" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#mfGradOut)" />

                        <Line type="monotone" dataKey="profit" stroke="var(--accent-gold, #f59e0b)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-gold, #f59e0b)', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="0" />

                      </ComposedChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              </section>



              <div className="ledger-overview-grid">

                <LedgerPanel title="Need to Collect" icon={<Bell size={18} />} actionLabel="View all" onAction={() => setActiveTab('clients')}>

                  <ClientDueList items={clientDues.slice(0, 5)} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={settings.studioName} empty="No client dues right now." />

                </LedgerPanel>



                <LedgerPanel title="Need to Pay" icon={<Wallet size={18} />} actionLabel="View all" onAction={() => setActiveTab('workers')}>

                  <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables right now." />

                </LedgerPanel>



                <LedgerPanel title="This Month Cash Activity" icon={<Banknote size={18} />} actionLabel="Transactions" onAction={() => setActiveTab('transactions')}>

                  <TransactionList items={monthTransactions.slice(0, 6)} currency={currency} empty="No cash activity this month." />

                </LedgerPanel>



                <LedgerPanel title="Completed This Month" icon={<CheckCircle2 size={18} />} actionLabel="Report" onAction={() => setActiveTab('report')}>

                  <ProjectList items={completedProjects.slice(0, 5)} currency={currency} onInvoice={setInvoiceTask} empty="No completed projects this month." />

                </LedgerPanel>



                <LedgerPanel title="Cash Flow Forecast" icon={<TrendingUp size={18} />} description="Next 3 months projection based on recurring bills + avg income.">

                  <div className="ledger-list">

                    {cashForecast.map((f) => (

                      <div key={f.label} className="ledger-row" style={{ alignItems: 'center' }}>

                        <div className="ledger-row-main">

                          <div className="ledger-row-title" style={{ fontWeight: 700 }}>{f.label}</div>

                          <div className="ledger-row-sub">Avg income {money(f.expectedIncome)} · Bills {money(f.expectedExpenses)}</div>

                        </div>

                        <div className="ledger-row-money">

                          <strong style={{ color: f.netForecast >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>

                            {f.netForecast >= 0 ? '+' : ''}{money(f.netForecast)}

                          </strong>

                          <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>projected net</span>

                        </div>

                      </div>

                    ))}

                  </div>

                </LedgerPanel>

              </div>

            </>

          )}



          {activeTab === 'clients' && (

            <LedgerPanel title="Client Dues" icon={<Bell size={18} />} description="All unpaid projects stay visible here until fully collected.">

              <ClientDueList items={clientDues} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={settings.studioName} empty="No unpaid client projects." />

            </LedgerPanel>

          )}



          {activeTab === 'workers' && (

            <>

              <LedgerPanel title="Worker Payables" icon={<Wallet size={18} />} description="Ready = client cleared (delivered/completed). Waiting = work done but awaiting client clearance.">

                <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables right now." />

              </LedgerPanel>



              {workerPayments.length > 0 && (

                <LedgerPanel title="Payment history" icon={<CheckCircle2 size={18} />}>

                  <WorkerPaymentHistory payments={workerPayments} currency={currency} />

                </LedgerPanel>

              )}

            </>

          )}



          {activeTab === 'bills' && (

            <>

              <LedgerPanel title="Studio Bills" icon={<ReceiptText size={18} />} description={`Fixed operating costs for ${monthLabel}.`}>

                {recurringExpenses.length > 0 && (

                  <div style={{ marginBottom: 14 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>

                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>

                        {paidBills.length} / {recurringExpenses.length} paid

                      </span>

                      <span style={{ fontSize: 12, fontWeight: 800, color: paidBills.length === recurringExpenses.length ? 'var(--color-success)' : 'var(--color-warning)' }}>

                        {Math.round((paidBills.length / recurringExpenses.length) * 100)}%

                      </span>

                    </div>

                    <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

                      <div style={{

                        height: '100%',

                        width: `${Math.round((paidBills.length / recurringExpenses.length) * 100)}%`,

                        background: paidBills.length === recurringExpenses.length ? 'var(--color-success)' : 'var(--color-warning)',

                        borderRadius: 999, transition: 'width 0.4s ease',

                      }} />

                    </div>

                  </div>

                )}

                <div className="ledger-inline-actions">

                  {isAdmin && <button className="ledger-small-button" onClick={() => setShowAddForm(true)}><Plus size={14} /> Add Bill</button>}

                  {isAdmin && recurringExpenses.length === 0 && <button className="ledger-small-button" onClick={handleQuickSetup}>Quick Setup</button>}

                  {isAdmin && unpaidBills.length > 0 && <button className="ledger-small-button primary" onClick={payAll}>Pay All Pending</button>}

                </div>

                <BillList

                  expenses={recurringExpenses}

                  monthlyPayments={monthlyPayments}

                  monthKey={monthKey}

                  currency={currency}

                  isAdmin={isAdmin}

                  editingId={editingId}

                  editAmount={editAmount}

                  setEditingId={setEditingId}

                  setEditAmount={setEditAmount}

                  onSave={saveEditAmount}

                  onToggle={togglePaid}

                  onDelete={handleDeleteExpense}

                />

                <div className="ledger-report-strip">

                  <ReportMini label="Paid Bills" value={money(paidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />

                  <ReportMini label="Pending Bills" value={money(unpaidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />

                </div>

              </LedgerPanel>



              <LedgerPanel title="Recurring Income" icon={<TrendingUp size={18} />} description={`Expected monthly income sources for ${monthLabel}.`}>

                {isAdmin && (

                  <div className="ledger-inline-actions">

                    <button className="ledger-small-button" onClick={() => setShowAddIncomeForm(v => !v)}><Plus size={14} /> Add Source</button>

                  </div>

                )}

                {showAddIncomeForm && (

                  <form onSubmit={handleAddRecurringIncome} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>

                    <input className="ledger-input" style={{ flex: 2, minWidth: 120 }} placeholder="Source name (e.g. Retainer - Client X)" value={newRecurringIncome.name} onChange={e => setNewRecurringIncome(p => ({ ...p, name: e.target.value }))} required />

                    <input className="ledger-input" style={{ flex: 1, minWidth: 80 }} type="number" min="0" placeholder="Amount" value={newRecurringIncome.amount} onChange={e => setNewRecurringIncome(p => ({ ...p, amount: e.target.value }))} required />

                    <button className="ledger-small-button primary" type="submit">Save</button>

                    <button className="ledger-small-button" type="button" onClick={() => setShowAddIncomeForm(false)}>Cancel</button>

                  </form>

                )}

                {recurringIncome.length === 0 ? (

                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600 }}>No recurring income sources added yet.</div>

                ) : (

                  <div className="ledger-list">

                    {recurringIncome.map((income: any) => {

                      const received = receivedIncomeKeys.has(income.id);

                      return (

                        <div key={income.id} className={`ledger-row${received ? ' muted' : ''}`}>

                          <div className="ledger-row-icon" style={{ background: received ? 'rgba(52,199,89,0.1)' : 'rgba(0,122,255,0.08)', color: received ? 'var(--color-success)' : 'var(--color-info)' }}>

                            <TrendingUp size={18} />

                          </div>

                          <div className="ledger-row-main">

                            <div className="ledger-row-title" style={{ textDecoration: received ? 'line-through' : 'none', opacity: received ? 0.6 : 1 }}>{income.name}</div>

                            <div className="ledger-row-sub">{received ? 'Received this month' : 'Pending receipt'}</div>

                          </div>

                          <div className="ledger-row-money">

                            <strong style={{ color: received ? 'var(--color-success)' : 'var(--text-primary)' }}>{currency}{Number(income.amount).toLocaleString()}</strong>

                          </div>

                          {isAdmin && (

                            <div style={{ display: 'flex', gap: 6 }}>

                              <button className={`ledger-row-button${received ? '' : ' primary'}`} onClick={() => toggleIncomeReceived(income)}>

                                {received ? 'Undo' : '✓ Received'}

                              </button>

                              {!received && <button className="ledger-row-button" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteRecurringIncome(income)}>✕</button>}

                            </div>

                          )}

                        </div>

                      );

                    })}

                  </div>

                )}

                <div className="ledger-report-strip" style={{ marginTop: 12 }}>

                  <ReportMini label="Received" value={money(recurringIncome.filter((i: any) => receivedIncomeKeys.has(i.id)).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} tone="green" />

                  <ReportMini label="Pending" value={money(recurringIncome.filter((i: any) => !receivedIncomeKeys.has(i.id)).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0))} />

                </div>

              </LedgerPanel>



              {expensePieData.length > 0 && (

                <LedgerPanel title="Expense Breakdown" icon={<TrendingDown size={18} />} description={`Cash out by category in ${monthLabel}.`}>

                  <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>

                    <PieChart width={180} height={180}>

                      <Tooltip formatter={(val: any) => { const n = Number(val || 0); return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, 'Amount']; }} contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }} />

                      <Pie data={expensePieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} stroke="none" cornerRadius={4}>

                        {expensePieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}

                      </Pie>

                    </PieChart>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>

                      {expensePieData.map((entry: any, i: number) => (

                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.overLimit ? 'var(--color-danger)' : PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />

                          <div style={{ flex: 1, minWidth: 0 }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>

                              <span style={{ fontSize: 13, fontWeight: 700, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>

                                {entry.overLimit && '⚠ '}{entry.name}

                              </span>

                              <span style={{ fontSize: 13, fontWeight: 600, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-primary)', marginLeft: 8, flexShrink: 0 }}>

                                {currency}{entry.value.toLocaleString()}

                                {entry.limit > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}> / {currency}{entry.limit.toLocaleString()}</span>}

                              </span>

                            </div>

                            <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

                              <div style={{ height: '100%', width: entry.limit > 0 ? `${Math.min(100, Math.round((entry.value / entry.limit) * 100))}%` : `${entry.pct}%`, background: entry.overLimit ? 'var(--color-danger)' : PIE_COLORS[i % PIE_COLORS.length], borderRadius: 999 }} />

                            </div>

                          </div>

                          <span style={{ fontSize: 11, fontWeight: 500, color: entry.overLimit ? 'var(--color-danger)' : 'var(--text-tertiary)', minWidth: 32, textAlign: 'right' }}>{entry.pct}%</span>

                        </div>

                      ))}

                    </div>

                  </div>

                </LedgerPanel>

              )}

            </>

          )}



          {activeTab === 'transactions' && (() => {

            const ACCOUNTS = ['bKash', 'Nagad', 'Bank', 'Cash', 'Other'];

            const accountBreakdown = ACCOUNTS.map(acc => {

              const txs = monthTransactions.filter((tx: any) => (tx.account || 'bKash') === acc);

              const inflow = txs.filter((tx: any) => tx.type === 'in').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

              const outflow = txs.filter((tx: any) => tx.type === 'out').reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0);

              return { acc, inflow, outflow, net: inflow - outflow, count: txs.length };

            }).filter(a => a.count > 0);

            return (

              <>

                <LedgerPanel title="Transactions" icon={<Banknote size={18} />} description={`Cash activity recorded in ${monthLabel}.`} actionLabel="↓ Export CSV" onAction={exportTransactionsCSV}>

                  {/* Filter bar */}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Search */}

                    <input

                      className="ledger-input"

                      style={{ flex: 1, minWidth: 160, fontSize: 13 }}

                      placeholder="Search title, note, category…"

                      value={txFilter.search}

                      onChange={e => setTxFilter(f => ({ ...f, search: e.target.value }))}

                    />

                    {/* Type toggle */}

                    <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 8, padding: 2, gap: 2 }}>

                      {(['all', 'in', 'out'] as const).map(t => (

                        <button

                          key={t}

                          onClick={() => setTxFilter(f => ({ ...f, type: t }))}

                          style={{

                            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',

                            fontSize: 11, fontWeight: 800,

                            background: txFilter.type === t ? 'var(--card-bg)' : 'transparent',

                            color: txFilter.type === t

                              ? (t === 'in' ? 'var(--color-success)' : t === 'out' ? 'var(--color-danger)' : 'var(--text-primary)')

                              : 'var(--text-tertiary)',

                            boxShadow: txFilter.type === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',

                          }}

                        >{t === 'all' ? 'All' : t === 'in' ? '↑ In' : '↓ Out'}</button>

                      ))}

                    </div>

                    {/* Category filter */}

                    {txCategories.length > 0 && (

                      <select

                        className="ledger-input"

                        style={{ fontSize: 12, fontWeight: 700, minWidth: 120 }}

                        value={txFilter.category}

                        onChange={e => setTxFilter(f => ({ ...f, category: e.target.value }))}

                      >

                        <option value="">All categories</option>

                        {txCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}

                      </select>

                    )}

                    {/* Clear filters */}

                    {(txFilter.search || txFilter.type !== 'all' || txFilter.category) && (

                      <button

                        className="ledger-small-button"

                        onClick={() => setTxFilter({ type: 'all', search: '', category: '' })}

                        style={{ whiteSpace: 'nowrap' }}

                      >Clear</button>

                    )}

                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>

                      {filteredTransactions.length} / {monthTransactions.length}

                    </span>

                  </div>

                  <TransactionList items={filteredTransactions} currency={currency} empty="No transactions match the filter." onDelete={isAdmin ? handleDeleteTx : undefined} />

                </LedgerPanel>

                {accountBreakdown.length > 0 && (

                  <LedgerPanel title="Account Breakdown" icon={<Wallet size={18} />} description="Cash flow by payment method this month.">

                    <div className="ledger-list">

                      {accountBreakdown.map(({ acc, inflow, outflow, net, count }) => (

                        <div key={acc} className="ledger-row">

                          <div className="ledger-row-icon blue"><Banknote size={18} /></div>

                          <div className="ledger-row-main">

                            <div className="ledger-row-title">{acc}</div>

                            <div className="ledger-row-sub">{count} transaction{count !== 1 ? 's' : ''} · In {money(inflow)} · Out {money(outflow)}</div>

                          </div>

                          <div className="ledger-row-money">

                            <strong style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{net >= 0 ? '+' : ''}{money(net)}</strong>

                            <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>net flow</span>

                          </div>

                        </div>

                      ))}

                    </div>

                  </LedgerPanel>

                )}

              </>

            );

          })()}



          {activeTab === 'report' && (

            <div className="ledger-report-grid">

              <LedgerPanel title="Budget vs Actual" icon={<TrendingUp size={18} />} description="Completed projects — collected cash vs worker costs. Full margin = if fully paid.">

                {budgetVsActualData.length === 0 ? (

                  <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600 }}>No completed projects this month.</div>

                ) : (

                  <>

                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>

                        <thead>

                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>

                            {['Project', 'Budget', 'Collected', 'Worker Cost', 'Cash Margin', 'Full Margin'].map(h => (

                              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Project' ? 'left' : 'right', fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>

                            ))}

                          </tr>

                        </thead>

                        <tbody>

                          {budgetVsActualData.map((row: any) => (

                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>

                              <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</td>

                              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>

                                {money(row.budget)}

                                {row.taxAmount > 0 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{money(row.taxAmount)} tax</div>}

                              </td>

                              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: row.collectedPct >= 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>

                                {money(row.clientPaid)}

                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{row.collectedPct}% collected</div>

                              </td>

                              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>{money(row.totalCost)}</td>

                              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: row.cashMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>

                                {money(row.cashMargin)}

                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>actual cash</div>

                              </td>

                              <td style={{ padding: '10px 10px', textAlign: 'right' }}>

                                <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: row.marginPct >= 50 ? 'rgba(52,199,89,0.1)' : row.marginPct >= 25 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.1)', color: row.marginPct >= 50 ? 'var(--color-success)' : row.marginPct >= 25 ? 'var(--color-warning)' : 'var(--color-danger)' }}>

                                  {money(row.margin)} · {row.marginPct}%

                                </span>

                              </td>

                            </tr>

                          ))}

                        </tbody>

                        <tfoot>

                          <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-color)' }}>

                            <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>Total ({budgetVsActualData.length})</td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.grossRevenue, 0))}</td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-warning)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.clientPaid, 0))}</td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-warning)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.totalCost, 0))}</td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.cashMargin, 0))}</td>

                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(budgetVsActualData.reduce((s: number, r: any) => s + r.margin, 0))}</td>

                          </tr>

                        </tfoot>

                      </table>

                    </div>

                  </>

                )}

              </LedgerPanel>



              <LedgerPanel title="Monthly Cash Summary" icon={<FileText size={18} />}>

                <div className="ledger-report-strip">

                  <ReportMini label="Opening Balance" value={money(openingBalance)} tone="neutral" />

                  <ReportMini label="Cash In" value={money(cashIn)} tone="green" />

                  <ReportMini label="Cash Out" value={money(cashOut)} tone="red" />

                  <ReportMini label="Cash Profit" value={money(cashProfit)} tone={cashProfit >= 0 ? 'blue' : 'red'} />

                  <ReportMini label="Closing Balance" value={money(closingBalance)} tone="neutral" />

                </div>

                {/* Accrual view: deduct unpaid worker dues from cash profit for true picture */}

                <div className="ledger-report-strip" style={{ marginTop: 12 }}>

                  <ReportMini label="Worker Dues (unpaid)" value={money(totalWorkerDue)} tone={totalWorkerDue > 0 ? 'red' : ''} />

                  <ReportMini

                    label="Accrual Profit"

                    value={money(cashProfit - totalWorkerDue)}

                    tone={(cashProfit - totalWorkerDue) >= 0 ? 'blue' : 'red'}

                  />

                  <ReportMini label="Completed Value" value={money(completedValue)} />

                  <ReportMini label="Completed Due" value={money(completedDue)} tone={completedDue > 0 ? 'red' : ''} />

                </div>

                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>

                  Accrual Profit = Cash Profit minus all unpaid worker commissions (money earned but not yet paid out).

                </div>

              </LedgerPanel>



              <LedgerPanel title="Completed Projects" icon={<CheckCircle2 size={18} />}>

                <ProjectList items={completedProjects} currency={currency} onInvoice={setInvoiceTask} empty="No completed projects this month." />

              </LedgerPanel>



              <LedgerPanel title="Client Due Register" icon={<Bell size={18} />}>

                <ClientDueList items={clientDues} currency={currency} onInvoice={setInvoiceTask} onRemind={handleSendReminder} studioName={settings.studioName} empty="No client dues." />

              </LedgerPanel>



              <LedgerPanel title="Worker Payable Register" icon={<Wallet size={18} />}>

                <WorkerDueList registry={workerRegistry} currency={currency} expandedWorker={expandedWorker} setExpandedWorker={setExpandedWorker} onPay={setPayModal} empty="No worker payables." />

              </LedgerPanel>



              <LedgerPanel title="Cash Activity" icon={<Banknote size={18} />}>

                <TransactionList items={monthTransactions} currency={currency} empty="No transactions recorded this month." />

              </LedgerPanel>



              <LedgerPanel title="Bills Summary" icon={<ReceiptText size={18} />}>

                <div className="ledger-report-strip">

                  <ReportMini label="Paid Bills" value={money(paidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} tone="red" />

                  <ReportMini label="Pending Bills" value={money(unpaidBills.reduce((sum: number, bill: any) => sum + (Number(bill.amount) || 0), 0))} />

                </div>

                <div style={{ marginTop: 12 }}>

                  <BillList

                    expenses={recurringExpenses}

                    monthlyPayments={monthlyPayments}

                    monthKey={monthKey}

                    currency={currency}

                    isAdmin={isAdmin}

                    editingId={editingId}

                    editAmount={editAmount}

                    setEditingId={setEditingId}

                    setEditAmount={setEditAmount}

                    onSave={saveEditAmount}

                    onToggle={togglePaid}

                  />

                </div>

              </LedgerPanel>



              {/* Report actions */}

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>

                <button className="ledger-action neutral" onClick={exportReportCSV}>

                  <TrendingDown size={14} /> Export P&amp;L CSV

                </button>

                <button

                  className="ledger-action blue"

                  onClick={() => {

                    const bva = budgetVsActualData;

                    const totalBudget = bva.reduce((s: number, r: any) => s + r.budget, 0);

                    const totalCost = bva.reduce((s: number, r: any) => s + r.totalCost, 0);

                    const totalMargin = bva.reduce((s: number, r: any) => s + r.margin, 0);

                    const marginPct = totalBudget > 0 ? Math.round((totalMargin / totalBudget) * 100) : 0;

                    const lines = [

                      `📊 ${monthLabel} Finance Summary`,

                      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,

                      `Opening Balance : ${money(openingBalance)}`,

                      `Cash In         : ${money(cashIn)}`,

                      `Cash Out        : ${money(cashOut)}`,

                      `Cash Profit     : ${money(cashProfit)}`,

                      `Closing Balance : ${money(closingBalance)}`,

                      ``,

                      `Client Due      : ${money(totalClientDue)}`,

                      `Worker Due      : ${money(totalWorkerDue)}`,

                      ``,

                      `Completed Projects (${bva.length})`,

                      `  Budget  : ${money(totalBudget)}`,

                      `  Costs   : ${money(totalCost)}`,

                      `  Margin  : ${money(totalMargin)} (${marginPct}%)`,

                      ``,

                      bva.map((r: any) => `  • ${r.title}: collected ${money(r.clientPaid)}/${money(r.grossRevenue)} · cash margin ${money(r.cashMargin)} · full margin ${money(r.margin)} (${r.marginPct}%)`).join('\n'),

                    ];

                    navigator.clipboard.writeText(lines.join('\n'));

                    fireToast('Summary copied to clipboard!');

                  }}

                >

                  <FileText size={14} /> Copy Summary

                </button>

              </div>

            </div>

          )}



          {activeTab === 'year' && (

            <div>

              {/* Year selector */}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>

                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{selectedYear} Annual Overview</div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                  <button className="ledger-action neutral" style={{ padding: '8px 14px' }} onClick={() => setSelectedYear(y => y - 1)}><ChevronLeft size={16} /></button>

                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', minWidth: 50, textAlign: 'center' }}>{selectedYear}</span>

                  <button className="ledger-action neutral" style={{ padding: '8px 14px' }} onClick={() => setSelectedYear(y => y + 1)}><ChevronRight size={16} /></button>

                </div>

              </div>



              {/* Year KPIs */}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>

                {[

                  { label: 'Total Cash In', value: money(yearSummaryData.reduce((s, r) => s + r.cashIn, 0)), color: 'var(--color-success)' },

                  { label: 'Total Cash Out', value: money(yearSummaryData.reduce((s, r) => s + r.cashOut, 0)), color: 'var(--color-danger)' },

                  { label: 'Net Profit', value: money(yearSummaryData.reduce((s, r) => s + r.profit, 0)), color: yearSummaryData.reduce((s, r) => s + r.profit, 0) >= 0 ? 'var(--color-info)' : 'var(--color-danger)' },

                  { label: 'Best Month', value: (() => { const active = yearSummaryData.filter(r => r.cashIn > 0 || r.cashOut > 0); if (!active.length) return '—'; const best = active.reduce((b, r) => r.profit > b.profit ? r : b, active[0]); return best.month; })(), color: 'var(--accent-purple)' },

                ].map(k => (

                  <div key={k.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '14px 16px' }}>

                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 6 }}>{k.label}</div>

                    <div style={{ fontSize: 18, fontWeight: 700, color: k.color, letterSpacing: '-0.4px' }}>{k.value}</div>

                  </div>

                ))}

              </div>



              {/* 12-month bar chart */}

              <section className="ledger-panel" style={{ marginBottom: 24 }}>

                <div className="ledger-panel-head">

                  <div className="ledger-panel-title-wrap">

                    <div className="ledger-panel-icon"><TrendingUp size={18} /></div>

                    <div><h2>{selectedYear} Cash Flow</h2><p>Monthly cash in vs cash out</p></div>

                  </div>

                </div>

                <div className="ledger-panel-body">

                  <div style={{ width: '100%', height: 200 }}>

                    <ResponsiveContainer width="100%" height="100%">

                      <AreaChart data={yearSummaryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>

                        <defs>

                          <linearGradient id="yrGradIn" x1="0" y1="0" x2="0" y2="1">

                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.12} />

                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />

                          </linearGradient>

                          <linearGradient id="yrGradOut" x1="0" y1="0" x2="0" y2="1">

                            <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.1} />

                            <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />

                          </linearGradient>

                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />

                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} dy={8} />

                        <YAxis hide />

                        <Tooltip

                          formatter={(val: any, name: any) => { const n = Number(val || 0); return [`${currency}${isNaN(n) ? '0' : n.toLocaleString()}`, name === 'cashIn' ? 'Cash In' : 'Cash Out']; }}

                          contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, fontSize: 13 }}

                        />

                        <Area type="monotone" dataKey="cashIn" stroke="var(--color-success)" strokeWidth={2.5} fillOpacity={1} fill="url(#yrGradIn)" />

                        <Area type="monotone" dataKey="cashOut" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#yrGradOut)" />

                      </AreaChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              </section>



              {/* 12-month table grid */}

              <section className="ledger-panel">

                <div className="ledger-panel-head">

                  <div className="ledger-panel-title-wrap">

                    <div className="ledger-panel-icon"><FileText size={18} /></div>

                    <div><h2>Month-by-Month Breakdown</h2><p>Click a month to view details</p></div>

                  </div>

                </div>

                <div className="ledger-panel-body" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 360 }}>

                    <thead>

                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>

                        {['Month', 'Cash In', 'Cash Out', 'Profit', 'Status'].map(h => (

                          <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Month' ? 'left' : 'right', fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}>{h}</th>

                        ))}

                      </tr>

                    </thead>

                    {(() => {
                        const activeMonths = yearSummaryData.filter(r => r.cashIn > 0 || r.cashOut > 0);
                        const bestIdx  = activeMonths.length > 0 ? activeMonths.reduce((b, r) => r.profit > b.profit ? r : b, activeMonths[0]).mIndex : -1;
                        const worstIdx = activeMonths.length > 0 ? activeMonths.reduce((w, r) => r.profit < w.profit ? r : w, activeMonths[0]).mIndex : -1;
                        const maxIn = Math.max(...yearSummaryData.map(r => r.cashIn), 1);
                        return (
                    <>
                    <tbody>

                      {yearSummaryData.map((row) => {

                        const isCurrentMonth = row.mIndex === now.getMonth() && selectedYear === now.getFullYear();

                        const isSelected = row.mIndex === selectedMonth;

                        const isBest  = row.mIndex === bestIdx  && row.cashIn > 0;

                        const isWorst = row.mIndex === worstIdx && row.profit < 0;

                        const rowBg = isSelected ? 'rgba(0,122,255,0.06)' : isBest ? 'rgba(52,199,89,0.06)' : isWorst ? 'rgba(255,59,48,0.05)' : 'transparent';

                        return (

                          <tr

                            key={row.month}

                            onClick={() => { setSelectedMonth(row.mIndex); setActiveTab('overview'); }}

                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: rowBg, transition: 'background 0.15s' }}

                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,122,255,0.06)')}

                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}

                          >

                            <td style={{ padding: '12px 16px', fontWeight: 700, color: isCurrentMonth ? 'var(--color-info)' : 'var(--text-primary)' }}>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

                                {row.fullMonth}

                                {isCurrentMonth && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-info)', background: 'rgba(0,122,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>NOW</span>}

                                {isBest  && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-success)', background: 'rgba(52,199,89,0.12)', padding: '1px 6px', borderRadius: 4 }}>BEST</span>}

                                {isWorst && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-danger)',  background: 'rgba(255,59,48,0.1)',  padding: '1px 6px', borderRadius: 4 }}>LOSS</span>}

                              </div>

                              {row.cashIn > 0 && (

                                <div style={{ marginTop: 4, height: 3, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden', width: 80 }}>

                                  <div style={{ height: '100%', width: `${Math.round((row.cashIn / maxIn) * 100)}%`, background: 'var(--color-info)', borderRadius: 2 }} />

                                </div>

                              )}

                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: row.cashIn > 0 ? 'var(--color-success)' : 'var(--text-tertiary)' }}>{row.cashIn > 0 ? money(row.cashIn) : '—'}</td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: row.cashOut > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>{row.cashOut > 0 ? money(row.cashOut) : '—'}</td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: row.profit > 0 ? 'var(--color-success)' : row.profit < 0 ? 'var(--color-danger)' : 'var(--text-tertiary)' }}>

                              {row.cashIn > 0 || row.cashOut > 0 ? money(row.profit) : '—'}

                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>

                              {isCurrentMonth

                                  ? <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-info)', background: 'rgba(0,122,255,0.1)', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(0,122,255,0.2)' }}>Live</span>

                                  : <span style={{ fontSize: 10, fontWeight: 500, color: '#8E8E93', background: 'rgba(142,142,147,0.1)', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(142,142,147,0.2)' }}>Done</span>

                              }

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                    <tfoot>

                      <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-color)' }}>

                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>Year Total</td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{money(yearSummaryData.reduce((s, r) => s + r.cashIn, 0))}</td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>{money(yearSummaryData.reduce((s, r) => s + r.cashOut, 0))}</td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: yearSummaryData.reduce((s, r) => s + r.profit, 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{money(yearSummaryData.reduce((s, r) => s + r.profit, 0))}</td>

                        <td />

                      </tr>

                    </tfoot>
                    </>
                        );})()}

                  </table>

                </div>

              </section>



              {/* Tax Summary */}

              {(() => {

                const totalIn = yearSummaryData.reduce((s, r) => s + r.cashIn, 0);

                const totalOut = yearSummaryData.reduce((s, r) => s + r.cashOut, 0);

                const netProfit = totalIn - totalOut;

                const taxRate = Number(settings.invoiceTaxRate) || 0;

                const estimatedTax = taxRate > 0 ? Math.round(netProfit * (taxRate / 100)) : 0;

                const profitMargin = totalIn > 0 ? Math.round((netProfit / totalIn) * 100) : 0;

                return (

                  <section className="ledger-panel" style={{ marginTop: 16 }}>

                    <div className="ledger-panel-head">

                      <div className="ledger-panel-title-wrap">

                        <div className="ledger-panel-icon"><FileText size={18} /></div>

                        <div><h2>{selectedYear} Tax Summary</h2><p>Annual P&amp;L and estimated tax liability</p></div>

                      </div>

                    </div>

                    <div className="ledger-panel-body">

                      <div className="ledger-report-strip">

                        <ReportMini label="Gross Income" value={money(totalIn)} tone="green" />

                        <ReportMini label="Total Expenses" value={money(totalOut)} tone="red" />

                        <ReportMini label="Net Profit" value={money(netProfit)} tone={netProfit >= 0 ? 'blue' : 'red'} />

                        <ReportMini label="Profit Margin" value={`${profitMargin}%`} tone={profitMargin >= 30 ? 'green' : profitMargin >= 10 ? 'orange' : 'red'} />

                        {taxRate > 0 && <ReportMini label={`Tax Est. (${taxRate}%)`} value={money(estimatedTax)} tone="red" />}

                        {taxRate > 0 && <ReportMini label="After-Tax Profit" value={money(netProfit - estimatedTax)} tone="blue" />}

                      </div>

                      {taxRate === 0 && (

                        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>

                          Set a tax rate in Settings → Invoice to see estimated tax liability.

                        </div>

                      )}

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>

                        <button className="ledger-action neutral" onClick={() => {

                          const lines = [

                            `${selectedYear} Annual Tax Summary`,

                            `Gross Income  : ${money(totalIn)}`,

                            `Total Expenses: ${money(totalOut)}`,

                            `Net Profit    : ${money(netProfit)}`,

                            `Profit Margin : ${profitMargin}%`,

                            taxRate > 0 ? `Tax Est (${taxRate}%): ${money(estimatedTax)}` : '',

                            taxRate > 0 ? `After-Tax Profit: ${money(netProfit - estimatedTax)}` : '',

                          ].filter(Boolean).join('\n');

                          navigator.clipboard.writeText(lines);

                          fireToast('Tax summary copied!');

                        }}>

                          <FileText size={14} /> Copy Tax Summary

                        </button>

                      </div>

                    </div>

                  </section>

                );

              })()}

            </div>

          )}

        </motion.div>

      </AnimatePresence>



      <FinanceModals

        currency={currency}

        monthLabel={monthLabel}

        showAddForm={showAddForm}

        setShowAddForm={setShowAddForm}

        newExpense={newExpense}

        setNewExpense={setNewExpense}

        handleAddExpense={handleAddExpense}

        payModal={payModal}

        setPayModal={setPayModal}

        payAmount={payAmount}

        setPayAmount={setPayAmount}

        payNote={payNote}

        setPayNote={setPayNote}

        handlePayWorker={handlePayWorker}

        payProcessing={payProcessing}

        showAddIncome={showAddIncome}

        setShowAddIncome={setShowAddIncome}

        newIncome={newIncome}

        setNewIncome={setNewIncome}

        handleAddIncome={handleAddIncome}

        showAddExpenseModal={showAddExpenseModal}

        setShowAddExpenseModal={setShowAddExpenseModal}

        newOneOffExpense={newOneOffExpense}

        setNewOneOffExpense={setNewOneOffExpense}

        handleAddOneOffExpense={handleAddOneOffExpense}

        uploadingReceipt={uploadingReceipt}

        setUploadingReceipt={setUploadingReceipt}

      />



      {invoiceTask && <InvoiceModal task={invoiceTask} onClose={() => setInvoiceTask(null)} />}

      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

      <AnimatePresence>

        {confirmDialog && (

          <ConfirmDialog

            title={confirmDialog.title}

            message={confirmDialog.message}

            confirmLabel={confirmDialog.confirmLabel}

            danger={confirmDialog.danger}

            onConfirm={confirmDialog.onConfirm}

            onCancel={() => setConfirmDialog(null)}

          />

        )}

      </AnimatePresence>

    </div>

  );

}



function GoalBar({ goal, current, money }: { goal: number; current: number; money: (n: number) => string }) {

  const pct = Math.min(100, Math.round((current / goal) * 100));

  const over = current >= goal;

  return (

    <div style={{ marginTop: 12, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>

        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Income Goal</span>

        <span style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--color-success)' : 'var(--text-secondary)' }}>

          {money(current)} / {money(goal)} &nbsp;·&nbsp; {pct}%{over ? ' ✓' : ''}

        </span>

      </div>

      <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: over ? 'var(--color-success)' : pct >= 75 ? 'var(--color-warning)' : 'var(--color-info)', transition: 'width 0.4s ease' }} />

      </div>

      {!over && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{money(goal - current)} remaining to hit target</div>}

    </div>

  );

}



function HealthScore({ cashIn, cashProfit, paidBillsCount, totalBillsCount, totalClientDue, avgMonthlyIncome, money }: {

  cashIn: number; cashProfit: number; paidBillsCount: number; totalBillsCount: number;

  totalClientDue: number; avgMonthlyIncome: number; money: (n: number) => string;

}) {

  // Profit margin (0–40): positive margin scaled to 40 pts

  const marginScore = cashIn > 0 ? Math.max(0, Math.min(40, Math.round((cashProfit / cashIn) * 40))) : 0;

  // Bill payment rate (0–30)

  const billScore = totalBillsCount > 0 ? Math.round((paidBillsCount / totalBillsCount) * 30) : 30;

  // All-time collection score (0–30): use 3× avg monthly income as max-due benchmark

  const dueBenchmark = Math.max(avgMonthlyIncome * 3, 1);

  const collectionScore = Math.max(0, Math.round((1 - Math.min(1, totalClientDue / dueBenchmark)) * 30));

  const score = marginScore + billScore + collectionScore;

  const grade = score >= 80 ? { label: 'Excellent', color: '#15803d', bg: '#f0fdf4' }

    : score >= 60 ? { label: 'Good', color: '#1d4ed8', bg: '#eff6ff' }

    : score >= 40 ? { label: 'Fair', color: '#b45309', bg: '#fffbeb' }

    : { label: 'Needs Attention', color: '#b91c1c', bg: '#fef2f2' };

  return (

    <div style={{ marginTop: 12, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>

        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Financial Health Score</span>

        <span style={{ fontSize: 13, fontWeight: 800, padding: '2px 10px', borderRadius: 20, background: grade.bg, color: grade.color }}>{grade.label}</span>

      </div>

      <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>

        <div style={{ height: '100%', width: `${score}%`, borderRadius: 999, background: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-info)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)', transition: 'width 0.5s ease' }} />

      </div>

      <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, flexWrap: 'wrap' }}>

        <span>Profit margin: {marginScore}/40</span>

        <span>Bills paid: {billScore}/30</span>

        <span title={`${money(totalClientDue)} outstanding vs benchmark ${money(dueBenchmark)}`}>Collection: {collectionScore}/30</span>

        <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{score}/100</span>

      </div>

    </div>

  );

}



function KpiCard({ label, value, sub, tone, icon, trend }: {
  label: string; value: string; sub: string; tone: string; icon: React.ReactNode; trend?: number;
}) {

  const hasTrend = trend !== undefined && trend !== 0;

  return (

    <div className={`ledger-kpi ${tone}`}>

      <div className="ledger-kpi-icon">{icon}</div>

      <div className="ledger-kpi-label">{label}</div>

      <div className="ledger-kpi-value">{value}</div>

      <div className="ledger-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

        {hasTrend ? (

          <span style={{ color: trend! > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700, fontSize: 11 }}>

            {trend! > 0 ? '↑' : '↓'} {Math.abs(trend!)}% vs last mo

          </span>

        ) : (

          sub || null

        )}

      </div>

    </div>

  );

}



function LedgerPanel({ title, icon, description, actionLabel, onAction, children }: { title: string; icon: React.ReactNode; description?: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {

  return (

    <section className="ledger-panel">

      <div className="ledger-panel-head">

        <div className="ledger-panel-title-wrap">

          <div className="ledger-panel-icon">{icon}</div>

          <div>

            <h2>{title}</h2>

            {description && <p>{description}</p>}

          </div>

        </div>

        {actionLabel && onAction && <button className="ledger-small-button" onClick={onAction}>{actionLabel}</button>}

      </div>

      <div className="ledger-panel-body">{children}</div>

    </section>

  );

}



function ActionCenter({ items, currency }: { items: any[]; currency: string }) {

  return (

    <section className="ledger-action-center">

      <div className="ledger-action-center-head">

        <div>

          <div className="ledger-action-center-title">Priority Actions</div>

          <div className="ledger-action-center-sub">Collect dues, settle payable work, and clear monthly bills.</div>

        </div>

        <div className="ledger-action-count">{items.length} open</div>

      </div>



      {items.length === 0 ? (

        <div className="ledger-action-empty">

          <CheckCircle2 size={20} />

          All finance actions are clear.

        </div>

      ) : (

        <div className="ledger-action-list">

          {items.map((item: any) => (

            <div key={item.id} className={`ledger-action-item ${item.tone}`}>

              <div className="ledger-action-dot">

                {item.tone === 'red' ? <AlertTriangle size={16} /> : item.tone === 'orange' ? <Wallet size={16} /> : <Bell size={16} />}

              </div>

              <div className="ledger-row-main">

                <div className="ledger-row-title">{item.title}</div>

                <div className="ledger-row-sub">{item.sub}</div>

              </div>

              <div className="ledger-row-money">

                <strong>{currency}{Number(item.amount).toLocaleString()}</strong>

              </div>

              <button className="ledger-row-button" onClick={item.action}>{item.label}</button>

            </div>

          ))}

        </div>

      )}

    </section>

  );

}


