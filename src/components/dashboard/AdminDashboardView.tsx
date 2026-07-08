import { useState } from 'react';
import { Plus, FileText, Minus, PackageOpen, CalendarCheck, X, Check } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { DashboardAlerts } from './DashboardAlerts';
import { MonthlyChart } from './MonthlyChart';
import { sendOrderAcceptedToClient, sendOrderDeclinedToClient } from '../../utils/emailApi';
import type { Task, Transaction } from '../../types';

interface StagePipelineItem { key: string; label: string; color: string; count: number; pct: number; }
interface ClientDueItem { name: string; due: number; count: number; }
interface WorkerDueItem { name: string; due: number; role: string; }
interface TopClientItem { name: string; revenue: number; count: number; }
interface WorkerUtilizationItem { id: string; name: string; role: string; active: number; overdue: number; }
interface AdminChartDataPoint { name: string; income?: number; expense?: number; }

interface AdminDashboardViewProps {
  isMobile: boolean;
  userData: { name?: string } | null;
  settings: { monthlyGoal: number; currency: string };
  currency: string;
  notifyOverdue?: boolean;
  notifyUpcoming?: boolean;
  overdueTasks: Task[];
  upcomingDeadlines: Task[];
  todaySessions: Task[];
  currentBalance: number;
  totalIncome: number;
  lastMonthIncome: number;
  allTimeGrossRevenue: number;
  totalClientDues: number;
  totalWorkerLiability: number;
  workerDue: number;
  go: (path: string, state?: any) => void;
  newOrders: any[];
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  fireToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  stagePipeline: StagePipelineItem[];
  clientDuesList: ClientDueItem[];
  workerDuesList: WorkerDueItem[];
  topClientsAllTime: TopClientItem[];
  recentTransactions: Transaction[];
  workerUtilization: WorkerUtilizationItem[];
  chartData: AdminChartDataPoint[];
}

export function AdminDashboardView({
  isMobile,
  userData,
  settings,
  currency,
  notifyOverdue,
  notifyUpcoming,
  overdueTasks,
  upcomingDeadlines,
  todaySessions,
  currentBalance,
  totalIncome,
  lastMonthIncome,
  allTimeGrossRevenue,
  totalClientDues,
  totalWorkerLiability,
  workerDue,
  go,
  newOrders,
  updateTask,
  fireToast,
  stagePipeline,
  clientDuesList,
  workerDuesList,
  topClientsAllTime,
  recentTransactions,
  workerUtilization,
  chartData,
}: AdminDashboardViewProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptDate, setAcceptDate] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const monthlyGoal = settings.monthlyGoal || 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((totalIncome / monthlyGoal) * 100)) : 0;

  const mobileCollapseToggle = (key: string, title: string) => isMobile && (
    <button
      onClick={() => toggleSection(key)}
      className="collapsible-section-header"
      style={{ marginBottom: 12, borderRadius: 14, border: '1px solid var(--border-color)' }}
      aria-expanded={!!openSections[key]}
    >
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>{openSections[key] ? 'Hide ▲' : 'Show ▼'}</span>
    </button>
  );

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

          isAdmin={true}

          isWorker={false}

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

                <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--accent-gold)', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>{newOrders.length}</span>

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

                          <button onClick={() => { setAcceptingId(order.id); setAcceptDate(''); }} style={{ height: 36, padding: '0 20px', borderRadius: 12, border: 'none', background: 'var(--accent-gold)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'none' }}>

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

                          style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,var(--accent-gold),#9a6828)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: 'none' }}>

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

        {mobileCollapseToggle('topClients', 'Top Clients & Transactions')}
        <div style={{ display: isMobile && !openSections.topClients ? 'none' : 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 24, marginBottom: 24 }} className="mf-dash-grid">

           

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

                    const dateStr = new Date((tx.createdAt as any) || (tx.date as any) || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    

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

        {mobileCollapseToggle('dues', 'Client & Worker Dues')}
        <div style={{ display: isMobile && !openSections.dues ? 'none' : 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }} className="mf-dash-grid">

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
          <>
          {mobileCollapseToggle('workerUtil', 'Worker Utilization')}
          <div className="card" style={{ padding: 28, marginBottom: 24, display: isMobile && !openSections.workerUtil ? 'none' : undefined }}>

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
          </>
        )}



        {/* â”€â”€ 6. Analytics â”€â”€ */}

        <div style={{ marginBottom: 24 }}>

          <MonthlyChart isWorker={false} isClient={false} data={chartData} />

        </div>

      </div>
  );
}
