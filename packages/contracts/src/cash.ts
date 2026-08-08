import { z } from 'zod';

import {
  idParamSchema,
  paginationQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Enums
// =====================

export const cashRegisterStatusSchema = z.enum(['open', 'closed']);

export const cashMovementTypeSchema = z.enum([
  'opening',
  'closing',
  'payment',
  'supply',
  'withdrawal',
  'adjustment'
]);

// =====================
// Cash Registers
// =====================

export const openCashRegisterBodySchema = z.object({
  openingAmount: z.number().min(0, 'Opening amount must be >= 0'),
  notes: z.string().transform(trim).pipe(z.string().max(500)).optional().nullable()
});

export const closeCashRegisterBodySchema = z.object({
  closingAmount: z.number().min(0, 'Closing amount must be >= 0'),
  notes: z.string().transform(trim).pipe(z.string().max(500)).optional().nullable()
});

export const cashRegisterIdParamSchema = idParamSchema;

export const cashRegisterResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  openedByUserId: uuidSchema,
  closedByUserId: uuidSchema.nullable().optional(),
  openingAmount: z.number(),
  closingAmount: z.number().nullable().optional(),
  expectedClosingAmount: z.number().nullable().optional(),
  difference: z.number().nullable().optional(),
  status: cashRegisterStatusSchema,
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type CashRegisterStatus = z.infer<typeof cashRegisterStatusSchema>;
export type CashMovementType = z.infer<typeof cashMovementTypeSchema>;
export type OpenCashRegisterBody = z.infer<typeof openCashRegisterBodySchema>;
export type CloseCashRegisterBody = z.infer<typeof closeCashRegisterBodySchema>;
export type CashRegisterResponse = z.infer<typeof cashRegisterResponseSchema>;

// =====================
// Cash Movements
// =====================

export const createCashMovementBodySchema = z.object({
  cashRegisterId: uuidSchema,
  movementType: cashMovementTypeSchema,
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().transform(trim).pipe(z.string().max(200)).optional().nullable(),
  notes: z.string().transform(trim).pipe(z.string().max(500)).optional().nullable()
});

export const cashMovementResponseSchema = z.object({
  id: uuidSchema,
  cashRegisterId: uuidSchema,
  accountId: uuidSchema,
  movementType: cashMovementTypeSchema,
  amount: z.number(),
  runningBalance: z.number(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: uuidSchema.nullable().optional(),
  createdAt: z.coerce.date()
});

export const listCashMovementsQuerySchema = paginationQuerySchema.merge(z.object({
  cashRegisterId: uuidSchema.optional(),
  movementType: cashMovementTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

export type CreateCashMovementBody = z.infer<typeof createCashMovementBodySchema>;
export type CashMovementResponse = z.infer<typeof cashMovementResponseSchema>;
export type ListCashMovementsQuery = z.infer<typeof listCashMovementsQuerySchema>;

// =====================
// Cash Summary
// =====================

export const cashSummaryResponseSchema = z.object({
  registerId: uuidSchema,
  status: cashRegisterStatusSchema,
  openingAmount: z.number(),
  currentBalance: z.number(),
  totalPayments: z.number(),
  totalSupplies: z.number(),
  totalWithdrawals: z.number(),
  movementCount: z.number().int()
});

export type CashSummaryResponse = z.infer<typeof cashSummaryResponseSchema>;
