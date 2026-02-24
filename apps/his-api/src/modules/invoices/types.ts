import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const invoiceStatusSchema = z.enum(['open', 'paid', 'partial', 'cancelled']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const paymentMethodSchema = z.enum(['cash', 'card', 'pix']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// ============================================
// DATABASE RECORD TYPES
// ============================================

export interface InvoiceRecord {
  id: string;
  accountId: string;
  encounterId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discount: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  notes: string | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  accountId: string;
  invoiceId: string;
  paymentNumber: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedByUserId: string;
  receivedAt: Date;
  createdAt: Date;
}

export interface InvoiceWithDetails extends InvoiceRecord {
  encounter?: {
    id: string;
    patientId: string;
    patientName: string;
    patientSpecies: string;
    ownerName: string;
  };
  payments: PaymentRecord[];
  billingItems: BillingItemSummary[];
}

// API response type for invoice with details
export interface InvoiceWithDetailsResponse {
  invoice: InvoiceRecord;
  encounter?: {
    id: string;
    patientId: string;
    patientName: string;
    patientSpecies: string;
    ownerName: string;
  };
  payments: PaymentRecord[];
  billingItems: BillingItemSummary[];
}

export interface BillingItemSummary {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  status: string;
}

// ============================================
// API INPUT SCHEMAS
// ============================================

export const invoiceIdParamSchema = z.object({
  invoiceId: z.string().uuid()
});

export const encounterIdParamSchema = z.object({
  encounterId: z.string().uuid()
});

export const listInvoicesQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const createInvoiceFromEncounterSchema = z.object({
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional()
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(1)
});

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: paymentMethodSchema,
  reference: z.string().optional(),
  notes: z.string().optional()
});

export const listPaymentsQuerySchema = z.object({
  invoiceId: z.string().uuid().optional(),
  method: paymentMethodSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const cashReportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// ============================================
// API OUTPUT TYPES
// ============================================

export interface InvoiceListResponse {
  items: InvoiceWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentListResponse {
  items: PaymentRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CashReportResponse {
  date: string;
  totalReceived: string;
  paymentCount: number;
  byMethod: {
    method: PaymentMethod;
    count: number;
    total: string;
  }[];
  payments: PaymentRecord[];
}
