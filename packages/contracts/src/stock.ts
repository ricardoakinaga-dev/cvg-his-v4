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
// Enums
// =====================

export const stockMovementTypeSchema = z.enum([
  'purchase',
  'sale',
  'adjustment_in',
  'adjustment_out',
  'transfer',
  'return',
  'loss',
  'initial'
]);

export const stockLotStatusSchema = z.enum([
  'active',
  'expired',
  'recalled',
  'depleted'
]);

// =====================
// Stock Items
// =====================

export const stockItemResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  productId: uuidSchema,
  productName: z.string().optional(),
  productCode: z.string().nullable().optional(),
  quantity: z.number().int(),
  minQuantity: z.number().int(),
  maxQuantity: z.number().int().nullable().optional(),
  location: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listStockItemsQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(z.object({
  active: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(), // Filtrar itens com quantity < min_quantity
  productId: uuidSchema.optional()
}));

export const updateStockItemBodySchema = z.object({
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().min(0).nullable().optional(),
  location: z.string().transform(trim).pipe(z.string().max(100)).optional().nullable(),
  active: z.boolean().optional()
}).refine(v => Object.values(v).some(x => x !== undefined), 'At least one field required');

export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type StockLotStatus = z.infer<typeof stockLotStatusSchema>;
export type StockItemResponse = z.infer<typeof stockItemResponseSchema>;
export type ListStockItemsQuery = z.infer<typeof listStockItemsQuerySchema>;
export type UpdateStockItemBody = z.infer<typeof updateStockItemBodySchema>;

// =====================
// Stock Lots
// =====================

export const createStockLotBodySchema = z.object({
  productId: uuidSchema,
  lotNumber: z.string().transform(trim).pipe(z.string().min(1).max(100)),
  quantity: z.number().int().min(1),
  manufactureDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  supplier: z.string().transform(trim).pipe(z.string().max(200)).optional().nullable(),
  unitCost: z.number().min(0).optional()
});

export const updateStockLotBodySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  status: stockLotStatusSchema.optional(),
  supplier: z.string().transform(trim).pipe(z.string().max(200)).optional().nullable()
}).refine(v => Object.values(v).some(x => x !== undefined), 'At least one field required');

export const stockLotResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  productId: uuidSchema,
  productName: z.string().optional(),
  lotNumber: z.string(),
  quantity: z.number().int(),
  manufactureDate: z.coerce.date().nullable().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  supplier: z.string().nullable().optional(),
  status: stockLotStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listStockLotsQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(z.object({
  productId: uuidSchema.optional(),
  status: stockLotStatusSchema.optional(),
  expiringBefore: z.coerce.date().optional(), // Lotes que vencem antes desta data
  supplier: z.string().optional()
}));

export type CreateStockLotBody = z.infer<typeof createStockLotBodySchema>;
export type UpdateStockLotBody = z.infer<typeof updateStockLotBodySchema>;
export type StockLotResponse = z.infer<typeof stockLotResponseSchema>;
export type ListStockLotsQuery = z.infer<typeof listStockLotsQuerySchema>;

// =====================
// Stock Movements
// =====================

export const createStockMovementBodySchema = z.object({
  productId: uuidSchema,
  lotId: uuidSchema.optional().nullable(),
  movementType: stockMovementTypeSchema,
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0).optional().nullable(),
  reference: z.string().transform(trim).pipe(z.string().max(200)).optional().nullable(),
  notes: z.string().transform(trim).pipe(z.string().max(1000)).optional().nullable()
});

export const stockMovementResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  productId: uuidSchema,
  productName: z.string().optional(),
  lotId: uuidSchema.nullable().optional(),
  lotNumber: z.string().nullable().optional(),
  movementType: stockMovementTypeSchema,
  quantity: z.number().int(),
  previousQuantity: z.number().int(),
  newQuantity: z.number().int(),
  unitCost: z.number().nullable().optional(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: uuidSchema.nullable().optional(),
  createdAt: z.coerce.date()
});

export const listStockMovementsQuerySchema = paginationQuerySchema.merge(z.object({
  productId: uuidSchema.optional(),
  lotId: uuidSchema.optional(),
  movementType: stockMovementTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

export type CreateStockMovementBody = z.infer<typeof createStockMovementBodySchema>;
export type StockMovementResponse = z.infer<typeof stockMovementResponseSchema>;
export type ListStockMovementsQuery = z.infer<typeof listStockMovementsQuerySchema>;

// =====================
// Reports
// =====================

export const stockSummaryResponseSchema = z.object({
  totalProducts: z.number().int(),
  totalItemsInStock: z.number().int(),
  lowStockItems: z.number().int(),
  expiringLots: z.number().int(),
  totalValue: z.number()
});

export type StockSummaryResponse = z.infer<typeof stockSummaryResponseSchema>;

// Stock Item ID param
export const stockItemIdParamSchema = z.object({ id: uuidSchema });

