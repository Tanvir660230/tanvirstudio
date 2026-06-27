import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, PackageOpen, Users,
  CheckCircle2, Clock, AlertCircle, Tag, Download, Activity,
  Briefcase, Globe, Wallet, Target, RefreshCw, PieChart as PieChartIcon,
  Mail, Banknote, Edit2, Check, X, Lightbulb
} from 'lucide-react';
import { atomicPayWorker } from '../utils/atomicOps';
import { sendPaymentReminder } from '../utils/emailApi';
import { Toast } from '../components/Toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PALETTE = ['var(--color-info)', 'var(--color-success)', 'var(--color-warning)', 'var(--accent-purple)', 'var(--color-danger)', '#30B0C7', '#FF6B00'];
const RANGE_OPTS = [
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '12m', label: '12 Months' },
  { key: 'ytd', label: 'Year to Date' }
];

type RangeKey = '3m' | '6m' | '12m' | 'ytd' | 'custom';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } }
};

const StatCard = ({ label, value, icon, color, trend, sub, alert }: any) => (
  <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: trend >= 0 ? 'var(--color-success)15' : 'var(--color-danger)15', color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: 12, fontWeight: 700 }}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>{sub}</div>}
    {alert && <div style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{alert}</div>}
  </div>
);

export function Analytics() {
  const { userData } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { tasks, tasksLoading, transactions, txLoading, clients, clientsLoading, users } = useData();
  const navigate = useNavigate();
  const currency = settings.currency || '৳';
  const monthlyGoal = (settings as any).monthlyGoal || 100000;

  const [range, setRange] = useState<RangeKey>('6m');
  const [customStart, setCustomStart] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0,10));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0,10));

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal.toString());

  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({ show: false, msg: '', type: 'success' });
  const [payModal, setPayModal] = useState({ isOpen: false, workerId: '', workerName: '', amount: 0, method: 'Cash', date: new Date().toISOString().slice(0,10), loading: false });
  const [drillModal, setDrillModal] = useState<{isOpen: boolean, title: string, data: any[]}>({ isOpen: false, title: '', data: [] });

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const handleSaveGoal = async () => {
    const val = parseInt(tempGoal.replace(/\D/g, ''));
    if (!isNaN(val) && val > 0) {
      await updateSettings({ monthlyGoal: val });
      showToast('Monthly goal updated', 'success');
    }
    setIsEditingGoal(false);
  };

  const handlePayWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayModal(p => ({ ...p, loading: true }));
    try {
      await atomicPayWorker(payModal.workerId, payModal.amount, payModal.method, payModal.date, userData?.name || 'Admin', null);
      showToast('Payment successful', 'success');
      setPayModal(p => ({ ...p, isOpen: false }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPayModal(p => ({ ...p, loading: false }));
    }
  };

  const handleSendReminder = async (clientName: string, amountDue: number) => {
    try {
      const clientObj = clients.find((c:any) => c.name === clientName);
      if (!clientObj || !clientObj.email) throw new Error('Client email not found');
      await sendPaymentReminder(clientObj.email, clientName, amountDue, currency, '');
      showToast(`Reminder sent to ${clientName}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const monthList = useMemo(() => {
    const now = new Date();
    if (range === 'ytd') {
      return Array.from({ length: now.getMonth() + 1 }, (_, i) => ({ mon: i, yr: now.getFullYear() }));
    }
    if (range === 'custom') return []; // Handled separately
    const count = range === '3m' ? 3 : range === '6m' ? 6 : 12;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
      return { mon: d.getMonth(), yr: d.getFullYear() };
    });
  }, [range]);

  const sumTx = useCallback((mon: number, yr: number, type: 'in' | 'out') =>
    transactions
      .filter(t => {
        if (t.type !== type || t.status !== 'Completed') return false;
        const td = new Date((t as any).createdAt || (t as any).date || 0);
        return td.getMonth() === mon && td.getFullYear() === yr;
      })
      .reduce((s, t) => s + (Number((t as any).amount) || 0), 0), [transactions]);

  const sumCustomTx = useCallback((start: string, end: string, type: 'in' | 'out') =>
    transactions
      .filter(t => {
        if (t.type !== type || t.status !== 'Completed') return false;
        const dStr = (t as any).createdAt || (t as any).date || '';
        return dStr >= start && dStr <= end;
      })
      .reduce((s, t) => s + (Number((t as any).amount) || 0), 0), [transactions]);

  const monthlyRevenue = useMemo(() => {
    if (range === 'custom') {
      const rev = sumCustomTx(customStart, customEnd, 'in');
      const exp = sumCustomTx(customStart, customEnd, 'out');
      return [{ month: 'Custom Range', mon: 0, yr: 0, revenue: rev, expense: exp, profit: rev - exp }];
    }
    return monthList.map(({ mon, yr }) => {
      const revenue = sumTx(mon, yr, 'in');
      const expense = sumTx(mon, yr, 'out');
      return { month: MONTHS[mon], mon, yr, revenue, expense, profit: revenue - expense };
    });
  }, [monthList, sumTx, range, customStart, customEnd, sumCustomTx]);

  const chartData = useMemo(() => monthlyRevenue.map(m => ({ ...m })), [monthlyRevenue]);

  const getWorkerName = (uid: string) => {
    if (!users || !Array.isArray(users)) return String(uid).substring(0, 8) || 'Unknown';
    const worker = users.find((u: any) => String(u.id) === String(uid) || String(u.uid) === String(uid));
    return worker?.name || String(uid).substring(0, 8) || 'Unknown';
  };

  const kpis = useMemo(() => {
    const now = new Date();
    const thisM = now.getMonth(), thisY = now.getFullYear();
    const prevM = thisM === 0 ? 11 : thisM - 1;
    const prevY = thisM === 0 ? thisY - 1 : thisY;

    let thisRev, thisExp, trend = 0;
    
    if (range === 'custom') {
      thisRev = sumCustomTx(customStart, customEnd, 'in');
      thisExp = sumCustomTx(customStart, customEnd, 'out');
    } else {
      thisRev = sumTx(thisM, thisY, 'in');
      thisExp = sumTx(thisM, thisY, 'out');
      const prevRev = sumTx(prevM, prevY, 'in');
      trend = prevRev > 0 ? ((thisRev - prevRev) / prevRev) * 100 : 0;
    }
    
    const profitMargin = thisRev > 0 ? Math.round(((thisRev - thisExp) / thisRev) * 100) : 0;

    const totalDue = tasks.reduce((s, t) => {
      const b = Number(t.budget) || 0;
      const p = ((t as any).payments || []).reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0);
      return s + Math.max(0, b - p);
    }, 0);

    const active = tasks.filter(t => !['completed', 'declined'].includes(t.status)).length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    let totalDays = 0, deliveredCount = 0;
    tasks.forEach(t => {
      if (t.status === 'completed' && (t as any).createdAt && (t as any).completedAt) {
        const days = Math.floor((new Date((t as any).completedAt).getTime() - new Date((t as any).createdAt).getTime()) / 86400000);
        if (days >= 0) { totalDays += days; deliveredCount++; }
      }
    });
    const avgDeliveryDays = deliveredCount > 0 ? Math.round(totalDays / deliveredCount) : 0;

    const clientOrderCount: Record<string, number> = {};
    tasks.forEach(t => { if (t.client) clientOrderCount[t.client] = (clientOrderCount[t.client] || 0) + 1; });
    let repeatClients = 0, newClients = 0;
    Object.values(clientOrderCount).forEach(count => { if (count > 1) repeatClients++; else newClients++; });
    const retentionRate = (repeatClients + newClients) > 0 ? Math.round((repeatClients / (repeatClients + newClients)) * 100) : 0;

    return { thisRev, thisExp, trend, profitMargin, totalDue, active, completed, avgDeliveryDays, repeatClients, newClients, retentionRate };
  }, [tasks, sumTx, sumCustomTx, range, customStart, customEnd]);

  const workerStats = useMemo(() => {
    const map: Record<string, { name: string; tasks: number; completed: number; totalEarned: number; totalPaid: number; totalDue: number }> = {};
    tasks.forEach(t => {
      const add = (uid: string, name: string, earned: number, paid: number) => {
        if (!uid) return;
        if (!map[uid]) map[uid] = { name: getWorkerName(uid), tasks: 0, completed: 0, totalEarned: 0, totalPaid: 0, totalDue: 0 };
        map[uid].tasks++;
        if (t.status === 'completed' || t.status === 'delivered') map[uid].completed++;
        map[uid].totalEarned += earned;
        map[uid].totalPaid += paid;
        map[uid].totalDue += Math.max(0, earned - paid);
      };
      const budget = Number(t.budget) || 0;
      if ((t as any).composerId) {
        const earned = (t as any).composerCommissionType === 'flat' ? Number((t as any).composerCommissionAmount) || 0 : Math.round(budget * (Number((t as any).composerCommissionPct) || 15) / 100);
        const paid = Number((t as any).composerPaid) || 0;
        add((t as any).composerId, '', earned, paid);
      }
      if ((t as any).hummingArtistId && (t as any).needsHumming) {
        const earned = (t as any).hummingArtistCommissionType === 'flat' ? Number((t as any).hummingArtistCommissionAmount) || 0 : Math.round(budget * (Number((t as any).hummingArtistCommissionPct) || 15) / 100);
        const paid = Number((t as any).hummingArtistPaid) || 0;
        add((t as any).hummingArtistId, '', earned, paid);
      }
    });
    return Object.entries(map).map(([uid, w]) => ({
      uid, ...w, completionRate: w.tasks > 0 ? Math.round((w.completed / w.tasks) * 100) : 0,
    })).sort((a, b) => b.totalEarned - a.totalEarned);
  }, [tasks, users]);

  const totalPayables = useMemo(() => workerStats.reduce((sum, w) => sum + w.totalDue, 0), [workerStats]);

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    transactions.forEach(t => {
      if (t.type === 'out' && t.status === 'Completed') {
        const dStr = (t as any).createdAt || (t as any).date || '';
        const td = new Date(dStr);
        let inRange = false;
        if (range === 'custom') {
          inRange = dStr >= customStart && dStr <= customEnd;
        } else {
          inRange = td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear();
        }
        if (inRange) {
          const cat = t.category || 'Other';
          map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
        }
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [transactions, range, customStart, customEnd]);

  const insights = useMemo(() => {
    const alerts = [];
    if (kpis.trend > 10 && range !== 'custom') {
      alerts.push({ type: 'success', text: `Revenue is up ${kpis.trend.toFixed(1)}% vs last month.`, icon: <TrendingUp size={16} /> });
    }
    if (kpis.profitMargin < 20 && kpis.thisRev > 0) {
      alerts.push({ type: 'warning', text: `Profit margin is low (${kpis.profitMargin}%). Watch your expenses.`, icon: <PieChartIcon size={16} /> });
    }
    if (kpis.totalDue > 0) {
      alerts.push({ type: 'danger', text: `${currency}${kpis.totalDue.toLocaleString()} in client dues.`, icon: <Wallet size={16} /> });
    }
    
    // Predictive Forecast
    if (range !== 'custom') {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const runRate = Math.round((kpis.thisRev / currentDay) * daysInMonth);
      if (runRate > 0) {
        alerts.push({ type: 'info', text: `Projected to reach ${currency}${runRate.toLocaleString()} by month end.`, icon: <Activity size={16} /> });
      }
    }

    return alerts;
  }, [kpis, currency, range]);

  const smartSuggestions = useMemo(() => {
    const suggestions = [];
    
    // Profit & Growth
    if (kpis.profitMargin < 30 && kpis.thisRev > 0) {
      suggestions.push(`Your profit margin is ${kpis.profitMargin}%, which is on the lower side. Review your package pricing or reduce overhead costs to reach a healthy 40%+ margin.`);
    }
    if (kpis.trend < 0 && range !== 'custom') {
      suggestions.push(`Revenue is down ${Math.abs(kpis.trend).toFixed(1)}% compared to last month. Consider running a promotional discount or reaching out to past clients.`);
    }

    // Collections & Cash Flow
    if (kpis.totalDue > 10000) {
      suggestions.push(`You have a high amount of uncollected dues (${currency}${kpis.totalDue.toLocaleString()}). Use the "Remind" buttons below to follow up. Recovering this will instantly boost your cash flow.`);
    }

    // Expenses
    if (expenseBreakdown.length > 0 && kpis.thisExp > 0) {
      const topExp = expenseBreakdown[0];
      if ((topExp.value / kpis.thisExp) > 0.5) {
        suggestions.push(`Your highest expense is ${topExp.name} (${currency}${topExp.value.toLocaleString()}), making up over 50% of your costs. Try to optimize or reduce this expense.`);
      }
    }

    // Client Retention
    if (kpis.retentionRate > 0 && kpis.retentionRate < 25) {
      suggestions.push(`Only ${kpis.retentionRate}% of your orders are from repeat clients. Consider sending a "Loyalty Coupon" to your past clients to encourage them to return.`);
    }

    // Goal
    const today = new Date();
    const isPastMidMonth = today.getDate() > 15;
    const progress = monthlyGoal > 0 ? (kpis.thisRev / monthlyGoal) * 100 : 100;
    if (isPastMidMonth && progress < 40 && range !== 'custom') {
      suggestions.push(`You are halfway through the month but only ${Math.round(progress)}% towards your target. Push for faster project deliveries this week to catch up.`);
    }

    // Default if everything is perfect
    if (suggestions.length === 0) {
      suggestions.push(`Your studio metrics are looking fantastic! Keep up the great work and focus on maintaining this growth.`);
    }

    return suggestions;
  }, [kpis, expenseBreakdown, monthlyGoal, range, currency]);

  const packageStats = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { if ((t as any).packageName) map[(t as any).packageName] = (map[(t as any).packageName] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [tasks]);

  const maxPackageCount = packageStats[0]?.count || 1;

  const stageData = useMemo(() => {
    const stages: Record<string, { label: string; color: string }> = {
      pending:     { label: 'Pending',     color: 'var(--color-warning)' },
      new:         { label: 'Accepted',    color: 'var(--color-info)' },
      recording:   { label: 'Recording',   color: 'var(--color-danger)' },
      humming:     { label: 'Humming',     color: 'var(--accent-purple)' },
      composition: { label: 'Composition', color: 'var(--accent-indigo)' },
      arrangement: { label: 'Arrangement', color: '#30B0C7' },
      revision:    { label: 'Revision',    color: '#FF6B00' },
      delivered:   { label: 'Delivered',   color: 'var(--color-success)' },
      completed:   { label: 'Completed',   color: '#8E8E93' },
    };
    const counts: Record<string, number> = {};
    tasks.forEach(t => { const s = t.status || 'pending'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name: stages[key]?.label || key, value, color: stages[key]?.color || '#8E8E93',
    }));
  }, [tasks]);

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; projects: number; due: number }> = {};
    tasks.forEach(t => {
      const budget = Number(t.budget) || 0;
      const paid = ((t as any).payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      if (t.client) {
        if (!map[t.client]) map[t.client] = { name: t.client, revenue: 0, projects: 0, due: 0 };
        map[t.client].revenue  += paid;
        map[t.client].projects += 1;
        map[t.client].due += Math.max(0, budget - paid);
      }
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [tasks]);
  const maxClientRev = topClients[0]?.revenue || 1;

  function exportCSV() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows: string[] = [
      `Analytics Export — ${new Date().toLocaleDateString()}`, '',
      ['Period', 'Month', 'Revenue', 'Expenses', 'Profit'].map(esc).join(','),
      ...monthlyRevenue.map(m => [range.toUpperCase(), `${m.month} ${m.yr}`, m.revenue, m.expense, m.profit].map(esc).join(',')),
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 160, zIndex: 100 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: entry.color }}>{currency}{Number(entry.value).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-color)', fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>Click to see details</div>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (data: any, type: 'month' | 'category') => {
    if (!data) return;
    let list: any[] = [];
    let title = '';
    
    if (type === 'month') {
      const monIdx = MONTHS.indexOf(data.activeLabel);
      if (monIdx > -1) {
        title = `Transactions in ${data.activeLabel}`;
        list = transactions.filter(t => {
          if (t.status !== 'Completed') return false;
          const td = new Date((t as any).createdAt || (t as any).date || 0);
          return td.getMonth() === monIdx;
        });
      }
    } else if (type === 'category') {
      const cat = data.name;
      title = `Expenses for ${cat}`;
      const now = new Date();
      list = transactions.filter(t => {
        if (t.type !== 'out' || t.status !== 'Completed' || (t.category || 'Other') !== cat) return false;
        const dStr = (t as any).createdAt || (t as any).date || '';
        if (range === 'custom') return dStr >= customStart && dStr <= customEnd;
        const td = new Date(dStr);
        return td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear();
      });
    }

    if (list.length > 0) {
      setDrillModal({ isOpen: true, title, data: list.sort((a,b) => new Date((b as any).createdAt || (b as any).date || 0).getTime() - new Date((a as any).createdAt || (a as any).date || 0).getTime()) });
    }
  };

  if (tasksLoading || txLoading || clientsLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" style={{ borderTopColor: 'var(--text-secondary)' }} /></div>;
  }

  if (userData?.role !== 'admin') {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}><AlertCircle size={40} style={{ margin: '0 auto 16px', display: 'block' }} /><div style={{ fontWeight: 700 }}>Admin access only</div></div>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40, position: 'relative' }}>
      {toast.show && <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ show: false, msg: '', type: 'success' })} />}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={24} color="var(--text-secondary)" />
            Analytics Overview
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Actionable insights & business intelligence.</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <Download size={16} /> Export Data
        </button>
      </div>

      {/* Quick Insights Alerts */}
      {insights.length > 0 && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, marginBottom: 8 }} className="custom-scrollbar">
          {insights.map((insight, idx) => {
            const colorMap: any = { success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)', info: 'var(--color-info)' };
            const color = colorMap[insight.type];
            return (
              <div key={idx} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `1px solid ${color}30`, background: `${color}05` }}>
                <div style={{ color }}>{insight.icon}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{insight.text}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-warning)15', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Lightbulb size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Smart Suggestions</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {smartSuggestions.map((s, idx) => (
                <li key={idx} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--color-warning)', marginTop: 2 }}>•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 24 }}>
        <StatCard label={range === 'custom' ? "Custom Rev" : "This Month"} value={`${currency}${kpis.thisRev.toLocaleString()}`} color="var(--color-info)" icon={<DollarSign size={20} />} trend={range === 'custom' ? undefined : kpis.trend} />
        <StatCard label="Profit Margin" value={`${kpis.profitMargin}%`} color="var(--color-success)" icon={<PieChartIcon size={20} />} sub="Of total revenue" />
        <StatCard label="Client Dues" value={`${currency}${kpis.totalDue.toLocaleString()}`} color="var(--color-warning)" icon={<Wallet size={20} />} alert="Money owed to you" />
        <StatCard label="Worker Payables" value={`${currency}${totalPayables.toLocaleString()}`} color="var(--color-danger)" icon={<AlertCircle size={20} />} alert="Money you owe workers" />
        
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Goal Progress</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isEditingGoal && (
                <button onClick={() => setIsEditingGoal(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><Edit2 size={16} /></button>
              )}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `var(--accent-purple)15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}><Target size={20} /></div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{Math.min(100, Math.round((kpis.thisRev / monthlyGoal) * 100))}%</div>
            {isEditingGoal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input type="text" value={tempGoal} onChange={e => setTempGoal(e.target.value)} style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13 }} />
                <button onClick={handleSaveGoal} style={{ background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><Check size={14} /></button>
                <button onClick={() => setIsEditingGoal(false)} style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}><X size={14} /></button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, fontWeight: 600 }}>Goal: {currency}{monthlyGoal.toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Date Filter & Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Cash Flow Overview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {range === 'custom' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 12 }} />
                  <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 12 }} />
                </div>
              )}
              <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 8, padding: 4, gap: 2, border: '1px solid var(--border-color)' }}>
                {[...RANGE_OPTS, { key: 'custom', label: 'Custom' }].map(r => (
                  <button key={r.key} onClick={() => setRange(r.key as RangeKey)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: range === r.key ? 'var(--card-bg)' : 'transparent', color: range === r.key ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: range === r.key ? '0 1px 4px rgba(0,0,0,0.05)' : 'none' }}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(data) => handleChartClick(data, 'month')} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-info)" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 6, fill: 'var(--color-info)' }} />
              <Area type="monotone" dataKey="expense" stroke="var(--color-danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" activeDot={{ r: 6, fill: 'var(--color-danger)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row: Expense & Top Clients */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Expense Breakdown */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Expense Breakdown</div>
          {expenseBreakdown.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1 }}>
              <div style={{ width: 160, height: 160, flexShrink: 0, cursor: 'pointer' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" onClick={(e) => handleChartClick(e, 'category')}>
                      {expenseBreakdown.map((s, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} style={{ cursor: 'pointer' }} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
                {expenseBreakdown.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[i % PALETTE.length] }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{s.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px 0', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No expenses found</div>
          )}
        </div>

        {/* Top Clients Actionable */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Users size={18} color="var(--text-secondary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Top Clients (Send Reminders)</span>
          </div>
          {topClients.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
              {topClients.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Paid: {currency}{c.revenue.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {c.due > 0 && (
                      <button onClick={() => handleSendReminder(c.name, c.due)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-danger)15', color: 'var(--color-danger)', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <Mail size={14} /> Remind
                      </button>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: c.due > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {c.due > 0 ? `Due: ${currency}${c.due.toLocaleString()}` : 'Clear'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '20px 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No client data</div>
          )}
        </div>
      </div>

      {/* Row: Worker Performance Actionable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Worker Performance */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Activity size={18} color="var(--text-secondary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Worker Payables</span>
          </div>
          {workerStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              {workerStats.slice(0, 5).map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Earned: {currency}{w.totalEarned.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {w.totalDue > 0 && (
                      <button onClick={() => setPayModal({ isOpen: true, workerId: w.uid, workerName: w.name, amount: w.totalDue, method: 'Cash', date: new Date().toISOString().slice(0,10), loading: false })} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-success)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <Banknote size={14} /> Pay
                      </button>
                    )}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: w.totalDue > 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {w.totalDue > 0 ? `Due: ${currency}${w.totalDue.toLocaleString()}` : 'Clear'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '20px 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No workers</div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {payModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Pay {payModal.workerName}</h2>
              <button onClick={() => setPayModal(p => ({ ...p, isOpen: false }))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handlePayWorker}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Amount</label>
                <input type="number" required value={payModal.amount} onChange={e => setPayModal(p => ({ ...p, amount: Number(e.target.value) }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Method</label>
                <select value={payModal.method} onChange={e => setPayModal(p => ({ ...p, method: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 14 }}>
                  <option>Cash</option><option>Bank Transfer</option><option>Mobile Banking</option>
                </select>
              </div>
              <button type="submit" disabled={payModal.loading} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: 'var(--color-success)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: payModal.loading ? 'not-allowed' : 'pointer', opacity: payModal.loading ? 0.7 : 1 }}>
                {payModal.loading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      {drillModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: 500, maxHeight: '80vh', borderRadius: 16, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{drillModal.title}</h2>
              <button onClick={() => setDrillModal(p => ({ ...p, isOpen: false }))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }} className="custom-scrollbar">
              {drillModal.data.length > 0 ? drillModal.data.map((tx: any, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{tx.category || tx.source || 'Transaction'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(tx.createdAt || tx.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'in' ? 'var(--color-info)' : 'var(--color-danger)' }}>
                    {tx.type === 'in' ? '+' : '-'}{currency}{Number(tx.amount).toLocaleString()}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 20 }}>No records found</div>
              )}
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
