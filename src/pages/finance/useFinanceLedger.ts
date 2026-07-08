/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useMemo, useState, useEffect, useRef, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { writeBatch, doc, collection, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { atomicPayWorker } from '../../utils/atomicOps';
import { updateGlobalStats } from '../../utils/statsUpdater';
import { logActivity } from '../../utils/auditLog';
import { sendPaymentReminder } from '../../utils/emailApi';
import type { TxFilter } from './TransactionsTab';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const QUICK_SETUP_EXPENSES = [
  { name: 'Studio Rent', amount: 0, category: 'rent' },
  { name: 'Electricity Bill', amount: 0, category: 'utility' },
  { name: 'Internet Bill', amount: 0, category: 'internet' },
];

export type FinanceTab = 'overview' | 'clients' | 'workers' | 'bills' | 'transactions' | 'report' | 'year';

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

export function useFinanceLedger() {
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
  const [txFilter, setTxFilter] = useState<TxFilter>({ type: 'all', search: '', category: '' });

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

  const handleAddExpense = async (event: FormEvent) => {
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

  const handleAddRecurringIncome = async (event: FormEvent) => {
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

  const handleAddIncome = async (event: FormEvent) => {
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

  const handleAddOneOffExpense = async (event: FormEvent) => {
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

  return {
    isMobile, isAdmin, userData, settings, currency,
    now, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth,
    activeTab, setActiveTab,
    expandedWorker, setExpandedWorker,
    editingId, editAmount, setEditingId, setEditAmount,
    showAddForm, setShowAddForm, newExpense, setNewExpense,
    showAddIncomeForm, setShowAddIncomeForm, newRecurringIncome, setNewRecurringIncome,
    showAddIncome, setShowAddIncome, newIncome, setNewIncome,
    showAddExpenseModal, setShowAddExpenseModal, newOneOffExpense, setNewOneOffExpense,
    uploadingReceipt, setUploadingReceipt,
    payModal, setPayModal, payAmount, setPayAmount, payNote, setPayNote, payProcessing,
    invoiceTask, setInvoiceTask,
    showToast, setShowToast, toastMsg, toastType, fireToast,
    confirmDialog, setConfirmDialog,
    chartRange, setChartRange,
    txFilter, setTxFilter,

    recurringExpenses, monthlyPayments, recurringIncome, workerPayments,

    monthKey, monthLabel, money,

    openingBalance, cashIn, cashOut, closingBalance, cashProfit, prevLedger, prevMonthData, kpiTrend,

    clientDues, workerRegistry, completedProjects, unpaidBills, paidBills,
    totalClientDue, totalWorkerDue, totalWorkerReady, totalWorkerWaiting,

    trendChartData, expensePieData, yearSummaryData, budgetVsActualData,
    completedValue, completedDue,

    monthTransactions, exportTransactionsCSV, txCategories, filteredTransactions,

    exportReportCSV, cashForecast, actionItems, navigateMonth,

    togglePaid, payAll, saveEditAmount, handleAddExpense, handleDeleteExpense, handleSendReminder,
    receivedIncomeKeys, toggleIncomeReceived, handleAddRecurringIncome, handleDeleteRecurringIncome, handleQuickSetup,
    handleAddIncome, handleAddOneOffExpense, handlePayWorker, handleDeleteTx,
  };
}
