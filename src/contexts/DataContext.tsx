/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from './AuthContext';
import { orderBy, where } from 'firebase/firestore';
import { logActivity } from '../utils/auditLog';
import { decrementGlobalStats, updateGlobalStats } from '../utils/statsUpdater';
import { sendCompletionEmail } from '../utils/emailApi';
import { sendOrderCompletedSMS } from '../utils/smsApi';
import { validate, TaskSchema, ClientSchema, TransactionSchema, CouponSchema, NoteSchema, TodoSchema, LeadSchema, CommunicationSchema, WorkerPaymentSchema } from '../utils/schemas';
import type {
  Task, Client, Transaction, StudioUser, WorkerPayment, MonthlyLedger,
  Note, Todo, Lead, Communication, Notification,
  Booking, Coupon,
  WebsiteShowcase, WebsiteComparison, WebsiteTestimonial, WebsitePackage,
  WebsiteService, WebsiteFaq, WebsiteCaseStudy, WebsiteBlog,
  WebsiteTimeline, WebsiteGear,
} from '../types';

interface DataContextType {
  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  addTask: (item: Omit<Task, 'id'>) => Promise<any>;
  updateTask: (id: string, item: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;

  // Clients
  clients: Client[];
  clientsLoading: boolean;
  addClient: (item: Omit<Client, 'id'>) => Promise<any>;
  updateClient: (id: string, item: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  txLoading: boolean;
  addTx: (item: Omit<Transaction, 'id'>) => Promise<any>;
  updateTx: (id: string, item: Partial<Transaction>) => Promise<void>;
  removeTx: (id: string) => Promise<void>;

  // Users
  users: StudioUser[];
  usersLoading: boolean;
  updateUser: (id: string, item: Partial<StudioUser>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;

  // Worker Payments
  workerPayments: WorkerPayment[];
  workerPaymentsLoading: boolean;
  addWorkerPayment: (item: Omit<WorkerPayment, 'id'>) => Promise<any>;
  removeWorkerPayment: (id: string) => Promise<void>;

  // Ledgers
  monthlyLedgers: MonthlyLedger[];
  monthlyLedgersLoading: boolean;
  addMonthlyLedger: (item: Omit<MonthlyLedger, 'id'>) => Promise<any>;
  updateMonthlyLedger: (id: string, item: Partial<MonthlyLedger>) => Promise<void>;
  removeMonthlyLedger: (id: string) => Promise<void>;

  // Notes
  notes: Note[];
  notesLoading: boolean;
  addNote: (item: Omit<Note, 'id'>) => Promise<any>;
  updateNote: (id: string, item: Partial<Note>) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  // Todos
  todos: Todo[];
  todosLoading: boolean;
  addTodo: (item: Omit<Todo, 'id'>) => Promise<any>;
  updateTodo: (id: string, item: Partial<Todo>) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;

  // Leads
  leads: Lead[];
  leadsLoading: boolean;
  addLead: (item: Omit<Lead, 'id'>) => Promise<any>;
  updateLead: (id: string, item: Partial<Lead>) => Promise<void>;
  removeLead: (id: string) => Promise<void>;

  // Communications
  comms: Communication[];
  commsLoading: boolean;
  addComm: (item: Omit<Communication, 'id'>) => Promise<any>;
  updateComm: (id: string, item: Partial<Communication>) => Promise<void>;
  removeComm: (id: string) => Promise<void>;

  // Notifications
  notifications: Notification[];
  notificationsLoading: boolean;
  updateNotification: (id: string, item: Partial<Notification>) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;

  // Website CMS - Showcase
  websiteShowcase: WebsiteShowcase[];
  websiteShowcaseLoading: boolean;
  addWebsiteShowcase: (item: Omit<WebsiteShowcase, 'id'>) => Promise<any>;
  updateWebsiteShowcase: (id: string, item: Partial<WebsiteShowcase>) => Promise<void>;
  removeWebsiteShowcase: (id: string) => Promise<void>;

  // Website CMS - Comparisons
  websiteComparisons: WebsiteComparison[];
  websiteComparisonsLoading: boolean;
  addWebsiteComparison: (item: Omit<WebsiteComparison, 'id'>) => Promise<any>;
  updateWebsiteComparison: (id: string, item: Partial<WebsiteComparison>) => Promise<void>;
  removeWebsiteComparison: (id: string) => Promise<void>;

  // Website CMS - Testimonials
  websiteTestimonials: WebsiteTestimonial[];
  websiteTestimonialsLoading: boolean;
  addWebsiteTestimonial: (item: Omit<WebsiteTestimonial, 'id'>) => Promise<any>;
  updateWebsiteTestimonial: (id: string, item: Partial<WebsiteTestimonial>) => Promise<void>;
  removeWebsiteTestimonial: (id: string) => Promise<void>;

  // Website CMS - Packages
  websitePackages: WebsitePackage[];
  websitePackagesLoading: boolean;
  addWebsitePackage: (item: Omit<WebsitePackage, 'id'>) => Promise<any>;
  updateWebsitePackage: (id: string, item: Partial<WebsitePackage>) => Promise<void>;
  removeWebsitePackage: (id: string) => Promise<void>;

  // Website CMS - Services
  websiteServices: WebsiteService[];
  websiteServicesLoading: boolean;
  addWebsiteService: (item: Omit<WebsiteService, 'id'>) => Promise<any>;
  updateWebsiteService: (id: string, item: Partial<WebsiteService>) => Promise<void>;
  removeWebsiteService: (id: string) => Promise<void>;

  // Website CMS - FAQs
  websiteFaqs: WebsiteFaq[];
  websiteFaqsLoading: boolean;
  addWebsiteFaq: (item: Omit<WebsiteFaq, 'id'>) => Promise<any>;
  updateWebsiteFaq: (id: string, item: Partial<WebsiteFaq>) => Promise<void>;
  removeWebsiteFaq: (id: string) => Promise<void>;

  // Website CMS - Case Studies
  websiteCaseStudies: WebsiteCaseStudy[];
  websiteCaseStudiesLoading: boolean;
  addWebsiteCaseStudy: (item: Omit<WebsiteCaseStudy, 'id'>) => Promise<any>;
  updateWebsiteCaseStudy: (id: string, item: Partial<WebsiteCaseStudy>) => Promise<void>;
  removeWebsiteCaseStudy: (id: string) => Promise<void>;

  // Website CMS - Blog Posts
  websiteBlogs: WebsiteBlog[];
  websiteBlogsLoading: boolean;
  addWebsiteBlog: (item: Omit<WebsiteBlog, 'id'>) => Promise<any>;
  updateWebsiteBlog: (id: string, item: Partial<WebsiteBlog>) => Promise<void>;
  removeWebsiteBlog: (id: string) => Promise<void>;

  // Website CMS - Timeline
  websiteTimeline: WebsiteTimeline[];
  websiteTimelineLoading: boolean;
  addWebsiteTimeline: (item: Omit<WebsiteTimeline, 'id'>) => Promise<any>;
  updateWebsiteTimeline: (id: string, item: Partial<WebsiteTimeline>) => Promise<void>;
  removeWebsiteTimeline: (id: string) => Promise<void>;

  // Website CMS - Gear
  websiteGear: WebsiteGear[];
  websiteGearLoading: boolean;
  addWebsiteGear: (item: Omit<WebsiteGear, 'id'>) => Promise<any>;
  updateWebsiteGear: (id: string, item: Partial<WebsiteGear>) => Promise<void>;
  removeWebsiteGear: (id: string) => Promise<void>;

  // Coupons
  coupons: Coupon[];
  couponsLoading: boolean;
  addCoupon: (item: Omit<Coupon, 'id'>) => Promise<any>;
  updateCoupon: (id: string, item: Partial<Coupon>) => Promise<void>;
  removeCoupon: (id: string) => Promise<void>;

  // Bookings (public booking form submissions)
  bookings: Booking[];
  bookingsLoading: boolean;
  updateBooking: (id: string, item: Partial<Booking>) => Promise<void>;
  removeBooking: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  // Start loading as soon as userData exists (from localStorage cache or Firestore).
  // Firestore security rules block actual reads if Firebase Auth hasn't resolved yet,
  // so this is safe — it just avoids a blank render while Auth resolves (~50-100ms).
  const privateDataEnabled = Boolean(userData);
  const isAdmin = userData?.role === 'admin';
  // Hard gate: write operations still require confirmed auth
  // const _ = Boolean(user); // keep user in scope for callbacks below

  const taskConstraints = useMemo(() => {
    if (!userData || userData.role === 'admin') return [orderBy('createdAt', 'desc')];
    if (userData.role === 'composer')       return [where('composerId', '==', userData.uid)];
    if (userData.role === 'humming_artist') return [where('hummingArtistId', '==', userData.uid)];
    // Clients matched by email (works even if uid changed between sign-up methods)
    return [where('clientEmail', '==', userData.email)];
  }, [userData]);

  const { data: rawTasks, loading: tasksLoading, add: addTask, update: updateTask, softDelete: removeTask } = useFirestore<Task>('tasks', taskConstraints, privateDataEnabled, 500, undefined, true);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => {
    const aT = typeof a.createdAt === 'object' && a.createdAt !== null && 'seconds' in (a.createdAt as any) ? (a.createdAt as any).seconds : 0;
    const bT = typeof b.createdAt === 'object' && b.createdAt !== null && 'seconds' in (b.createdAt as any) ? (b.createdAt as any).seconds : 0;
    return bT - aT;
  }), [rawTasks]);

  // Admin-only collections: disabled (enabled=false) for non-admins → no listeners opened
  const adminEnabled = privateDataEnabled && isAdmin;

  const { data: clients, loading: clientsLoading, add: addClient, update: updateClient, softDelete: removeClient } = useFirestore<Client>('clients', [orderBy('createdAt', 'desc')], adminEnabled, 300, undefined, true);
  const { data: transactions, loading: txLoading, add: addTx, update: updateTx, softDelete: removeTx } = useFirestore<Transaction>('transactions', [orderBy('createdAt', 'desc')], adminEnabled, 300, undefined, true);

  // Non-admins only see their own user document
  const userCollectionConstraints = useMemo(() => {
    if (!userData || userData.role === 'admin') return [];
    return [where('uid', '==', userData.uid)];
  }, [userData]);
  const { data: users, loading: usersLoading, update: updateUser, remove: removeUser } = useFirestore<StudioUser>('users', userCollectionConstraints, privateDataEnabled);
  const { data: workerPayments, loading: workerPaymentsLoading, add: addWorkerPayment, softDelete: removeWorkerPayment } = useFirestore<WorkerPayment>('workerPayments', [orderBy('createdAt', 'desc')], adminEnabled, 200, undefined, true);
  const { data: monthlyLedgers, loading: monthlyLedgersLoading, add: addMonthlyLedger, update: updateMonthlyLedger, softDelete: removeMonthlyLedger } = useFirestore<MonthlyLedger>('monthlyLedgers', [orderBy('createdAt', 'desc')], adminEnabled, 100, undefined, true);
  const { data: notes, loading: notesLoading, add: addNote, update: updateNote, softDelete: removeNote } = useFirestore<Note>('notes', [orderBy('createdAt', 'desc')], adminEnabled, 100, undefined, true);
  const { data: todos, loading: todosLoading, add: addTodo, update: updateTodo, softDelete: removeTodo } = useFirestore<Todo>('todos', [], adminEnabled, 100, undefined, true);
  const { data: leads, loading: leadsLoading, add: addLead, update: updateLead, softDelete: removeLead } = useFirestore<Lead>('leads', [orderBy('createdAt', 'desc')], adminEnabled, 200, undefined, true);
  const { data: comms, loading: commsLoading, add: addComm, update: updateComm, softDelete: removeComm } = useFirestore<Communication>('communications', [orderBy('date', 'desc')], adminEnabled, 200, undefined, true);
  const { data: notifications, loading: notificationsLoading, add: addNotification, update: updateNotification, remove: removeNotification } = useFirestore<Notification>('notifications', user?.uid ? [where('recipientId', '==', user.uid)] : [where('recipientId', '==', '__none__')], privateDataEnabled);

  // Website CMS Hooks — cached (1 hour TTL) to reduce cold-load Firestore reads
  const { data: websiteShowcase, loading: websiteShowcaseLoading, add: addWebsiteShowcase, update: updateWebsiteShowcase, remove: removeWebsiteShowcase } = useFirestore<WebsiteShowcase>('website_showcase', [orderBy('createdAt', 'desc')], true, 100, 'website_showcase');
  const { data: websiteComparisons, loading: websiteComparisonsLoading, add: addWebsiteComparison, update: updateWebsiteComparison, remove: removeWebsiteComparison } = useFirestore<WebsiteComparison>('website_comparisons', [orderBy('createdAt', 'desc')], true, 50, 'website_comparisons');
  const { data: websiteTestimonials, loading: websiteTestimonialsLoading, add: addWebsiteTestimonial, update: updateWebsiteTestimonial, remove: removeWebsiteTestimonial } = useFirestore<WebsiteTestimonial>('website_testimonials', [orderBy('createdAt', 'desc')], true, 100, 'website_testimonials');
  const { data: websitePackages, loading: websitePackagesLoading, add: addWebsitePackage, update: updateWebsitePackage, remove: removeWebsitePackage } = useFirestore<WebsitePackage>('website_packages', [orderBy('order', 'asc')], true, 100, 'website_packages');
  const { data: websiteServices, loading: websiteServicesLoading, add: addWebsiteService, update: updateWebsiteService, remove: removeWebsiteService } = useFirestore<WebsiteService>('website_services', [orderBy('order', 'asc')], true, 100, 'website_services');
  const { data: websiteFaqs, loading: websiteFaqsLoading, add: addWebsiteFaq, update: updateWebsiteFaq, remove: removeWebsiteFaq } = useFirestore<WebsiteFaq>('website_faqs', [orderBy('order', 'asc')], true, 100, 'website_faqs');
  const { data: websiteCaseStudies, loading: websiteCaseStudiesLoading, add: addWebsiteCaseStudy, update: updateWebsiteCaseStudy, remove: removeWebsiteCaseStudy } = useFirestore<WebsiteCaseStudy>('website_case_studies', [orderBy('createdAt', 'desc')], true, 50, 'website_case_studies');
  const { data: websiteBlogs, loading: websiteBlogsLoading, add: addWebsiteBlog, update: updateWebsiteBlog, remove: removeWebsiteBlog } = useFirestore<WebsiteBlog>('website_blogs', [orderBy('createdAt', 'desc')], true, 100, 'website_blogs');
  const { data: websiteTimeline, loading: websiteTimelineLoading, add: addWebsiteTimeline, update: updateWebsiteTimeline, remove: removeWebsiteTimeline } = useFirestore<WebsiteTimeline>('website_timeline', [orderBy('order', 'asc')], true, 50, 'website_timeline');
  const { data: websiteGear, loading: websiteGearLoading, add: addWebsiteGear, update: updateWebsiteGear, remove: removeWebsiteGear } = useFirestore<WebsiteGear>('website_gear', [orderBy('order', 'asc')], true, 50, 'website_gear');
  const { data: coupons, loading: couponsLoading, add: addCoupon, update: updateCoupon, remove: removeCoupon } = useFirestore<Coupon>('coupons', [orderBy('createdAt', 'desc')], adminEnabled);
  const { data: bookings, loading: bookingsLoading, update: updateBooking, remove: removeBooking } = useFirestore<Booking>('bookings', [orderBy('createdAt', 'desc')], adminEnabled);

  // ─── Audit-logged wrappers ────────────────────────────────────────────────────
  const actorName = userData?.name ?? 'Unknown';
  const actorUid  = user?.uid ?? '';

  const loggedAddTask = useCallback(async (item: Omit<Task, 'id'>) => {
    validate(TaskSchema, item);
    const ref = await addTask(item);
    logActivity({ by: actorName, byUid: actorUid, action: 'task.created', collection: 'tasks', docId: ref?.id ?? '', docTitle: item.title, after: { title: item.title, status: item.status, client: item.client } });
    return ref;
  }, [addTask, actorName, actorUid]);

  const loggedUpdateTask = useCallback(async (id: string, item: Partial<Task>) => {
    const prev = tasks.find(t => t.id === id);
    await updateTask(id, item);
    const newStatus = item.status;
    const statusChanged = newStatus && prev?.status !== newStatus;
    const action = statusChanged ? 'task.status_changed' : 'task.updated';
    logActivity({ by: actorName, byUid: actorUid, action, collection: 'tasks', docId: id, docTitle: prev?.title, before: newStatus ? { status: prev?.status } : undefined, after: newStatus ? { status: newStatus } : undefined });

    // Auto workflow: fire-and-forget notifications on key status transitions
    if (statusChanged) {
      const task = { ...prev, ...item } as Task;
      const clientEmail = task.clientEmail || '';
      const clientName  = task.client || 'Client';
      const clientPhone = task.clientPhone || '';
      const projectName = task.title || 'your project';
      const driveLink   = task.driveFolderLink || '';

      if ((newStatus === 'delivered' || newStatus === 'completed' || newStatus === 'review') && prev?.status !== newStatus) {
        // Send In-App Notification
        if (task.clientId) {
          addNotification({
            recipientId: task.clientId,
            title: `Project Update: ${newStatus.toUpperCase()}`,
            message: `Your project "${projectName}" is now marked as ${newStatus}. Check your portal for details.`,
            type: 'system',
            read: false,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }

        if ((newStatus === 'delivered' || newStatus === 'completed') && prev?.status !== 'delivered' && prev?.status !== 'completed') {
          if (clientEmail) sendCompletionEmail(clientEmail, clientName, projectName, driveLink).catch(() => {});
          if (clientPhone) sendOrderCompletedSMS(clientPhone, clientName, task.songName || '', task.packageName || 'project').catch(() => {});
        }
      }
    }
  }, [updateTask, tasks, actorName, actorUid, addNotification]);

  const loggedRemoveTask = useCallback(async (id: string) => {
    const prev = tasks.find(t => t.id === id);
    await removeTask(id);
    logActivity({ by: actorName, byUid: actorUid, action: 'task.deleted', collection: 'tasks', docId: id, docTitle: prev?.title });
  }, [removeTask, tasks, actorName, actorUid]);

  const loggedAddClient = useCallback(async (item: Omit<Client, 'id'>) => {
    validate(ClientSchema, item);
    const ref = await addClient(item);
    logActivity({ by: actorName, byUid: actorUid, action: 'client.created', collection: 'clients', docId: ref?.id ?? '', docTitle: item.name });
    return ref;
  }, [addClient, actorName, actorUid]);

  const loggedUpdateClient = useCallback(async (id: string, item: Partial<Client>) => {
    const prev = clients.find(c => c.id === id);
    await updateClient(id, item);
    logActivity({ by: actorName, byUid: actorUid, action: 'client.updated', collection: 'clients', docId: id, docTitle: prev?.name ?? item.name, before: { status: prev?.status }, after: { status: item.status } });
  }, [updateClient, clients, actorName, actorUid]);

  const loggedRemoveClient = useCallback(async (id: string) => {
    const prev = clients.find(c => c.id === id);
    await removeClient(id);
    logActivity({ by: actorName, byUid: actorUid, action: 'client.deleted', collection: 'clients', docId: id, docTitle: prev?.name });
  }, [removeClient, clients, actorName, actorUid]);

  const loggedAddTx = useCallback(async (item: Omit<Transaction, 'id'>) => {
    validate(TransactionSchema, item);
    const ref = await addTx(item);
    logActivity({ by: actorName, byUid: actorUid, action: 'transaction.created', collection: 'transactions', docId: ref?.id ?? '', docTitle: item.title, after: { type: item.type, amount: item.amount } });
    if (item.amount) {
      const date = (item as any).date || (item as any).createdAt;
      if (item.type === 'in')  updateGlobalStats({ income:   Number(item.amount), date }).catch(() => {});
      if (item.type === 'out') updateGlobalStats({ expenses: Number(item.amount), date }).catch(() => {});
    }
    return ref;
  }, [addTx, actorName, actorUid]);

  const loggedUpdateTx = useCallback(async (id: string, item: Partial<Transaction>) => {
    const prev = transactions.find(t => t.id === id);
    await updateTx(id, item);
    logActivity({ by: actorName, byUid: actorUid, action: 'transaction.updated', collection: 'transactions', docId: id, docTitle: prev?.title ?? item.title, before: { status: prev?.status, amount: prev?.amount }, after: { status: item.status, amount: item.amount } });
  }, [updateTx, transactions, actorName, actorUid]);

  const loggedRemoveTx = useCallback(async (id: string) => {
    const prev = transactions.find(t => t.id === id);
    await removeTx(id);
    logActivity({ by: actorName, byUid: actorUid, action: 'transaction.deleted', collection: 'transactions', docId: id, docTitle: prev?.title });
    if (prev?.amount) {
      const delta = { date: (prev as any).date || (prev as any).createdAt };
      if (prev.type === 'in')  decrementGlobalStats({ income:   Number(prev.amount), ...delta }).catch(() => {});
      if (prev.type === 'out') decrementGlobalStats({ expenses: Number(prev.amount), ...delta }).catch(() => {});
    }
  }, [removeTx, transactions, actorName, actorUid]);

  const loggedUpdateMonthlyLedger = useCallback(async (id: string, item: Partial<MonthlyLedger>) => {
    await updateMonthlyLedger(id, item);
    if (item.closed) logActivity({ by: actorName, byUid: actorUid, action: 'ledger.closed', collection: 'monthlyLedgers', docId: id, docTitle: item.month ?? id });
  }, [updateMonthlyLedger, actorName, actorUid]);

  const loggedAddWorkerPayment = useCallback(async (item: Omit<WorkerPayment, 'id'>) => {
    validate(WorkerPaymentSchema, item);
    const ref = await addWorkerPayment(item);
    logActivity({ by: actorName, byUid: actorUid, action: 'workerPayment.created', collection: 'workerPayments', docId: ref?.id ?? '', docTitle: item.workerName ?? item.workerId, after: { amount: item.amount, taskId: item.taskId } });
    return ref;
  }, [addWorkerPayment, actorName, actorUid]);

  const validatedAddLead = useCallback(async (item: Omit<Lead, 'id'>) => {
    validate(LeadSchema, item);
    return addLead(item);
  }, [addLead]);

  const validatedAddComm = useCallback(async (item: Omit<Communication, 'id'>) => {
    validate(CommunicationSchema, item);
    return addComm(item);
  }, [addComm]);

  const validatedAddNote = useCallback(async (item: Omit<Note, 'id'>) => {
    validate(NoteSchema, item);
    return addNote(item);
  }, [addNote]);

  const validatedAddTodo = useCallback(async (item: Omit<Todo, 'id'>) => {
    validate(TodoSchema, item);
    return addTodo(item);
  }, [addTodo]);

  const validatedAddCoupon = useCallback(async (item: Omit<Coupon, 'id'>) => {
    validate(CouponSchema, item);
    return addCoupon(item);
  }, [addCoupon]);

  const value = {
    tasks, tasksLoading, addTask: loggedAddTask, updateTask: loggedUpdateTask, removeTask: loggedRemoveTask,
    clients, clientsLoading, addClient: loggedAddClient, updateClient: loggedUpdateClient, removeClient: loggedRemoveClient,
    transactions, txLoading, addTx: loggedAddTx, updateTx: loggedUpdateTx, removeTx: loggedRemoveTx,
    users, usersLoading, updateUser, removeUser,
    workerPayments, workerPaymentsLoading, addWorkerPayment: loggedAddWorkerPayment, removeWorkerPayment,
    monthlyLedgers, monthlyLedgersLoading, addMonthlyLedger, updateMonthlyLedger: loggedUpdateMonthlyLedger, removeMonthlyLedger,
    notes, notesLoading, addNote: validatedAddNote, updateNote, removeNote,
    todos, todosLoading, addTodo: validatedAddTodo, updateTodo, removeTodo,
    leads, leadsLoading, addLead: validatedAddLead, updateLead, removeLead,
    comms, commsLoading, addComm: validatedAddComm, updateComm, removeComm,
    notifications, notificationsLoading, updateNotification, removeNotification,
    websiteShowcase, websiteShowcaseLoading, addWebsiteShowcase, updateWebsiteShowcase, removeWebsiteShowcase,
    websiteComparisons, websiteComparisonsLoading, addWebsiteComparison, updateWebsiteComparison, removeWebsiteComparison,
    websiteTestimonials, websiteTestimonialsLoading, addWebsiteTestimonial, updateWebsiteTestimonial, removeWebsiteTestimonial,
    websitePackages, websitePackagesLoading, addWebsitePackage, updateWebsitePackage, removeWebsitePackage,
    websiteServices, websiteServicesLoading, addWebsiteService, updateWebsiteService, removeWebsiteService,
    websiteFaqs, websiteFaqsLoading, addWebsiteFaq, updateWebsiteFaq, removeWebsiteFaq,
    websiteCaseStudies, websiteCaseStudiesLoading, addWebsiteCaseStudy, updateWebsiteCaseStudy, removeWebsiteCaseStudy,
    websiteBlogs, websiteBlogsLoading, addWebsiteBlog, updateWebsiteBlog, removeWebsiteBlog,
    websiteTimeline, websiteTimelineLoading, addWebsiteTimeline, updateWebsiteTimeline, removeWebsiteTimeline,
    websiteGear, websiteGearLoading, addWebsiteGear, updateWebsiteGear, removeWebsiteGear,
    coupons, couponsLoading, addCoupon: validatedAddCoupon, updateCoupon, removeCoupon,
    bookings, bookingsLoading, updateBooking, removeBooking,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
