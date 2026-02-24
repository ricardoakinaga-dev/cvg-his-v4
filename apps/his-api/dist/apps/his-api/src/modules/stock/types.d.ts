import { z } from 'zod';
export declare const stockLotCreateSchema: z.ZodObject<{
    productId: z.ZodString;
    lotNumber: z.ZodString;
    expiryDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cost: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    supplier: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    lotNumber: string;
    quantity: number;
    notes?: string | null | undefined;
    location?: string | null | undefined;
    expiryDate?: string | null | undefined;
    cost?: number | null | undefined;
    supplier?: string | null | undefined;
}, {
    productId: string;
    lotNumber: string;
    notes?: string | null | undefined;
    location?: string | null | undefined;
    expiryDate?: string | null | undefined;
    cost?: number | null | undefined;
    quantity?: number | undefined;
    supplier?: string | null | undefined;
}>;
export declare const stockLotUpdateSchema: z.ZodObject<{
    lotNumber: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodOptional<z.ZodNumber>;
    cost: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    supplier: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    active: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    active?: number | undefined;
    location?: string | null | undefined;
    expiryDate?: string | null | undefined;
    cost?: number | null | undefined;
    lotNumber?: string | undefined;
    quantity?: number | undefined;
    supplier?: string | null | undefined;
}, {
    notes?: string | null | undefined;
    active?: number | undefined;
    location?: string | null | undefined;
    expiryDate?: string | null | undefined;
    cost?: number | null | undefined;
    lotNumber?: string | undefined;
    quantity?: number | undefined;
    supplier?: string | null | undefined;
}>;
export declare const stockLotIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listStockLotsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    productId: z.ZodOptional<z.ZodString>;
    lotNumber: z.ZodOptional<z.ZodString>;
    expiryWithinDays: z.ZodOptional<z.ZodNumber>;
    includeExpired: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    includeExpired: boolean;
    productId?: string | undefined;
    lotNumber?: string | undefined;
    expiryWithinDays?: number | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    productId?: string | undefined;
    lotNumber?: string | undefined;
    expiryWithinDays?: number | undefined;
    includeExpired?: boolean | undefined;
}>;
export declare const movementTypeEnum: z.ZodEnum<["entrada", "saida", "ajuste", "consumo", "devolucao", "transferencia"]>;
export declare const stockMovementCreateSchema: z.ZodObject<{
    productId: z.ZodString;
    lotId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    movementType: z.ZodEnum<["entrada", "saida", "ajuste", "consumo", "devolucao", "transferencia"]>;
    quantity: z.ZodNumber;
    unitCost: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    encounterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    inpatientStayId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentRef: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    movementType: "entrada" | "saida" | "ajuste" | "consumo" | "devolucao" | "transferencia";
    notes?: string | null | undefined;
    encounterId?: string | null | undefined;
    reason?: string | null | undefined;
    lotId?: string | null | undefined;
    unitCost?: number | null | undefined;
    inpatientStayId?: string | null | undefined;
    documentRef?: string | null | undefined;
}, {
    productId: string;
    quantity: number;
    movementType: "entrada" | "saida" | "ajuste" | "consumo" | "devolucao" | "transferencia";
    notes?: string | null | undefined;
    encounterId?: string | null | undefined;
    reason?: string | null | undefined;
    lotId?: string | null | undefined;
    unitCost?: number | null | undefined;
    inpatientStayId?: string | null | undefined;
    documentRef?: string | null | undefined;
}>;
export declare const listStockMovementsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    productId: z.ZodOptional<z.ZodString>;
    lotId: z.ZodOptional<z.ZodString>;
    movementType: z.ZodOptional<z.ZodEnum<["entrada", "saida", "ajuste", "consumo", "devolucao", "transferencia"]>>;
    encounterId: z.ZodOptional<z.ZodString>;
    inpatientStayId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    encounterId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    productId?: string | undefined;
    lotId?: string | undefined;
    movementType?: "entrada" | "saida" | "ajuste" | "consumo" | "devolucao" | "transferencia" | undefined;
    inpatientStayId?: string | undefined;
}, {
    encounterId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    productId?: string | undefined;
    lotId?: string | undefined;
    movementType?: "entrada" | "saida" | "ajuste" | "consumo" | "devolucao" | "transferencia" | undefined;
    inpatientStayId?: string | undefined;
}>;
export declare const kardexQuerySchema: z.ZodObject<{
    productId: z.ZodString;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    productId: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    productId: string;
    page?: number | undefined;
    pageSize?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map