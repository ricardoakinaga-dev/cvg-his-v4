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
// Quote
// =====================

export const quoteStatusSchema = z.enum(['draft', 'approved', 'rejected', 'expired', 'cancelled']);
export const quoteItemTypeSchema = z.enum(['product', 'service']);

export const createQuoteBodySchema = z.object({
  ownerId: uuidSchema.optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const updateQuoteBodySchema = createQuoteBodySchema.partial();

export const quoteResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  number: z.string(),
  ownerId: uuidSchema.nullable().optional(),
  status: quoteStatusSchema,
  validUntil: z.coerce.date().nullable().optional(),
  subtotal: z.coerce.number(),
  discountAmount: z.coerce.number(),
  total: z.coerce.number(),
  notes: z.string().nullable().optional(),
  createdByUserId: uuidSchema,
  convertedToSaleId: uuidSchema.nullable().optional(),
  convertedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listQuotesQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(
  z.object({
    status: quoteStatusSchema.optional(),
    ownerId: uuidSchema.optional()
  })
);

export const listQuotesResponseSchema = createPaginatedResponseSchema(quoteResponseSchema);

export type CreateQuoteBody = z.infer<typeof createQuoteBodySchema>;
export type UpdateQuoteBody = z.infer<typeof updateQuoteBodySchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
export type ListQuotesResponse = z.infer<typeof listQuotesResponseSchema>;

// =====================
// Quote Item
// =====================

export const createQuoteItemBodySchema = z.object({
  itemType: quoteItemTypeSchema,
  catalogItemId: uuidSchema.optional().nullable(),
  nameSnapshot: z.string().min(1).max(255).transform(trim),
  codeSnapshot: z.string().max(64).transform(trim).optional().nullable(),
  unitPrice: z.coerce.number().nonnegative().max(999999999.99),
  quantity: z.coerce.number().int().min(1).default(1),
  discountAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const updateQuoteItemBodySchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
  discountAmount: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(2000).transform(trim).optional().nullable()
});

export const quoteItemResponseSchema = z.object({
  id: uuidSchema,
  quoteId: uuidSchema,
  accountId: uuidSchema,
  itemType: quoteItemTypeSchema,
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

export type CreateQuoteItemBody = z.infer<typeof createQuoteItemBodySchema>;
export type UpdateQuoteItemBody = z.infer<typeof updateQuoteItemBodySchema>;
export type QuoteItemResponse = z.infer<typeof quoteItemResponseSchema>;

// =====================
// Contract
// =====================

export const quotesContract = {
  create: {
    method: 'POST' as const,
    path: '/quotes',
    body: createQuoteBodySchema,
    responses: { 201: quoteResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/quotes/:id',
    params: idParamSchema,
    responses: { 200: quoteResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/quotes',
    query: listQuotesQuerySchema,
    responses: { 200: listQuotesResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/quotes/:id',
    params: idParamSchema,
    body: updateQuoteBodySchema,
    responses: { 200: quoteResponseSchema }
  },
  addItem: {
    method: 'POST' as const,
    path: '/quotes/:id/items',
    params: idParamSchema,
    body: createQuoteItemBodySchema,
    responses: { 201: quoteItemResponseSchema }
  },
  updateItem: {
    method: 'PATCH' as const,
    path: '/quotes/:id/items/:itemId',
    params: z.object({ id: idParamSchema, itemId: idParamSchema }),
    body: updateQuoteItemBodySchema,
    responses: { 200: quoteItemResponseSchema }
  },
  removeItem: {
    method: 'DELETE' as const,
    path: '/quotes/:id/items/:itemId',
    params: z.object({ id: idParamSchema, itemId: idParamSchema }),
    responses: { 204: z.undefined() }
  },
  approve: {
    method: 'POST' as const,
    path: '/quotes/:id/approve',
    params: idParamSchema,
    responses: { 200: quoteResponseSchema }
  },
  reject: {
    method: 'POST' as const,
    path: '/quotes/:id/reject',
    params: idParamSchema,
    responses: { 200: quoteResponseSchema }
  },
  cancel: {
    method: 'POST' as const,
    path: '/quotes/:id/cancel',
    params: idParamSchema,
    responses: { 200: quoteResponseSchema }
  },
  convertToSale: {
    method: 'POST' as const,
    path: '/quotes/:id/convert-to-sale',
    params: idParamSchema,
    responses: { 201: z.object({ counterSaleId: uuidSchema, quoteId: uuidSchema }) }
  },
  print: {
    method: 'GET' as const,
    path: '/quotes/:id/print',
    params: idParamSchema,
    responses: { 200: z.object({ html: z.string() }) }
  }
} as const;

export type QuotesContract = typeof quotesContract;
