import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createStockLotsRepo, createStockMovementsRepo, type StockLotsRepo, type StockMovementsRepo } from './repo.js';
import type {
  StockLotCreateInput,
  StockLotUpdateInput,
  StockLotRecord,
  StockMovementCreateInput,
  StockMovementRecord,
  KardexEntry,
  ProductBalance,
  LotBalance
} from './types.js';

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

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context in token.');
  }

  return actor as WriteActor;
}

type MaybeDbError = {
  code?: string;
  constraint?: string;
};

function isDuplicateLotError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeDbError = error as MaybeDbError;
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'stock_lots_account_product_lot_unique';
}

export type CreateStockLotResult =
  | { kind: 'lot_conflict' }
  | { kind: 'created'; lot: StockLotRecord };

export type UpdateStockLotResult =
  | { kind: 'lot_not_found' }
  | { kind: 'lot_conflict' }
  | { kind: 'updated'; lot: StockLotRecord };

export type DeleteStockLotResult =
  | { kind: 'lot_not_found' }
  | { kind: 'deleted' };

export type CreateStockMovementResult =
  | { kind: 'insufficient_stock' }
  | { kind: 'lot_not_found' }
  | { kind: 'created'; movement: StockMovementRecord };

export function createStockService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const lotsRepo = dependencies.lotsRepo ?? createStockLotsRepo(context.db);
  const movementsRepo = dependencies.movementsRepo ?? createStockMovementsRepo(context.db);
  const appendAuditFn = dependencies.appendAudit ?? append;

  return {
    // Stock Lots
    async listLots(params: {
      page: number;
      pageSize: number;
      productId?: string;
      lotNumber?: string;
      expiryWithinDays?: number;
      includeExpired?: boolean;
    }): Promise<{ items: StockLotRecord[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await lotsRepo.list({
        accountId: actor.accountId,
        ...params
      });

      return {
        items: items as StockLotRecord[],
        total,
        page: params.page,
        pageSize: params.pageSize
      };
    },

    async getLotById(lotId: string): Promise<StockLotRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return lotsRepo.findById(actor.accountId, lotId) as Promise<StockLotRecord | null>;
    },

    async createLot(input: StockLotCreateInput): Promise<CreateStockLotResult> {
      const actor = ensureWriteActor(context.requestContext);
      let lot: StockLotRecord;

      try {
        lot = (await lotsRepo.create({
          accountId: actor.accountId,
          performedByUserId: actor.userId,
          ...input
        })) as StockLotRecord;
      } catch (error) {
        if (isDuplicateLotError(error)) {
          return { kind: 'lot_conflict' };
        }
        throw error;
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'StockLotCreated',
        entityType: 'stock_lot',
        entityId: lot.id,
        beforeJson: null,
        afterJson: lot,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        lot
      };
    },

    async updateLot(
      lotId: string,
      patch: StockLotUpdateInput
    ): Promise<UpdateStockLotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await lotsRepo.findById(actor.accountId, lotId);

      if (!before) {
        return { kind: 'lot_not_found' };
      }

      let after: StockLotRecord | null;
      try {
        after = (await lotsRepo.updateById({
          accountId: actor.accountId,
          lotId,
          patch
        })) as StockLotRecord | null;
      } catch (error) {
        if (isDuplicateLotError(error)) {
          return { kind: 'lot_conflict' };
        }
        throw error;
      }

      if (!after) {
        return { kind: 'lot_not_found' };
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'StockLotUpdated',
        entityType: 'stock_lot',
        entityId: after.id,
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        lot: after
      };
    },

    async deleteLot(lotId: string): Promise<DeleteStockLotResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await lotsRepo.findById(actor.accountId, lotId);

      if (!before) {
        return { kind: 'lot_not_found' };
      }

      await lotsRepo.deleteById(actor.accountId, lotId);

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'StockLotDeleted',
        entityType: 'stock_lot',
        entityId: lotId,
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });

      return { kind: 'deleted' };
    },

    // Stock Movements
    async listMovements(params: {
      page: number;
      pageSize: number;
      productId?: string;
      lotId?: string;
      movementType?: string;
      encounterId?: string;
      inpatientStayId?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<{ items: StockMovementRecord[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await movementsRepo.list({
        accountId: actor.accountId,
        ...params
      });

      return {
        items: items as StockMovementRecord[],
        total,
        page: params.page,
        pageSize: params.pageSize
      };
    },

    async createMovement(input: StockMovementCreateInput): Promise<CreateStockMovementResult> {
      const actor = ensureWriteActor(context.requestContext);

      // Get current product balance
      const balance = await lotsRepo.getProductBalance(actor.accountId, input.productId);
      const currentBalance = Number(balance.totalQuantity);

      // Calculate new balance
      const quantity = input.quantity;
      let newBalance: number;
      let lotNewBalance: string | undefined;

      // Validate for output movements
      if (['saida', 'consumo', 'devolucao'].includes(input.movementType)) {
        if (currentBalance < quantity) {
          return { kind: 'insufficient_stock' };
        }
        newBalance = currentBalance - quantity;
      } else {
        newBalance = currentBalance + quantity;
      }

      // Handle lot-specific logic
      if (input.lotId) {
        const lot = await lotsRepo.findById(actor.accountId, input.lotId);
        if (!lot) {
          return { kind: 'lot_not_found' };
        }

        const currentLotBalance = Number(lot.quantity);
        if (['saida', 'consumo', 'devolucao'].includes(input.movementType)) {
          if (currentLotBalance < quantity) {
            return { kind: 'insufficient_stock' };
          }
          lotNewBalance = (currentLotBalance - quantity).toString();
        } else {
          lotNewBalance = (currentLotBalance + quantity).toString();
        }

        // Update lot quantity
        await lotsRepo.updateById({
          accountId: actor.accountId,
          lotId: input.lotId,
          patch: { quantity: Number(lotNewBalance), active: Number(lotNewBalance) }
        });
      }

      const movement = await movementsRepo.create({
        accountId: actor.accountId,
        performedByUserId: actor.userId,
        balanceAfter: newBalance.toString(),
        lotBalanceAfter: lotNewBalance,
        ...input
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'StockMovementCreated',
        entityType: 'stock_movement',
        entityId: movement.id,
        beforeJson: null,
        afterJson: movement,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        movement: movement as StockMovementRecord
      };
    },

    // Kardex (Product Movement History)
    async getKardex(params: {
      productId: string;
      startDate?: string;
      endDate?: string;
      page: number;
      pageSize: number;
    }): Promise<{ items: KardexEntry[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await movementsRepo.getKardex({
        accountId: actor.accountId,
        ...params
      });

      return {
        items,
        total,
        page: params.page,
        pageSize: params.pageSize
      };
    },

    // Product Balance with Lots
    async getProductBalance(productId: string): Promise<ProductBalance> {
      const actor = ensureAccountActor(context.requestContext);

      const { items } = await lotsRepo.list({
        accountId: actor.accountId,
        productId,
        page: 1,
        pageSize: 1000,
        includeExpired: true
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lots: LotBalance[] = items.map(lot => {
        const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
        let daysToExpiry: number | null = null;
        let isExpired = false;
        let isExpiringSoon = false;

        if (expiryDate) {
          expiryDate.setHours(0, 0, 0, 0);
          const diffTime = expiryDate.getTime() - today.getTime();
          daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isExpired = daysToExpiry < 0;
          isExpiringSoon = daysToExpiry >= 0 && daysToExpiry <= 30;
        }

        return {
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          quantity: lot.quantity,
          active: lot.active,
          cost: lot.cost,
          daysToExpiry,
          isExpired,
          isExpiringSoon
        };
      });

      const totalQuantity = items.reduce((sum, lot) => sum + Number(lot.quantity), 0).toString();
      const totalValue = items.reduce((sum, lot) => {
        const qty = Number(lot.quantity);
        const cost = lot.cost ? Number(lot.cost) : 0;
        return sum + (qty * cost);
      }, 0).toString();

      return {
        productId,
        productName: items[0]?.productName ?? '',
        productSku: items[0]?.productSku ?? '',
        totalQuantity,
        totalValue,
        lots
      };
    }
  };
}
