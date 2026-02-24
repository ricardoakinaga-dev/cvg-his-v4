import { z } from 'zod';

// Billing item status enum
export const BILLING_ITEM_STATUS = ['draft', 'confirmed', 'cancelled'] as const;
export type BillingItemStatus = (typeof BILLING_ITEM_STATUS)[number];

// Billing item record type (from database)
export type BillingItemRecord = {
  id: string;
  accountId: string;
  encounterId: string;
  serviceId: string | null;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  status: BillingItemStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Billing item with service info (for list responses)
export type BillingItemWithService = BillingItemRecord & {
  service?: {
    id: string;
    code: string;
    name: string;
    group: string;
  } | null;
};

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

export type BillingItemCreateInput = z.infer<typeof billingItemCreateSchema>;
export type BillingItemUpdateInput = z.infer<typeof billingItemUpdateSchema>;
export type CloseEncounterWithBillingInput = z.infer<typeof closeEncounterWithBillingSchema>;

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
