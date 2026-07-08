 

import { AnimatePresence } from 'framer-motion';
import { Plus, Search, Music2 } from 'lucide-react';
import { Toast } from '../components/Toast';
import { InvoiceModal } from '../components/InvoiceModal';
import { ProjectSidePanel } from '../components/ProjectSidePanel';
import { ActiveBoardView } from '../components/workflow/ActiveBoardView';
import { AddTaskModal } from '../components/workflow/AddTaskModal';
import { TaskDetailsModal } from '../components/workflow/TaskDetailsModal';
import { EditProjectModal } from '../components/workflow/EditProjectModal';
import { WorkflowStats } from '../components/workflow/WorkflowStats';
import { MobileWorkView } from '../components/workflow/MobileWorkView';
import { ArchivedProjectsView } from '../components/workflow/ArchivedProjectsView';
import { useWorkProcessBoard } from '../hooks/useWorkProcessBoard';

export function WorkProcess() {
  const board = useWorkProcessBoard();
  const {
    userData, teams, clients, rawTasks, currency, updateTask, navigate,
    columns,
    showToast, setShowToast, toastMsg, toastType, pendingDeleteTask, setPendingDeleteTask, fireToast,
    isModalOpen, setIsModalOpen,
    isDetailsOpen, setIsDetailsOpen,
    isEditOpen, setIsEditOpen,
    showInvoice, setShowInvoice,
    selectedTask, setSelectedTask,
    activeId, sensors, activeTask, handleDragStart, handleDragOver, handleDragEnd, customCollisionDetection,
    containerRef, chatEndRef,
    searchQuery, setSearchQuery, chatInput, setChatInput, handleSendChat,
    milestoneInput, setMilestoneInput,
    partialPaymentInput, setPartialPaymentInput,
    workerPaymentInput, setWorkerPaymentInput,
    isSubmitting, forcePay, setForcePay,
    newTask, setNewTask,
    clientSearch, setClientSearch,
    isClientDropdownOpen, setIsClientDropdownOpen,
    isAddingNewClientDetails, setIsAddingNewClientDetails,
    editTaskData, setEditTaskData,
    viewMode, setViewMode,
    activeStage, setActiveStage,
    stageSort, setStageSort,
    stageFilter, setStageFilter,
    workerFilter, setWorkerFilter,
    hoveredStage,
    highlightedTaskId,
    isConfirmingDelete, setIsConfirmingDelete,
    isSidePanelOpen, setIsSidePanelOpen, sidePanelTask, handleOpenDetails, handleOpenFullDetails,
    isSelectMode, setIsSelectMode, selectedTaskIds, setSelectedTaskIds, toggleSelectTask,
    handleBulkMoveStage, handleBulkDelete,
    isArchiveReady, filteredTasks, composers, hummingArtists,
    exportTasksCSV, handleOpenModal, handleAddTask, handleEditTask, handlePartialPayment, handleWorkerPayment,
    toggleMilestone, handleDeleteTask, handleStatusChange, handleMobileTaskMove,
  } = board;

  const isAdmin = userData?.role === 'admin';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
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
          stageSort={stageSort}
          setStageSort={setStageSort}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          workerFilter={workerFilter}
          setWorkerFilter={setWorkerFilter}
          composers={composers}
          hummingArtists={hummingArtists}
          isAdmin={isAdmin}
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
          <ActiveBoardView
            columns={columns}
            filteredTasks={filteredTasks}
            isArchiveReady={isArchiveReady}
            activeStage={activeStage}
            setActiveStage={setActiveStage}
            hoveredStage={hoveredStage}
            activeId={activeId}
            activeTask={activeTask}
            sensors={sensors}
            customCollisionDetection={customCollisionDetection}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDragEnd={handleDragEnd}
            stageSort={stageSort}
            setStageSort={setStageSort}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            workerFilter={workerFilter}
            setWorkerFilter={setWorkerFilter}
            composers={composers}
            hummingArtists={hummingArtists}
            userRole={userData?.role}
            isAdmin={isAdmin}
            currency={currency}
            isSelectMode={isSelectMode}
            setIsSelectMode={setIsSelectMode}
            selectedTaskIds={selectedTaskIds}
            setSelectedTaskIds={setSelectedTaskIds}
            toggleSelectTask={toggleSelectTask}
            exportTasksCSV={exportTasksCSV}
            handleBulkMoveStage={handleBulkMoveStage}
            handleBulkDelete={handleBulkDelete}
            highlightedTaskId={highlightedTaskId}
            handleOpenDetails={handleOpenDetails}
            handleOpenModal={handleOpenModal}
            navigate={navigate}
          />
        ) : (
          <ArchivedProjectsView
            filteredTasks={filteredTasks}
            isArchiveReady={isArchiveReady}
            userRole={userData?.role}
            currency={currency}
            openDetails={handleOpenDetails}
            navigate={navigate}
          />
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
