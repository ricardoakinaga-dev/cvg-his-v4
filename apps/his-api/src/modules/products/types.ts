import { z } from 'zod';

// Product record type (from database)
export type ProductRecord = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  category: string | null;
  uom: string | null;
  cost: string;
  price: string;
  isControlled: boolean;
  trackLot: boolean;
  trackExpiry: boolean;
  minStock: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Zod schemas for validation
export const productIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().max(100).optional(),
  active: z.coerce.boolean().optional(),
  category: z.string().trim().max(100).optional()
});

export const productCreateSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).nullable().optional(),
  uom: z.string().trim().max(20).nullable().optional(),
  cost: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
  isControlled: z.boolean().default(false),
  trackLot: z.boolean().default(false),
  trackExpiry: z.boolean().default(false),
  minStock: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true)
});

export const productUpdateSchema = z.object({
  sku: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  uom: z.string().trim().max(20).nullable().optional(),
  cost: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  isControlled: z.boolean().optional(),
  trackLot: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  minStock: z.coerce.number().min(0).optional(),
  active: z.boolean().optional()
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
