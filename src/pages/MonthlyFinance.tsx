/* eslint-disable react-refresh/only-export-components */
import { AnimatePresence, motion } from 'framer-motion';
import {
  Banknote, Bell, Briefcase, CheckCircle2, ChevronLeft, ChevronRight,
  Plus, ReceiptText, TrendingDown, TrendingUp, UserRound, Wallet,
} from 'lucide-react';
import './MonthlyFinance.css';
import { InvoiceModal } from '../components/InvoiceModal';
import { Toast } from '../components/Toast';
import {
  KpiCard, GoalBar, HealthScore, FinanceModals, ConfirmDialog,
} from '../components/finance/FinanceShared';
import { OverviewTab } from './finance/OverviewTab';
import { ClientsTab } from './finance/ClientsTab';
import { WorkersTab } from './finance/WorkersTab';
import { BillsTab } from './finance/BillsTab';
import { TransactionsTab } from './finance/TransactionsTab';
import { ReportTab } from './finance/ReportTab';
import { YearTab } from './finance/YearTab';
import { useFinanceLedger, type FinanceTab } from './finance/useFinanceLedger';

export type { FinanceTab } from './finance/useFinanceLedger';
export { toJSDate } from './finance/useFinanceLedger';

export function MonthlyFinance() {
  const {
    isMobile, isAdmin, settings, currency,
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
  } = useFinanceLedger();

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
            <OverviewTab
              actionItems={actionItems}
              currency={currency}
              trendChartData={trendChartData}
              chartRange={chartRange}
              setChartRange={setChartRange}
              clientDues={clientDues}
              setInvoiceTask={setInvoiceTask}
              handleSendReminder={handleSendReminder}
              studioName={settings.studioName}
              workerRegistry={workerRegistry}
              expandedWorker={expandedWorker}
              setExpandedWorker={setExpandedWorker}
              setPayModal={setPayModal}
              monthTransactions={monthTransactions}
              completedProjects={completedProjects}
              cashForecast={cashForecast}
              money={money}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsTab
              clientDues={clientDues}
              currency={currency}
              setInvoiceTask={setInvoiceTask}
              handleSendReminder={handleSendReminder}
              studioName={settings.studioName}
            />
          )}

          {activeTab === 'workers' && (
            <WorkersTab
              workerRegistry={workerRegistry}
              currency={currency}
              expandedWorker={expandedWorker}
              setExpandedWorker={setExpandedWorker}
              setPayModal={setPayModal}
              workerPayments={workerPayments}
            />
          )}

          {activeTab === 'bills' && (
            <BillsTab
              recurringExpenses={recurringExpenses}
              monthlyPayments={monthlyPayments}
              monthKey={monthKey}
              currency={currency}
              isAdmin={isAdmin}
              editingId={editingId}
              editAmount={editAmount}
              setEditingId={setEditingId}
              setEditAmount={setEditAmount}
              saveEditAmount={saveEditAmount}
              togglePaid={togglePaid}
              handleDeleteExpense={handleDeleteExpense}
              paidBills={paidBills}
              unpaidBills={unpaidBills}
              setShowAddForm={setShowAddForm}
              handleQuickSetup={handleQuickSetup}
              payAll={payAll}
              monthLabel={monthLabel}
              showAddIncomeForm={showAddIncomeForm}
              setShowAddIncomeForm={setShowAddIncomeForm}
              newRecurringIncome={newRecurringIncome}
              setNewRecurringIncome={setNewRecurringIncome}
              handleAddRecurringIncome={handleAddRecurringIncome}
              recurringIncome={recurringIncome}
              receivedIncomeKeys={receivedIncomeKeys}
              toggleIncomeReceived={toggleIncomeReceived}
              handleDeleteRecurringIncome={handleDeleteRecurringIncome}
              expensePieData={expensePieData}
              money={money}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              monthTransactions={monthTransactions}
              txFilter={txFilter}
              setTxFilter={setTxFilter}
              txCategories={txCategories}
              filteredTransactions={filteredTransactions}
              exportTransactionsCSV={exportTransactionsCSV}
              isAdmin={isAdmin}
              handleDeleteTx={handleDeleteTx}
              monthLabel={monthLabel}
              currency={currency}
              money={money}
            />
          )}

          {activeTab === 'report' && (
            <ReportTab
              budgetVsActualData={budgetVsActualData}
              money={money}
              completedProjects={completedProjects}
              clientDues={clientDues}
              workerRegistry={workerRegistry}
              expandedWorker={expandedWorker}
              setExpandedWorker={setExpandedWorker}
              setPayModal={setPayModal}
              monthTransactions={monthTransactions}
              paidBills={paidBills}
              unpaidBills={unpaidBills}
              recurringExpenses={recurringExpenses}
              monthlyPayments={monthlyPayments}
              monthKey={monthKey}
              isAdmin={isAdmin}
              editingId={editingId}
              editAmount={editAmount}
              setEditingId={setEditingId}
              setEditAmount={setEditAmount}
              saveEditAmount={saveEditAmount}
              togglePaid={togglePaid}
              setInvoiceTask={setInvoiceTask}
              handleSendReminder={handleSendReminder}
              studioName={settings.studioName}
              exportReportCSV={exportReportCSV}
              monthLabel={monthLabel}
              currency={currency}
              openingBalance={openingBalance}
              cashIn={cashIn}
              cashOut={cashOut}
              cashProfit={cashProfit}
              closingBalance={closingBalance}
              totalWorkerDue={totalWorkerDue}
              completedValue={completedValue}
              completedDue={completedDue}
              totalClientDue={totalClientDue}
              fireToast={fireToast}
            />
          )}

          {activeTab === 'year' && (
            <YearTab
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              isMobile={isMobile}
              yearSummaryData={yearSummaryData}
              money={money}
              currency={currency}
              now={now}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              setActiveTab={setActiveTab}
              invoiceTaxRate={Number(settings.invoiceTaxRate) || 0}
              fireToast={fireToast}
            />
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
