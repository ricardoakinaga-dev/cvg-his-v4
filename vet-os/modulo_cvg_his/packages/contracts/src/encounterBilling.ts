import { z } from 'zod';

import { createPaginatedResponseSchema, idParamSchema, nullableTrimmedText, paginationQuerySchema, uuidSchema } from './common.js';
import { encounterStatusSchema } from './encounters.js';

export const billingItemTypeSchema = z.enum(['service', 'product']);

const moneySchema = z.coerce.number().nonnegative().max(999999999.99);
const quantitySchema = z.coerce.number().int().positive().max(9999);
const discountAmountSchema = z.coerce.number().nonnegative().max(999999999.99);

export const encounterBillingItemIdParamSchema = idParamSchema;
export const encounterBillingEncounterParamSchema = z.object({ encounterId: uuidSchema });

export const createEncounterBillingItemBodySchema = z.object({
  itemType: billingItemTypeSchema,
  catalogItemId: uuidSchema.optional().nullable(),
  nameSnapshot: z.string().trim().min(2).max(255),
  codeSnapshot: z.string().trim().min(1).max(64).optional().nullable(),
  unitPrice: moneySchema,
  quantity: quantitySchema.default(1),
  discountAmount: discountAmountSchema.default(0),
  notes: nullableTrimmedText
}).refine((value) => value.discountAmount <= value.unitPrice * value.quantity, 'Discount cannot exceed gross total');

export const updateEncounterBillingItemBodySchema = z.object({
  nameSnapshot: z.string().trim().min(2).max(255).optional(),
  codeSnapshot: z.string().trim().min(1).max(64).optional().nullable(),
  unitPrice: moneySchema.optional(),
  quantity: quantitySchema.optional(),
  discountAmount: discountAmountSchema.optional(),
  notes: nullableTrimmedText.optional(),
  catalogItemId: uuidSchema.optional().nullable()
}).refine((value) => Object.values(value).some((field) => field !== undefined), 'At least one field is required for PATCH');

export const listEncounterBillingItemsQuerySchema = paginationQuerySchema.extend({
  encounterId: uuidSchema.optional(),
  itemType: billingItemTypeSchema.optional()
});

export const encounterBillingItemResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  encounterId: uuidSchema,
  itemType: billingItemTypeSchema,
  catalogItemId: uuidSchema.nullable().optional(),
  nameSnapshot: z.string(),
  codeSnapshot: z.string().nullable().optional(),
  unitPrice: z.coerce.number(),
  quantity: z.number().int().positive(),
  discountAmount: z.coerce.number(),
  lineTotal: z.coerce.number(),
  notes: z.string().nullable().optional(),
  createdByUserId: uuidSchema,
  updatedByUserId: uuidSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listEncounterBillingItemsResponseSchema = createPaginatedResponseSchema(encounterBillingItemResponseSchema);

export const encounterBillingSummaryTotalsSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  serviceItemCount: z.number().int().nonnegative(),
  productItemCount: z.number().int().nonnegative(),
  subtotal: z.coerce.number(),
  discountTotal: z.coerce.number(),
  total: z.coerce.number()
});

export const encounterBillingSummaryResponseSchema = z.object({
  encounterId: uuidSchema,
  accountId: uuidSchema,
  encounterStatus: encounterStatusSchema,
  totals: encounterBillingSummaryTotalsSchema,
  items: z.array(encounterBillingItemResponseSchema)
});

export type CreateEncounterBillingItemBody = z.infer<typeof createEncounterBillingItemBodySchema>;
export type UpdateEncounterBillingItemBody = z.infer<typeof updateEncounterBillingItemBodySchema>;
export type ListEncounterBillingItemsQuery = z.infer<typeof listEncounterBillingItemsQuerySchema>;
export type EncounterBillingItemResponse = z.infer<typeof encounterBillingItemResponseSchema>;
export type EncounterBillingSummaryResponse = z.infer<typeof encounterBillingSummaryResponseSchema>;

export const encounterBillingContract = {
  create: {
    method: 'POST' as const,
    path: '/encounters/:encounterId/billing-items',
    params: encounterBillingEncounterParamSchema,
    body: createEncounterBillingItemBodySchema,
    responses: { 201: encounterBillingItemResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/encounter-billing-items',
    query: listEncounterBillingItemsQuerySchema,
    responses: { 200: listEncounterBillingItemsResponseSchema }
  },
  getSummary: {
    method: 'GET' as const,
    path: '/encounters/:encounterId/billing-summary',
    params: encounterBillingEncounterParamSchema,
    responses: { 200: encounterBillingSummaryResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/encounter-billing-items/:id',
    params: encounterBillingItemIdParamSchema,
    body: updateEncounterBillingItemBodySchema,
    responses: { 200: encounterBillingItemResponseSchema }
  },
  remove: {
    method: 'DELETE' as const,
    path: '/encounter-billing-items/:id',
    params: encounterBillingItemIdParamSchema,
    responses: { 204: z.null() }
  }
} as const;
