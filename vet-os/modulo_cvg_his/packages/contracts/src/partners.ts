import { z } from 'zod';

// =====================
// Enums
// =====================

export const PartnerTypeSchema = z.enum(['pet_shop', 'clinic', 'other']);
export type PartnerType = z.infer<typeof PartnerTypeSchema>;

// =====================
// Partner Schema
// =====================

export const PartnerCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  type: PartnerTypeSchema.default('pet_shop'),
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const PartnerUpdateSchema = PartnerCreateSchema.partial();

export const PartnerReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  name: z.string(),
  type: PartnerTypeSchema,
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  discountPercent: z.number(),
  active: z.boolean(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdByUserId: z.string().uuid().nullable().optional()
});

// =====================
// Partner Patient Schema
// =====================

export const PartnerPatientCreateSchema = z.object({
  patientId: z.string().uuid(),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const PartnerPatientReadSchema = z.object({
  id: z.string().uuid(),
  partnerId: z.string().uuid(),
  patientId: z.string().uuid(),
  accountId: z.string().uuid(),
  discountPercent: z.number(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdByUserId: z.string().uuid().nullable().optional()
});

// =====================
// Types
// =====================

export type PartnerCreateDto = z.infer<typeof PartnerCreateSchema>;
export type PartnerUpdateDto = z.infer<typeof PartnerUpdateSchema>;
export type PartnerReadDto = z.infer<typeof PartnerReadSchema>;

export type PartnerPatientCreateDto = z.infer<typeof PartnerPatientCreateSchema>;
export type PartnerPatientReadDto = z.infer<typeof PartnerPatientReadSchema>;

// =====================
// Query Params
// =====================

export const PartnersQuerySchema = z.object({
  type: PartnerTypeSchema.optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type PartnersQueryDto = z.infer<typeof PartnersQuerySchema>;
