import { stockLots, stockMovements } from '@cvg-his/db';
import type { StockLotCreateInput, StockLotUpdateInput, StockMovementCreateInput } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export type StockLotsRepo = {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        productId?: string;
        lotNumber?: string;
        expiryWithinDays?: number;
        includeExpired?: boolean;
    }): Promise<{
        items: StockLotWithProduct[];
        total: number;
    }>;
    findById(accountId: string, lotId: string): Promise<StockLotWithProduct | null>;
    findByProductAndLot(accountId: string, productId: string, lotNumber: string): Promise<StockLotWithProduct | null>;
    create(input: {
        accountId: string;
        performedByUserId: string;
    } & StockLotCreateInput): Promise<StockLotWithProduct>;
    updateById(params: {
        accountId: string;
        lotId: string;
        patch: StockLotUpdateInput;
    }): Promise<StockLotWithProduct | null>;
    deleteById(accountId: string, lotId: string): Promise<boolean>;
    getProductBalance(accountId: string, productId: string): Promise<{
        totalQuantity: string;
        totalActive: string;
    }>;
};
export type StockMovementsRepo = {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        productId?: string;
        lotId?: string;
        movementType?: string;
        encounterId?: string;
        inpatientStayId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        items: StockMovementWithDetails[];
        total: number;
    }>;
    create(input: {
        accountId: string;
        performedByUserId: string;
        balanceAfter: string;
        lotBalanceAfter?: string;
    } & StockMovementCreateInput): Promise<StockMovementWithDetails>;
    getKardex(params: {
        accountId: string;
        productId: string;
        startDate?: string;
        endDate?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        items: KardexEntry[];
        total: number;
    }>;
};
type StockLotWithProduct = typeof stockLots.$inferSelect & {
    productName?: string;
    productSku?: string;
};
type StockMovementWithDetails = typeof stockMovements.$inferSelect & {
    productName?: string;
    productSku?: string;
    lotNumber?: string;
    performedByName?: string;
};
type KardexEntry = {
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
export declare function createStockLotsRepo(db: DbClient): StockLotsRepo;
export declare function createStockMovementsRepo(db: DbClient): StockMovementsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map