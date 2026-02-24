import { z } from 'zod';
// ============================================
// ENUMS
// ============================================
export const invoiceStatusSchema = z.enum(['open', 'paid', 'partial', 'cancelled']);
export const paymentMethodSchema = z.enum(['cash', 'card', 'pix']);
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
//# sourceMappingURL=types.js.map