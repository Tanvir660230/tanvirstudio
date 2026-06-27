import type { Timestamp } from 'firebase/firestore';

type FirestoreDate = Timestamp | string | null | undefined;

export interface TaskPayment {
  amount: number;
  date: string;
  method?: string;
  note?: string;
}

export interface TaskActivityLog {
  type: string;
  from?: string;
  to?: string;
  by: string;
  at: string;
}

export type TaskStatus =
  | 'recording' | 'humming' | 'composition' | 'mixing'
  | 'mastering' | 'revision' | 'delivered' | 'completed' | 'pending';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  client?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientUid?: string;
  budget?: number | string;
  advance?: number | string;
  progress?: number;
  priority?: 'normal' | 'high' | 'urgent';
  deadline?: string;
  description?: string;
  packageName?: string;
  songName?: string;
  publicOrder?: boolean;
  composerId?: string;
  hummingArtistId?: string;
  needsHumming?: boolean;
  deliveryDate?: string;
  recordingDate?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  driveFolderLink?: string;
  payments?: TaskPayment[];
  activityLog?: TaskActivityLog[];
  composerCommissionPct?: number;
  composerCommissionType?: 'percentage' | 'flat';
  composerCommissionAmount?: number;
  hummingArtistCommissionPct?: number;
  hummingArtistCommissionType?: 'percentage' | 'flat';
  hummingArtistCommissionAmount?: number;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  status?: 'Active' | 'Inactive';
  source?: string;
  createdAt?: FirestoreDate;
}

export interface Transaction {
  id: string;
  title: string;
  type: 'in' | 'out';
  amount: number | string;
  status?: 'Pending' | 'Completed' | 'Cancelled';
  description?: string;
  category?: string;
  date?: string;
  clientId?: string;
  taskId?: string;
  user?: string;
  createdAt?: FirestoreDate;
}

export type UserRole = 'admin' | 'composer' | 'humming_artist' | 'client';

export interface StudioUser {
  id: string;
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  photoURL?: string;
  theme?: 'light' | 'dark';
  accentColor?: string;
  referralCode?: string;
  fcmToken?: string;
  lastLoginAt?: FirestoreDate;
  createdAt?: FirestoreDate;
}

export interface WorkerPayment {
  id: string;
  workerId: string;
  workerName?: string;
  amount: number;
  taskId?: string;
  taskTitle?: string;
  date?: string;
  method?: string;
  note?: string;
  createdAt?: FirestoreDate;
}

export interface MonthlyLedger {
  id: string;
  monthKey: string;
  isLocked?: boolean;
  lockedAt?: FirestoreDate;
  note?: string;
  createdAt?: FirestoreDate;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  tags?: string[];
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Todo {
  id: string;
  title: string;
  done?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt?: FirestoreDate;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  service?: string;
  budget?: string;
  deadline?: string;
  message?: string;
  notes?: string;
  source?: string;
  status?: string;
  createdAt?: FirestoreDate;
}

export interface Communication {
  id: string;
  clientName?: string;
  clientEmail?: string;
  subject?: string;
  body: string;
  direction?: 'inbound' | 'outbound';
  channel?: 'email' | 'whatsapp' | 'phone' | 'other';
  date?: string;
  taskId?: string;
  createdAt?: FirestoreDate;
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt?: FirestoreDate;
  expiresAt?: FirestoreDate;
}

export interface Booking {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
  date?: string;
  time?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  clientUid?: string;
  createdAt?: FirestoreDate;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  maxUses?: number;
  usedCount?: number;
  description?: string;
  expiresAt?: string;
  createdAt?: FirestoreDate;
}

export interface WebsiteShowcase {
  id: string;
  title?: string;
  artist?: string;
  audioUrl?: string;
  coverUrl?: string;
  genre?: string;
  order?: number;
}

export interface WebsiteComparison {
  id: string;
  title?: string;
  beforeUrl?: string;
  afterUrl?: string;
  label?: string;
  order?: number;
}

export interface WebsiteTestimonial {
  id: string;
  name?: string;
  role?: string;
  text?: string;
  rating?: number;
  photoUrl?: string;
  order?: number;
}

export interface WebsitePackage {
  id: string;
  name?: string;
  price?: number | string;
  features?: string[];
  popular?: boolean;
  order?: number;
}

export interface WebsiteService {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;
  slug?: string;
  order?: number;
}

export interface WebsiteFaq {
  id: string;
  question?: string;
  answer?: string;
  order?: number;
}

export interface WebsiteCaseStudy {
  id: string;
  title?: string;
  description?: string;
  result?: string;
  imageUrl?: string;
  order?: number;
}

export interface WebsiteBlog {
  id: string;
  title?: string;
  content?: string;
  excerpt?: string;
  coverUrl?: string;
  author?: string;
  tags?: string[];
  published?: boolean;
  createdAt?: FirestoreDate;
}

export interface WebsiteTimeline {
  id: string;
  year?: string;
  title?: string;
  description?: string;
  order?: number;
}

export interface WebsiteGear {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  order?: number;
}

export interface Payment {
  amount: number;
  date: string;
  method?: string;
  note?: string;
}
