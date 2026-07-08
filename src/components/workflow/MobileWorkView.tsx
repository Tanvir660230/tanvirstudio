import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, GripVertical,
  AlertCircle, Calendar,
  CheckCircle2, Music2, Mic, Plus, Search, X
} from 'lucide-react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { WorkProcessToolbar } from './WorkProcessToolbar';

interface WorkerLike {
  uid?: string;
  id?: string;
  name?: string;
  displayName?: string;
}

interface MobileWorkViewProps {
  columns: Array<{ id: string; title: string; color: string; icon: React.ReactNode }>;
  filteredTasks: any[];
  isArchiveReady: (task: any) => boolean;
  viewMode: 'active' | 'archive';
  setViewMode: (v: 'active' | 'archive') => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  openDetails: (task: any) => void;
  handleOpenModal: () => void;
  onTaskMove: (taskId: string, newStageId: string) => void;
  userRole?: string;
  currency?: string;
  stageSort: 'deadline' | 'dateAdded' | 'priority';
  setStageSort: (v: 'deadline' | 'dateAdded' | 'priority') => void;
  stageFilter: 'all' | 'paid' | 'unpaid';
  setStageFilter: (v: 'all' | 'paid' | 'unpaid') => void;
  workerFilter: string;
  setWorkerFilter: (v: string) => void;
  composers: WorkerLike[];
  hummingArtists: WorkerLike[];
  isAdmin: boolean;
}

/* ─── Draggable Task Card ─── */
function DraggableTaskCard({
  task, openDetails, currency
}: {
  task: any; _col?: any; openDetails: (t: any) => void; currency: string; _userRole?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  // Recording countdown
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (task.status === 'recording' && task.recordingDate) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [task.status, task.recordingDate]);

  const recordingInfo = (() => {
    if (task.status !== 'recording' || !task.recordingDate) return null;
    const recTime = new Date(task.recordingDate).getTime();
    const durationMs = Math.max(1, (task.recordingDuration || 60)) * 60 * 1000;
    const diff = recTime - now;
    if (diff <= 0 && diff > -durationMs) return { label: '🔴 RECORDING NOW', color: 'var(--color-danger)', pulse: true };
    if (diff <= -durationMs) return { label: '✓ RECORDING DONE', color: 'var(--color-success)', pulse: false };
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const isUrgent = diff < 24 * 60 * 60 * 1000;
    let timeStr = '';
    if (d > 0) timeStr += `${d}d `;
    timeStr += `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    return { label: `REC IN ${timeStr}`, color: isUrgent ? 'var(--color-danger)' : 'var(--accent-purple)', pulse: isUrgent };
  })();

  const dl = getDeadlineInfo(task, now);
  const budget = Number(task.budget) || 0;
  const paid = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const due = budget - paid;
  const paidFull = due <= 0 && budget > 0;
  const clientName = task.client || '—';
  const initials = clientName !== '—'
    ? clientName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()
    : 'TS';
  const ms = task.milestones || [];
  const msDone = ms.filter((m: any) => m.completed).length;

  const accentColor = dl.urgent ? dl.color : paidFull ? 'var(--color-success)' : budget > 0 && due > 0 ? 'var(--color-danger)' : 'var(--border-color)';

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1, transition: 'opacity 0.15s', marginBottom: 1 }}
    >
      <motion.div
        whileTap={{ scale: 0.975, transition: { duration: 0.08 } }}
        style={{
          width: '100%',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '12px 12px 12px 0',
          background: 'var(--card-bg)',
          display: 'flex', alignItems: 'stretch', gap: 0,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Left accent bar */}
        <div style={{
          width: 4, flexShrink: 0, borderRadius: '0 3px 3px 0',
          background: accentColor,
          marginRight: 12,
          alignSelf: 'stretch',
          minHeight: '100%',
        }} />

        {/* Drag handle — subtle, appears on touch */}
        <div
          {...attributes}
          {...listeners}
          style={{ color: 'var(--border-color)', flexShrink: 0, paddingTop: 2, touchAction: 'none', cursor: 'grab', marginRight: 6, opacity: isDragging ? 1 : 0.5 }}
        >
          <GripVertical size={14} />
        </div>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: 7,
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
          flexShrink: 0, marginRight: 10,
          letterSpacing: '-0.2px',
        }}>
          {initials}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => openDetails(task)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            {dl.urgent && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dl.color, flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
            }}>
              {task.title || 'Untitled'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 400 }}>{clientName}</div>
          {(() => {
            const chip = (key: string, label: React.ReactNode, color: string, bg: string) => (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>
                {label}
              </span>
            );
            const chips: React.ReactNode[] = [];
            if (recordingInfo) chips.push(
              <motion.span key="rec"
                animate={recordingInfo.pulse ? { opacity: [1, 0.55, 1] } : {}}
                transition={recordingInfo.pulse ? { duration: 1.2, repeat: Infinity } : {}}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: recordingInfo.color, background: `${recordingInfo.color}15`, padding: '2px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}
              >{recordingInfo.label}</motion.span>
            );
            chips.push(chip('dl',
              <>{dl.urgent ? <AlertCircle size={9} /> : <Calendar size={9} />}{dl.label}</>,
              dl.urgent ? dl.color : 'var(--text-tertiary)',
              dl.urgent ? `${dl.color}12` : 'var(--surface-1)'
            ));
            if (budget > 0) chips.push(chip('pay',
              paidFull ? '✓ Paid' : `${currency}${due.toLocaleString()} due`,
              paidFull ? 'var(--color-success)' : 'var(--color-danger)',
              paidFull ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.08)'
            ));
            const prog = Number(task.progress) || 0;
            if (prog > 0 && prog < 100) chips.push(chip('prog',
              `${prog}%`,
              prog >= 80 ? 'var(--color-success)' : prog >= 50 ? 'var(--color-warning)' : 'var(--accent-blue)',
              prog >= 80 ? 'rgba(52,199,89,0.1)' : prog >= 50 ? 'rgba(255,149,0,0.1)' : 'rgba(0,122,255,0.1)'
            ));
            if (task.composerId) chips.push(chip('comp', <><Music2 size={9} /> Comp</>, 'var(--text-tertiary)', 'var(--surface-1)'));
            if (task.needsHumming && task.hummingArtistId) chips.push(chip('voc', <><Mic size={9} /> Vocal</>, 'var(--text-tertiary)', 'var(--surface-1)'));
            if (ms.length > 0) chips.push(chip('ms',
              <><CheckCircle2 size={9} /> {msDone}/{ms.length}</>,
              msDone === ms.length ? 'var(--color-success)' : 'var(--text-tertiary)',
              msDone === ms.length ? 'rgba(52,199,89,0.1)' : 'var(--surface-1)'
            ));
            const MAX = 3;
            const visible = chips.slice(0, MAX);
            const hidden = chips.length - MAX;
            return (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
                {visible}
                {hidden > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--surface-1)', padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                    +{hidden}
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Chevron */}
        <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: 4 }} onClick={() => openDetails(task)}>
          <ChevronRight size={16} />
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Droppable Stage Header ─── */
function DroppableStageHeader({
  col, stageTasks, overdueCount, isOpen, onToggle, activeId,
}: {
  col: any; stageTasks: any[]; overdueCount: number;
  isOpen: boolean; onToggle: () => void; activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const isDragActive = !!activeId;
  const isDropTarget = isOver && isDragActive;

  return (
    <div ref={setNodeRef}>
      <motion.button
        whileTap={{ scale: 0.985, transition: { duration: 0.08 } }}
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 12, padding: '13px 14px', border: 'none',
          background: isDropTarget ? `${col.color}10` : 'transparent',
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.18s',
          borderRadius: 8,
        }}
      >
        {/* Stage color dot */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: col.color,
          boxShadow: 'none',
        }} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px',
            color: isDropTarget ? col.color : 'var(--text-primary)',
          }}>
            {isDropTarget ? `Drop here` : col.title}
          </span>
          {overdueCount > 0 && !isDropTarget && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: 'var(--color-danger)', background: 'rgba(255,59,48,0.08)',
              padding: '2px 7px', borderRadius: 5,
            }}>
              {overdueCount} late
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            minWidth: 22, height: 20, borderRadius: 999,
            background: stageTasks.length > 0 ? `${col.color}15` : 'var(--surface-1)',
            color: stageTasks.length > 0 ? col.color : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, padding: '0 7px',
          }}>
            {isDropTarget ? '+' : stageTasks.length}
          </span>
          {!isDragActive && (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: 'var(--text-tertiary)', display: 'flex' }}
            >
              <ChevronDown size={16} />
            </motion.div>
          )}
        </div>
      </motion.button>
    </div>
  );
}

/* ─── Helpers ─── */
function getDeadlineInfo(task: any, now = Date.now()) {
  if (!task.deliveryDate) return { label: 'No deadline', color: 'var(--text-tertiary)', urgent: false };
  const diff = Math.ceil((new Date(task.deliveryDate).getTime() - now) / 86400000);
  const done = task.status === 'completed' || task.status === 'delivered';
  const fmt = new Date(task.deliveryDate).toLocaleString('en-US', { month: 'short', day: 'numeric' });
  if (done) return { label: fmt, color: 'var(--text-tertiary)', urgent: false };
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'var(--color-danger)', urgent: true };
  if (diff === 0) return { label: 'Due today', color: 'var(--color-warning)', urgent: true };
  if (diff <= 3) return { label: `${diff}d left`, color: 'var(--color-warning)', urgent: false };
  return { label: fmt, color: 'var(--text-secondary)', urgent: false };
}

/* ─── Main Component ─── */
export function MobileWorkView({
  columns, filteredTasks, isArchiveReady, viewMode, setViewMode,
  searchQuery, setSearchQuery, openDetails, handleOpenModal,
  onTaskMove, userRole, currency = '৳',
  stageSort, setStageSort, stageFilter, setStageFilter,
  workerFilter, setWorkerFilter, composers, hummingArtists, isAdmin,
}: MobileWorkViewProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>('recording');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const now = new Date();
  const archiveTasks = filteredTasks.filter((t: any) => isArchiveReady(t));
  const activeTask = activeId ? filteredTasks.find((t: any) => t.id === activeId) : null;

  const matchesFilters = (t: any) => {
    if (stageFilter !== 'all') {
      const b = Number(t.budget) || 0;
      const p = (t.payments || []).reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
      const isPaid = b > 0 && p >= b;
      if (stageFilter === 'paid' && !isPaid) return false;
      if (stageFilter === 'unpaid' && isPaid) return false;
    }
    if (workerFilter !== 'all' && t.composerId !== workerFilter && t.hummingArtistId !== workerFilter) return false;
    return true;
  };
  const allActiveTasks = filteredTasks.filter((t: any) => !isArchiveReady(t));
  const globalFilteredCount = allActiveTasks.filter(matchesFilters).length;

  const handleDragStart = (e: DragStartEvent) => {
    if (userRole === 'client') return;
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const task = filteredTasks.find((t: any) => t.id === e.active.id);
    if (!task) return;
    const targetStage = String(e.over.id);
    if (columns.find(c => c.id === targetStage) && task.status !== targetStage) {
      setExpandedStage(targetStage);
      onTaskMove(task.id, targetStage);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ paddingBottom: 32 }}>
        {/* Search bar — always visible, Fiverr-style */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search projects, clients…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 34px 10px 38px',
                border: 'none',
                borderRadius: 8, fontSize: 16, fontWeight: 400,
                background: 'var(--surface-1)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          {(userRole === 'admin' || userRole === 'composer') && (
            <button onClick={handleOpenModal} style={{
              width: 40, height: 40, borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'var(--accent-blue)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: 'none',
            }}>
              <Plus size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Active / Archive toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-1)', borderRadius: 7, padding: 3, gap: 2, border: '1px solid var(--border-color)', marginBottom: 16, alignSelf: 'flex-start', width: 'fit-content' }}>
          {(['active', 'archive'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: '6px 16px', borderRadius: 5, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: viewMode === v ? 'var(--card-bg)' : 'transparent',
              color: viewMode === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: viewMode === v ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              transition: 'all 0.18s', textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>

        {/* Sort + Filter */}
        {viewMode === 'active' && (
          <WorkProcessToolbar
            stageSort={stageSort}
            setStageSort={setStageSort}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            workerFilter={workerFilter}
            setWorkerFilter={setWorkerFilter}
            composers={composers}
            hummingArtists={hummingArtists}
            isAdmin={isAdmin}
            sortedCount={globalFilteredCount}
            stageTasksCount={allActiveTasks.length}
            showBulkTools={false}
          />
        )}

        {/* Drag hint */}
        {activeId && (
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)',
            marginBottom: 12, padding: '8px 16px', background: 'var(--surface-1)',
            borderRadius: 10, border: '1px dashed var(--border-color)',
          }}>
            ↕ Drag over a stage to move the project
          </div>
        )}

        {/* Global search empty state */}
        {searchQuery && viewMode === 'active' && filteredTasks.filter((t: any) => !isArchiveReady(t)).length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 18, color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No projects found</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>No results for "{searchQuery}"</div>
            <button onClick={() => setSearchQuery('')} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-blue)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Clear Search</button>
          </div>
        )}

        {/* Stage Accordion */}
        {viewMode === 'active' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {columns.map(col => {
              let stageTasks = filteredTasks.filter((t: any) => t.status === col.id && !isArchiveReady(t) && matchesFilters(t));

              stageTasks = [...stageTasks].sort((a: any, b: any) => {
                if (col.id === 'recording') {
                  if (a.recordingDate && b.recordingDate) return new Date(a.recordingDate).getTime() - new Date(b.recordingDate).getTime();
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
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
              });

              const overdueCount = stageTasks.filter((t: any) =>
                t.deliveryDate && new Date(t.deliveryDate) < now && t.status !== 'completed' && t.status !== 'delivered'
              ).length;
              const isOpen = expandedStage === col.id;

              return (
                <div key={col.id} style={{
                  borderRadius: 18,
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)', overflow: 'hidden',
                  boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'box-shadow 0.2s ease',
                }}>
                  <DroppableStageHeader
                    col={col}
                    stageTasks={stageTasks}
                    overdueCount={overdueCount}
                    isOpen={isOpen}
                    onToggle={() => setExpandedStage(isOpen ? null : col.id)}
                    activeId={activeId}
                  />

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          borderTop: '1px solid var(--border-color)',
                          padding: stageTasks.length > 0 ? '10px' : '18px',
                          display: 'flex', flexDirection: 'column', gap: 8,
                          background: 'transparent',
                        }}>
                          {stageTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500, padding: '8px 0' }}>
                              No projects in this stage
                            </div>
                          ) : (
                            stageTasks.map((task: any) => (
                              <DraggableTaskCard
                                key={task.id}
                                task={task}
                                _col={col}
                                openDetails={openDetails}
                                currency={currency}
                                _userRole={userRole}
                              />
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          /* Archive */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              {archiveTasks.length} completed projects
            </div>
            {archiveTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 500, border: '1px dashed var(--border-color)', borderRadius: 18 }}>
                No archived projects yet
              </div>
            ) : (
              archiveTasks.map((task: any) => {
                const budget = Number(task.budget) || 0;
                const paid = (task.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
                const clientName = task.client || '—';
                const initials = clientName !== '—' ? clientName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() : 'TS';
                return (
                  <motion.button key={task.id} whileTap={{ scale: 0.98 }} onClick={() => openDetails(task)} style={{
                    width: '100%', textAlign: 'left', border: '1px solid var(--border-color)', borderRadius: 14, padding: '14px', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{clientName}</span>
                        {budget > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)' }}>{currency}{paid.toLocaleString()} collected</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: 'rgba(52,199,89,0.1)', color: 'var(--color-success)' }}>Done</span>
                  </motion.button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Drag Overlay — floating card while dragging */}
      <DragOverlay>
        {activeTask && (
          <div style={{
            border: `2px solid ${columns.find(c => c.id === activeTask.status)?.color || 'var(--color-info)'}`,
            borderRadius: 14, padding: '12px 14px',
            background: 'var(--card-bg)',
            boxShadow: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
            transform: 'rotate(2deg) scale(1.03)',
            opacity: 0.95,
          }}>
            <GripVertical size={14} color="var(--text-tertiary)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTask.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{activeTask.client}</div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
