import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Toast } from '../components/Toast';

import { PageSkeleton } from '../components/SkeletonLoader';

import { KPICards } from '../components/dashboard/KPICards';

import { PriorityTasks } from '../components/dashboard/PriorityTasks';

import { MonthlyChart } from '../components/dashboard/MonthlyChart';

import { DashboardAlerts } from '../components/dashboard/DashboardAlerts';

import { AdminDashboardView } from '../components/dashboard/AdminDashboardView';

import { MyOrdersPanel } from '../components/dashboard/MyOrdersPanel';

import { ReviewModal } from '../components/dashboard/ReviewModal';

import { useDashboardData } from '../hooks/useDashboardData';


export function Dashboard() {

  const {
    isMobile, userData, settings, currency, notifyOverdue, notifyUpcoming, go,
    tasksLoading, txLoading, clients, clientsLoading, updateTask, addWebsiteTestimonial,
    isAdmin, isWorker, isClient,
    totalIncome, currentBalance, lastMonthIncome,
    activeProjects, avgProgress,
    workerEarned, workerAvailable, workerPendingClient, workerPaid, workerDue,
    clientPaid, clientDue,
    totalClientDues, totalWorkerLiability,
    stagePipeline, todaySessions, overdueTasks, upcomingDeadlines,
    clientDuesList, workerDuesList, allTimeGrossRevenue, topClientsAllTime, workerUtilization, recentTransactions,
    newOrders, myOrders, chartData, priorityTasks,
  } = useDashboardData();

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




  // Removed loading skeleton
  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  //  ADMIN DASHBOARD

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
  if (isAdmin) {
    return (
      <AdminDashboardView
        isMobile={isMobile}
        userData={userData}
        settings={settings}
        currency={currency}
        notifyOverdue={notifyOverdue}
        notifyUpcoming={notifyUpcoming}
        overdueTasks={overdueTasks}
        upcomingDeadlines={upcomingDeadlines}
        todaySessions={todaySessions}
        currentBalance={currentBalance}
        totalIncome={totalIncome}
        lastMonthIncome={lastMonthIncome}
        allTimeGrossRevenue={allTimeGrossRevenue}
        totalClientDues={totalClientDues}
        totalWorkerLiability={totalWorkerLiability}
        workerDue={workerDue}
        go={go}
        newOrders={newOrders}
        updateTask={updateTask}
        fireToast={fireToast}
        stagePipeline={stagePipeline}
        clientDuesList={clientDuesList}
        workerDuesList={workerDuesList}
        topClientsAllTime={topClientsAllTime}
        recentTransactions={recentTransactions}
        workerUtilization={workerUtilization}
        chartData={chartData}
      />
    );
  }

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

  //  WORKER / CLIENT DASHBOARD

  // â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
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

  const handleOpenReview = (order: any) => { setReviewOrder(order); setReviewRating(5); setReviewText(''); };

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
        <MyOrdersPanel myOrders={myOrders} go={go} onReview={handleOpenReview} />
      )}



      <div className="dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', minWidth: 0 }}>

        <div style={{ minWidth: 0, overflow: 'hidden' }}><PriorityTasks tasks={priorityTasks} /></div>

        <div style={{ minWidth: 0, overflow: 'hidden' }}><MonthlyChart isWorker={isWorker} isClient={isClient} data={chartData} /></div>

      </div>



      {showToast && <Toast message={toastMsg} type={toastType} onClose={() => setShowToast(false)} />}

      <ReviewModal
        reviewOrder={reviewOrder}
        reviewRating={reviewRating}
        reviewHover={reviewHover}
        reviewText={reviewText}
        reviewSubmitting={reviewSubmitting}
        onClose={() => setReviewOrder(null)}
        onRatingChange={setReviewRating}
        onHoverChange={setReviewHover}
        onTextChange={setReviewText}
        onSubmit={handleSubmitReview}
      />

    </div>

  );

}

