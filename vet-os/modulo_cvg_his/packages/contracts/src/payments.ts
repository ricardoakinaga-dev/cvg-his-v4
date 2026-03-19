import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Enums
// =====================

export const paymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'bank_transfer',
  'check',
  'insurance',
  'other'
]);

export const paymentStatusSchema = z.enum([
  'pending',
  'completed',
  'refunded',
  'cancelled'
]);

// =====================
// Schemas
// =====================

export const createPaymentBodySchema = z.object({
  financialAccountId: uuidSchema,
  amount: z.number().positive('Amount must be positive'),
  method: paymentMethodSchema,
  installments: z.number().int().min(1).max(24).optional().default(1),
  reference: z.string().transform(trim).pipe(z.string().max(200)).optional().nullable(),
  notes: z.string().transform(trim).pipe(z.string().max(1000)).optional().nullable()
});

export const paymentIdParamSchema = idParamSchema;

export const listPaymentsQuerySchema = paginationQuerySchema.merge(z.object({
  financialAccountId: uuidSchema.optional(),
  method: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

export const paymentResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  financialAccountId: uuidSchema,
  amount: z.number(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  installments: z.number().int(),
  installmentNumber: z.number().int(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  processedByUserId: uuidSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listPaymentsResponseSchema = createPaginatedResponseSchema(paymentResponseSchema);

// Types
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
export type PaymentIdParam = z.infer<typeof paymentIdParamSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type PaymentResponse = z.infer<typeof paymentResponseSchema>;

// =====================
// Reports
// =====================

export const paymentsSummaryItemSchema = z.object({
  method: paymentMethodSchema,
  count: z.number().int(),
  totalAmount: z.number()
});

export const paymentsSummaryResponseSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  data: z.array(paymentsSummaryItemSchema),
  totalPayments: z.number().int(),
  totalAmount: z.number()
});

export type PaymentsSummaryItem = z.infer<typeof paymentsSummaryItemSchema>;
export type PaymentsSummaryResponse = z.infer<typeof paymentsSummaryResponseSchema>;
