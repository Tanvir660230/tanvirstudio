import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const optStr  = z.string().optional();
const optNum  = z.union([z.number(), z.string()]).optional();
const coerced = z.coerce.number().nonnegative();

// ─── Task ─────────────────────────────────────────────────────────────────────
export const TaskSchema = z.object({
  title:       z.string().min(1, 'Task title is required'),
  status:      z.string().min(1, 'Status is required'),
  client:      optStr,
  clientEmail: optStr,
  clientPhone: optStr,
  clientUid:   optStr,
  budget:      optNum,
  advance:     optNum,
  priority:    z.enum(['normal', 'high', 'urgent']).optional(),
  deadline:    optStr,
  description: optStr,
  packageName: optStr,
  songName:    optStr,
  publicOrder: z.boolean().optional(),
  composerId:  optStr,
  hummingArtistId: optStr,
  needsHumming: z.boolean().optional(),
  deliveryDate: optStr,
  recordingDate: optStr,
});

// ─── Client ───────────────────────────────────────────────────────────────────
export const ClientSchema = z.object({
  name:    z.string().min(1, 'Client name is required'),
  email:   z.string().email('Invalid email').optional().or(z.literal('')),
  phone:   optStr,
  company: optStr,
  address: optStr,
  notes:   optStr,
  status:  z.enum(['Active', 'Inactive']).optional(),
  source:  optStr,
});

// ─── Transaction ──────────────────────────────────────────────────────────────
export const TransactionSchema = z.object({
  title:    z.string().min(1, 'Transaction title is required'),
  type:     z.enum(['in', 'out']),
  amount:   z.union([
    coerced,
    z.string().min(1).refine(v => !isNaN(Number(v)), 'Amount must be a number'),
  ]),
  status:      z.enum(['Pending', 'Completed', 'Cancelled']).optional(),
  description: optStr,
  category:    optStr,
  date:        optStr,
  clientId:    optStr,
  taskId:      optStr,
});

// ─── Coupon ───────────────────────────────────────────────────────────────────
export const CouponSchema = z.object({
  code:        z.string().min(1, 'Coupon code is required').max(20),
  type:        z.enum(['percent', 'flat']),
  value:       z.number().positive('Discount value must be positive'),
  maxUses:     z.number().nonnegative().optional(),
  description: optStr,
  expiresAt:   optStr,
});

// ─── Booking ──────────────────────────────────────────────────────────────────
export const BookingSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Invalid email').optional().or(z.literal('')),
  phone:   optStr,
  service: optStr,
  message: optStr,
  date:    optStr,
  time:    optStr,
});

// ─── Note ─────────────────────────────────────────────────────────────────────
export const NoteSchema = z.object({
  title:   z.string().min(1, 'Note title is required'),
  content: optStr,
  color:   optStr,
  pinned:  z.boolean().optional(),
  tags:    z.array(z.string()).optional(),
});

// ─── Todo ─────────────────────────────────────────────────────────────────────
export const TodoSchema = z.object({
  title:    z.string().min(1, 'Task title is required'),
  done:     z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate:  optStr,
});

// ─── Lead ─────────────────────────────────────────────────────────────────────
export const LeadSchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  phone:    optStr,
  service:  optStr,
  budget:   optStr,
  deadline: optStr,
  message:  optStr,
  notes:    optStr,
  source:   optStr,
  status:   optStr,
});

// ─── Communication ────────────────────────────────────────────────────────────
export const CommunicationSchema = z.object({
  clientName:  optStr,
  clientEmail: optStr,
  subject:     optStr,
  body:        z.string().min(1, 'Body is required'),
  direction:   z.enum(['inbound', 'outbound']).optional(),
  channel:     z.enum(['email', 'whatsapp', 'phone', 'other']).optional(),
  date:        optStr,
  taskId:      optStr,
});

// ─── WorkerPayment ────────────────────────────────────────────────────────────
export const WorkerPaymentSchema = z.object({
  workerId:   z.string().min(1, 'Worker is required'),
  workerName: optStr,
  amount:     coerced,
  taskId:     optStr,
  taskTitle:  optStr,
  date:       optStr,
  method:     optStr,
  note:       optStr,
});

// ─── Validate helper ──────────────────────────────────────────────────────────
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(first?.message ?? 'Validation failed');
  }
  return result.data;
}
