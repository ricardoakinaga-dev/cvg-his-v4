import { z } from 'zod';

import { nullableTrimmedText, uuidSchema } from './common.js';

export const encounterFinancialStatusSchema = z.enum(['pending', 'partial', 'paid']);
export const encounterReceivableStatusSchema = z.enum(['open', 'settled']);
export const encounterFinancialEncounterParamSchema = z.object({ encounterId: uuidSchema });
export const encounterReceivableParamSchema = z.object({ receivableId: uuidSchema });

export const encounterReceivablePaymentResponseSchema = z.object({
  id: uuidSchema,
  receivableId: uuidSchema,
  financialAccountId: uuidSchema,
  encounterId: uuidSchema,
  amountPaid: z.coerce.number(),
  paidAt: z.coerce.date(),
  paidByUserId: uuidSchema.nullable().optional(),
  notes: z.string().nullable().optional()
});

export const encounterReceivableResponseSchema = z.object({
  id: uuidSchema,
  encounterId: uuidSchema,
  financialAccountId: uuidSchema,
  installmentNumber: z.number().int().min(1),
  installmentLabel: z.string(),
  dueAt: z.coerce.date().nullable().optional(),
  status: encounterReceivableStatusSchema,
  amountOriginal: z.coerce.number(),
  amountPaid: z.coerce.number(),
  amountOutstanding: z.coerce.number(),
  issuedAt: z.coerce.date(),
  settledAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  payments: z.array(encounterReceivablePaymentResponseSchema).default([])
});

export const encounterReceivableListItemResponseSchema = encounterReceivableResponseSchema.extend({
  encounterStatus: z.enum(['open', 'closed']),
  patientId: uuidSchema,
  patientName: z.string(),
  patientSpecies: z.string().nullable().optional(),
  ownerId: uuidSchema,
  ownerName: z.string(),
  ownerPhoneMain: z.string().nullable().optional(),
  financialStatus: encounterFinancialStatusSchema,
  totalAmount: z.coerce.number(),
  lastClosedAt: z.coerce.date().nullable().optional()
});

export const encounterFinancialSummaryResponseSchema = z.object({
  encounterId: uuidSchema,
  accountId: uuidSchema,
  encounterStatus: z.enum(['open', 'closed']),
  financialStatus: encounterFinancialStatusSchema,
  financialClosed: z.boolean(),
  subtotal: z.coerce.number(),
  discountTotal: z.coerce.number(),
  total: z.coerce.number(),
  paidAmount: z.coerce.number(),
  balanceDue: z.coerce.number(),
  closedAt: z.coerce.date().nullable().optional(),
  closedByUserId: uuidSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  receivable: encounterReceivableResponseSchema.nullable().optional(),
  receivables: z.array(encounterReceivableResponseSchema).default([]),
  payments: z.array(encounterReceivablePaymentResponseSchema).default([])
});

export const encounterFinancialInstallmentInputSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  amount: z.coerce.number().positive().max(999999999.99),
  dueAt: z.coerce.date().nullable().optional(),
  notes: nullableTrimmedText
});

export const closeEncounterFinancialBodySchema = z.object({
  paidAmount: z.coerce.number().nonnegative().max(999999999.99).default(0),
  notes: nullableTrimmedText,
  installments: z.array(encounterFinancialInstallmentInputSchema).max(24).optional()
});

export const settleEncounterReceivableBodySchema = z.object({
  amountPaid: z.coerce.number().positive().max(999999999.99),
  notes: nullableTrimmedText
});

export const listEncounterReceivablesQuerySchema = z.object({
  status: encounterReceivableStatusSchema.optional(),
  search: z.string().trim().min(2).max(120).optional(),
  encounterId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const encounterReceivableListResponseSchema = z.object({
  data: z.array(encounterReceivableListItemResponseSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  openCount: z.number().int().min(0),
  settledCount: z.number().int().min(0),
  totalOutstanding: z.coerce.number(),
  totalSettled: z.coerce.number()
});

export type EncounterFinancialSummaryResponse = z.infer<typeof encounterFinancialSummaryResponseSchema>;
export type EncounterReceivablePaymentResponse = z.infer<typeof encounterReceivablePaymentResponseSchema>;
export type EncounterReceivableListItemResponse = z.infer<typeof encounterReceivableListItemResponseSchema>;
export type EncounterReceivableListResponse = z.infer<typeof encounterReceivableListResponseSchema>;
export type CloseEncounterFinancialBody = z.infer<typeof closeEncounterFinancialBodySchema>;
export type SettleEncounterReceivableBody = z.infer<typeof settleEncounterReceivableBodySchema>;
export type ListEncounterReceivablesQuery = z.infer<typeof listEncounterReceivablesQuerySchema>;

export const encounterFinancialContract = {
  getSummary: {
    method: 'GET' as const,
    path: '/encounters/:encounterId/financial-summary',
    params: encounterFinancialEncounterParamSchema,
    responses: { 200: encounterFinancialSummaryResponseSchema }
  },
  close: {
    method: 'POST' as const,
    path: '/encounters/:encounterId/financial-close',
    params: encounterFinancialEncounterParamSchema,
    body: closeEncounterFinancialBodySchema,
    responses: { 200: encounterFinancialSummaryResponseSchema }
  },
  listReceivables: {
    method: 'GET' as const,
    path: '/financial/receivables',
    query: listEncounterReceivablesQuerySchema,
    responses: { 200: encounterReceivableListResponseSchema }
  },
  settleReceivable: {
    method: 'POST' as const,
    path: '/financial/receivables/:receivableId/settle',
    params: encounterReceivableParamSchema,
    body: settleEncounterReceivableBodySchema,
    responses: { 200: encounterReceivableResponseSchema }
  }
} as const;
