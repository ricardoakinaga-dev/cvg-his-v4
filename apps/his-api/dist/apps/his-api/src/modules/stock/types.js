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
//# sourceMappingURL=types.js.map