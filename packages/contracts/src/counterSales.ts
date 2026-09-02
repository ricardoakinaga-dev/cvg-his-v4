import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Counter Sale
// =====================

export const counterSaleStatusSchema = z.enum(['open', 'closed', 'cancelled']);
export const counterSaleItemTypeSchema = z.enum(['product', 'service']);
export const counterSalePaymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'bank_transfer',
  'check',
  'insurance',
  'other'
]);

function containsControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      (codePoint <= 0x1f || codePoint === 0x7f || (codePoint >= 0x80 && codePoint <= 0x9f))
    ) {
      return true;
    }
  }

  return false;
}

export const createCounterSaleBodySchema = z.object({
  ownerId: uuidSchema.optional().nullable(),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const cancelCounterSaleBodySchema = z
  .object({
    reason: z
      .string()
      .refine((value) => !containsControlCharacters(value), {
        message: 'reason cannot contain control characters'
      })
      .transform(trim)
      .pipe(z.string().min(1).max(500))
  })
  .strict();

export const counterSaleCancellationHeadersSchema = z.object({
  'idempotency-key': z.string().trim().min(1).max(255)
});

export const counterSaleResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  number: z.string(),
  ownerId: uuidSchema.nullable().optional(),
  status: counterSaleStatusSchema,
  subtotal: z.coerce.number(),
  discountAmount: z.coerce.number(),
  total: z.coerce.number(),
  paidAmount: z.coerce.number(),
  balanceDue: z.coerce.number(),
  notes: z.string().nullable().optional(),
  openedByUserId: uuidSchema,
  closedByUserId: uuidSchema.nullable().optional(),
  closedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const counterSaleCancellationHistoryResponseSchema = z.object({
  eventId: uuidSchema,
  accountId: uuidSchema,
  counterSaleId: uuidSchema,
  cancelledByUserId: uuidSchema,
  cancelledAt: z.coerce.date(),
  reason: z
    .string()
    .refine((value) => !containsControlCharacters(value), {
      message: 'reason cannot contain control characters'
    })
    .pipe(z.string().min(1).max(500)),
  correlationId: z.string().min(1).max(255)
});

export const counterSaleDetailResponseSchema = counterSaleResponseSchema.extend({
  items: z.array(z.unknown()),
  payments: z.array(z.unknown()),
  receipt: z.unknown().nullable(),
  cancellationHistory: z.array(counterSaleCancellationHistoryResponseSchema)
});

export const listCounterSalesQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(
  z.object({
    status: counterSaleStatusSchema.optional(),
    ownerId: uuidSchema.optional()
  })
);

export const listCounterSalesResponseSchema =
  createPaginatedResponseSchema(counterSaleResponseSchema);

export type CreateCounterSaleBody = z.infer<typeof createCounterSaleBodySchema>;
export type CancelCounterSaleBody = z.infer<typeof cancelCounterSaleBodySchema>;
export type CounterSaleResponse = z.infer<typeof counterSaleResponseSchema>;
export type CounterSaleDetailResponse = z.infer<typeof counterSaleDetailResponseSchema>;
export type ListCounterSalesQuery = z.infer<typeof listCounterSalesQuerySchema>;
export type ListCounterSalesResponse = z.infer<typeof listCounterSalesResponseSchema>;

// =====================
// Counter Sale Item
// =====================

export const createCounterSaleItemBodySchema = z.object({
  itemType: counterSaleItemTypeSchema,
  catalogItemId: uuidSchema.optional().nullable(),
  nameSnapshot: z.string().min(1).max(255).transform(trim),
  codeSnapshot: z.string().max(64).transform(trim).optional().nullable(),
  unitPrice: z.coerce.number().nonnegative().max(999999999.99),
  quantity: z.coerce.number().int().min(1).default(1),
  discountAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const updateCounterSaleItemBodySchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const counterSaleItemResponseSchema = z.object({
  id: uuidSchema,
  counterSaleId: uuidSchema,
  accountId: uuidSchema,
  itemType: counterSaleItemTypeSchema,
  catalogItemId: uuidSchema.nullable().optional(),
  nameSnapshot: z.string(),
  codeSnapshot: z.string().nullable().optional(),
  unitPrice: z.coerce.number(),
  quantity: z.coerce.number(),
  discountAmount: z.coerce.number(),
  lineTotal: z.coerce.number(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type CreateCounterSaleItemBody = z.infer<typeof createCounterSaleItemBodySchema>;
export type UpdateCounterSaleItemBody = z.infer<typeof updateCounterSaleItemBodySchema>;
export type CounterSaleItemResponse = z.infer<typeof counterSaleItemResponseSchema>;

// =====================
// Counter Sale Payment
// =====================

export const createCounterSalePaymentBodySchema = z.object({
  method: counterSalePaymentMethodSchema,
  amount: z.coerce.number().positive().max(999999999.99),
  installments: z.coerce.number().int().min(1).max(48).optional().default(1),
  reference: z.string().max(255).transform(trim).optional().nullable(),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const counterSalePaymentResponseSchema = z.object({
  id: uuidSchema,
  counterSaleId: uuidSchema,
  accountId: uuidSchema,
  method: counterSalePaymentMethodSchema,
  amount: z.coerce.number(),
  installments: z.coerce.number(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date()
});

export type CreateCounterSalePaymentBody = z.infer<typeof createCounterSalePaymentBodySchema>;
export type CounterSalePaymentResponse = z.infer<typeof counterSalePaymentResponseSchema>;

// =====================
// Contract
// =====================

export const counterSalesContract = {
  create: {
    method: 'POST' as const,
    path: '/counter-sales',
    body: createCounterSaleBodySchema,
    responses: { 201: counterSaleResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/counter-sales/:id',
    params: idParamSchema,
    responses: { 200: counterSaleDetailResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/counter-sales',
    query: listCounterSalesQuerySchema,
    responses: { 200: listCounterSalesResponseSchema }
  },
  close: {
    method: 'POST' as const,
    path: '/counter-sales/:id/close',
    params: idParamSchema,
    responses: { 200: counterSaleResponseSchema }
  },
  cancel: {
    method: 'POST' as const,
    path: '/counter-sales/:id/cancel',
    params: idParamSchema,
    headers: counterSaleCancellationHeadersSchema,
    body: cancelCounterSaleBodySchema,
    responses: { 200: counterSaleResponseSchema }
  },
  reopen: {
    method: 'POST' as const,
    path: '/counter-sales/:id/reopen',
    params: idParamSchema,
    responses: { 200: counterSaleResponseSchema }
  },
  addItem: {
    method: 'POST' as const,
    path: '/counter-sales/:id/items',
    params: idParamSchema,
    body: createCounterSaleItemBodySchema,
    responses: { 201: counterSaleItemResponseSchema }
  },
  updateItem: {
    method: 'PATCH' as const,
    path: '/counter-sales/:id/items/:itemId',
    params: z.object({ id: idParamSchema, itemId: idParamSchema }),
    body: updateCounterSaleItemBodySchema,
    responses: { 200: counterSaleItemResponseSchema }
  },
  removeItem: {
    method: 'DELETE' as const,
    path: '/counter-sales/:id/items/:itemId',
    params: z.object({ id: idParamSchema, itemId: idParamSchema }),
    responses: { 204: z.undefined() }
  },
  addPayment: {
    method: 'POST' as const,
    path: '/counter-sales/:id/payments',
    params: idParamSchema,
    body: createCounterSalePaymentBodySchema,
    responses: { 201: counterSalePaymentResponseSchema }
  },
  commercialDashboard: {
    method: 'GET' as const,
    path: '/admin/commercial-dashboard',
    query: z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional()
    }),
    responses: {
      200: z.object({
        openSales: z.coerce.number(),
        closedToday: z.coerce.number(),
        grossRevenueToday: z.coerce.number(),
        netRevenueToday: z.coerce.number(),
        avgTicket: z.coerce.number(),
        salesByPaymentMethod: z.array(z.object({ method: z.string(), total: z.coerce.number() })),
        topProducts: z.array(
          z.object({ name: z.string(), quantity: z.coerce.number(), revenue: z.coerce.number() })
        ),
        topServices: z.array(
          z.object({ name: z.string(), quantity: z.coerce.number(), revenue: z.coerce.number() })
        ),
        quotesIssued: z.coerce.number(),
        quotesConverted: z.coerce.number()
      })
    }
  }
} as const;

export type CounterSalesContract = typeof counterSalesContract;
