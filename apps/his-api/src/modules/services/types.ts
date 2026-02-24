import { z } from 'zod';

// Service record type (from database)
export type ServiceRecord = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  group: string;
  sector: string;
  basePrice: string;
  durationMinutes: number | null;
  requiresReport: boolean;
  consumesStock: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Valid groups and sectors
export const SERVICE_GROUPS = ['consulta', 'procedimento', 'internacao', 'lab', 'imagem', 'outros'] as const;
export const SERVICE_SECTORS = ['clinica', 'internacao', 'laboratorio', 'imagem', 'financeiro'] as const;

// Zod schemas for validation
export const serviceIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().max(100).optional(),
  group: z.enum(SERVICE_GROUPS).optional(),
  sector: z.enum(SERVICE_SECTORS).optional(),
  active: z.coerce.boolean().optional()
});

export const serviceCreateSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  group: z.enum(SERVICE_GROUPS),
  sector: z.enum(SERVICE_SECTORS),
  basePrice: z.coerce.number().min(0).default(0),
  durationMinutes: z.coerce.number().int().min(1).nullable().optional(),
  requiresReport: z.boolean().default(false),
  consumesStock: z.boolean().default(false),
  active: z.boolean().default(true)
});

export const serviceUpdateSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  group: z.enum(SERVICE_GROUPS).optional(),
  sector: z.enum(SERVICE_SECTORS).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  durationMinutes: z.coerce.number().int().min(1).nullable().optional(),
  requiresReport: z.boolean().optional(),
  consumesStock: z.boolean().optional(),
  active: z.boolean().optional()
});

export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
