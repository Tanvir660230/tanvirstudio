import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTask } from '../SortableTask';
import { StageEmptyState } from '../StageEmptyState';
import { DroppableStageTab } from './DroppableStageTab';
import { WorkProcessToolbar } from './WorkProcessToolbar';
import { WorkProcessBulkBar } from './WorkProcessBulkBar';

interface StageColumn {
  id: string;
  title: string;
  icon?: React.ReactNode;
  color: string;
}

interface WorkerLike {
  uid?: string;
  id?: string;
  name?: string;
  displayName?: string;
}

interface ActiveBoardViewProps {
  columns: StageColumn[];
  filteredTasks: any[];
  isArchiveReady: (task: any) => boolean;
  activeStage: string;
  setActiveStage: (id: string) => void;
  hoveredStage: string | null;
  activeId: string | null;
  activeTask: any;
  sensors: SensorDescriptor<SensorOptions>[];
  customCollisionDetection: (args: any) => any;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  stageSort: 'deadline' | 'dateAdded' | 'priority';
  setStageSort: (v: 'deadline' | 'dateAdded' | 'priority') => void;
  stageFilter: 'all' | 'paid' | 'unpaid';
  setStageFilter: (v: 'all' | 'paid' | 'unpaid') => void;
  workerFilter: string;
  setWorkerFilter: (v: string) => void;
  composers: WorkerLike[];
  hummingArtists: WorkerLike[];
  userRole: string | undefined;
  isAdmin: boolean;
  currency: string;
  isSelectMode: boolean;
  setIsSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTaskIds: Set<string>;
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelectTask: (id: string) => void;
  exportTasksCSV: () => void;
  handleBulkMoveStage: (stage: string) => void;
  handleBulkDelete: () => void;
  highlightedTaskId: string | null;
  handleOpenDetails: (task: any) => void;
  handleOpenModal: () => void;
  navigate: any;
}

export function ActiveBoardView({
  columns,
  filteredTasks,
  isArchiveReady,
  activeStage,
  setActiveStage,
  hoveredStage,
  activeId,
  activeTask,
  sensors,
  customCollisionDetection,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  stageSort,
  setStageSort,
  stageFilter,
  setStageFilter,
  workerFilter,
  setWorkerFilter,
  composers,
  hummingArtists,
  userRole,
  isAdmin,
  currency,
  isSelectMode,
  setIsSelectMode,
  selectedTaskIds,
  setSelectedTaskIds,
  toggleSelectTask,
  exportTasksCSV,
  handleBulkMoveStage,
  handleBulkDelete,
  highlightedTaskId,
  handleOpenDetails,
  handleOpenModal,
  navigate,
}: ActiveBoardViewProps) {
  return (
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
                      {isAdmin && totalBudget > 0 ? ` · ${currency}${totalBudget.toLocaleString()}` : ''}
                    </span>
                  </div>
                </div>

                {/* Sort + Filter Toolbar */}
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
                  sortedCount={sorted.length}
                  stageTasksCount={stageTasks.length}
                  isSelectMode={isSelectMode}
                  setIsSelectMode={setIsSelectMode}
                  setSelectedTaskIds={setSelectedTaskIds}
                  exportTasksCSV={exportTasksCSV}
                />

                {/* Bulk action bar */}
                {isSelectMode && (
                  <WorkProcessBulkBar
                    selectedCount={selectedTaskIds.size}
                    columns={columns}
                    activeStage={activeStage}
                    handleBulkMoveStage={handleBulkMoveStage}
                    handleBulkDelete={handleBulkDelete}
                  />
                )}

                {/* Project Cards */}
                {sorted.length === 0 ? (
                  <StageEmptyState
                    stageId={activeCol.id}
                    stageTitle={activeCol.title}
                    isFiltered={stageFilter !== 'all'}
                    filterLabel={stageFilter}
                    isAdmin={isAdmin}
                    onAdd={handleOpenModal}
                    onClearFilter={() => setStageFilter('all')}
                  />
                ) : (
                  <>
                    {/* List Header for alignment (Matches Client Hub) */}
                    <div className="desktop-only" style={{
                      display: 'grid',
                      gridTemplateColumns: (userRole !== 'client' ? '16px ' : '') + `minmax(160px,2fr) minmax(140px,1fr) minmax(180px,1.4fr)`,
                      gap: '16px',
                      padding: '0 20px 8px 20px',
                      alignItems: 'center'
                    }}>
                      {userRole !== 'client' && <div></div>}
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
                              userRole={userRole}
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
              <SortableTask task={activeTask} isOverlay={true} userRole={userRole} currency={currency} openDetails={handleOpenDetails} navigate={navigate} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

export default ActiveBoardView;
