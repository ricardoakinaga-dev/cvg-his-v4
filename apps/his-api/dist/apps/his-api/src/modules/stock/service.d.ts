import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type StockLotsRepo, type StockMovementsRepo } from './repo.js';
import type { StockLotCreateInput, StockLotUpdateInput, StockLotRecord, StockMovementCreateInput, StockMovementRecord, KardexEntry, ProductBalance } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    lotsRepo?: StockLotsRepo;
    movementsRepo?: StockMovementsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateStockLotResult = {
    kind: 'lot_conflict';
} | {
    kind: 'created';
    lot: StockLotRecord;
};
export type UpdateStockLotResult = {
    kind: 'lot_not_found';
} | {
    kind: 'lot_conflict';
} | {
    kind: 'updated';
    lot: StockLotRecord;
};
export type DeleteStockLotResult = {
    kind: 'lot_not_found';
} | {
    kind: 'deleted';
};
export type CreateStockMovementResult = {
    kind: 'insufficient_stock';
} | {
    kind: 'lot_not_found';
} | {
    kind: 'created';
    movement: StockMovementRecord;
};
export declare function createStockService(context: ServiceContext, dependencies?: ServiceDependencies): {
    listLots(params: {
        page: number;
        pageSize: number;
        productId?: string;
        lotNumber?: string;
        expiryWithinDays?: number;
        includeExpired?: boolean;
    }): Promise<{
        items: StockLotRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getLotById(lotId: string): Promise<StockLotRecord | null>;
    createLot(input: StockLotCreateInput): Promise<CreateStockLotResult>;
    updateLot(lotId: string, patch: StockLotUpdateInput): Promise<UpdateStockLotResult>;
    deleteLot(lotId: string): Promise<DeleteStockLotResult>;
    listMovements(params: {
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
        items: StockMovementRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    createMovement(input: StockMovementCreateInput): Promise<CreateStockMovementResult>;
    getKardex(params: {
        productId: string;
        startDate?: string;
        endDate?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        items: KardexEntry[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getProductBalance(productId: string): Promise<ProductBalance>;
};
export {};
//# sourceMappingURL=service.d.ts.map