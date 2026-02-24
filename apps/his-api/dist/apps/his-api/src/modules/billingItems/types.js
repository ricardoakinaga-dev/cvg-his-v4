import { z } from 'zod';
// Billing item status enum
export const BILLING_ITEM_STATUS = ['draft', 'confirmed', 'cancelled'];
// Zod schemas for validation
export const billingItemIdParamSchema = z.object({
    id: z.string().uuid()
});
export const encounterIdParamSchema = z.object({
    encounterId: z.string().uuid()
});
export const listBillingItemsQuerySchema = z.object({
    status: z.enum(BILLING_ITEM_STATUS).optional()
});
export const billingItemCreateSchema = z.object({
    serviceId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1).max(500),
    qty: z.coerce.number().positive().default(1),
    unitPrice: z.coerce.number().min(0).default(0)
});
export const billingItemUpdateSchema = z.object({
    serviceId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1).max(500).optional(),
    qty: z.coerce.number().positive().optional(),
    unitPrice: z.coerce.number().min(0).optional(),
    status: z.enum(BILLING_ITEM_STATUS).optional()
});
export const closeEncounterWithBillingSchema = z.object({
    reason: z.string().trim().max(500).optional()
});
// Response schemas
export const billingItemResponseSchema = z.object({
    id: z.string().uuid(),
    encounterId: z.string().uuid(),
    serviceId: z.string().uuid().nullable(),
    description: z.string(),
    qty: z.string(),
    unitPrice: z.string(),
    totalPrice: z.string(),
    status: z.enum(BILLING_ITEM_STATUS),
    service: z.object({
        id: z.string().uuid(),
        code: z.string(),
        name: z.string(),
        group: z.string()
    }).nullable().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
});
export const billingItemsListResponseSchema = z.object({
    items: z.array(billingItemResponseSchema),
    total: z.string(),
    itemCount: z.number()
});
export const encounterClosedResponseSchema = z.object({
    encounter: z.object({
        id: z.string().uuid(),
        status: z.enum(['open', 'closed']),
        closedAt: z.coerce.date().nullable(),
        closedByUserId: z.string().uuid().nullable()
    }),
    billingItems: z.array(billingItemResponseSchema),
    billingTotal: z.string()
});
//# sourceMappingURL=types.js.map