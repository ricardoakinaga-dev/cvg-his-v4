import { z } from 'zod';

// Stock Lot Types
export const stockLotCreateSchema = z.object({
  productId: z.string().uuid(),
  lotNumber: z.string().min(1).max(100),
  expiryDate: z.string().optional().nullable(),
  quantity: z.number().positive().optional().default(0),
  cost: z.number().positive().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  supplier: z.string().max(200).optional().nullable(),
  notes: z.string().optional().nullable()
});

export const stockLotUpdateSchema = z.object({
  lotNumber: z.string().min(1).max(100).optional(),
  expiryDate: z.string().optional().nullable(),
  quantity: z.number().optional(),
  cost: z.number().positive().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  supplier: z.string().max(200).optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.number().optional()
});

export const stockLotIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listStockLotsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().uuid().optional(),
  lotNumber: z.string().optional(),
  expiryWithinDays: z.coerce.number().int().positive().optional(),
  includeExpired: z.coerce.boolean().optional().default(false)
});

// Stock Movement Types
export const movementTypeEnum = z.enum(['entrada', 'saida', 'ajuste', 'consumo', 'devolucao', 'transferencia']);

export const stockMovementCreateSchema = z.object({
  productId: z.string().uuid(),
  lotId: z.string().uuid().optional().nullable(),
  movementType: movementTypeEnum,
  quantity: z.number().positive(),
  unitCost: z.number().positive().optional().nullable(),
  encounterId: z.string().uuid().optional().nullable(),
  inpatientStayId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  documentRef: z.string().max(100).optional().nullable()
});

export const listStockMovementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().uuid().optional(),
  lotId: z.string().uuid().optional(),
  movementType: movementTypeEnum.optional(),
  encounterId: z.string().uuid().optional(),
  inpatientStayId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const kardexQuerySchema = z.object({
  productId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});

// Inferred Types
export type StockLotCreateInput = z.infer<typeof stockLotCreateSchema>;
export type StockLotUpdateInput = z.infer<typeof stockLotUpdateSchema>;
export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>;

export type StockLotRecord = {
  id: string;
  accountId: string;
  productId: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: string;
  cost: string | null;
  location: string | null;
  supplier: string | null;
  notes: string | null;
  active: string;
  createdAt: Date;
  updatedAt: Date;
  productName?: string;
  productSku?: string;
};

export type StockMovementRecord = {
  id: string;
  accountId: string;
  productId: string;
  lotId: string | null;
  movementType: string;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  balanceAfter: string | null;
  lotBalanceAfter: string | null;
  encounterId: string | null;
  inpatientStayId: string | null;
  performedByUserId: string;
  reason: string | null;
  notes: string | null;
  documentRef: string | null;
  createdAt: Date;
  productName?: string;
  productSku?: string;
  lotNumber?: string;
  performedByName?: string;
};

export type KardexEntry = {
  id: string;
  createdAt: Date;
  movementType: string;
  lotNumber: string | null;
  quantity: string;
  balanceAfter: string | null;
  unitCost: string | null;
  totalCost: string | null;
  reason: string | null;
  documentRef: string | null;
  performedByName: string | null;
};

export type ProductBalance = {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: string;
  totalValue: string;
  lots: LotBalance[];
};

export type LotBalance = {
  lotId: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: string;
  active: string;
  cost: string | null;
  daysToExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
};
