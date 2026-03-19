import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createStockItemsRepo, createStockLotsRepo, createStockMovementsRepo } from './repo.js';
import type {
  CreateStockMovementBody,
  CreateStockLotBody,
  ListStockItemsQuery,
  ListStockLotsQuery,
  ListStockMovementsQuery,
  UpdateStockItemBody
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;
type StockContext = { db: DbClient; requestContext: RequestContext };

function ensureActor(context: RequestContext) {
  const actor = context.actor;
  if (!actor?.accountId) throw new Error('Actor context is required.');
  return actor;
}

// =====================
// Stock Items Service
// =====================

type StockItemsDeps = {
  repo?: ReturnType<typeof createStockItemsRepo>;
  appendAudit?: typeof append;
};

export function createStockItemsService(ctx: StockContext, deps: StockItemsDeps = {}) {
  const repo = deps.repo ?? createStockItemsRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async getById(id: string) {
      const actor = ensureActor(ctx.requestContext);
      return repo.findById(actor.accountId, id);
    },

    async list(query: ListStockItemsQuery) {
      const actor = ensureActor(ctx.requestContext);
      return repo.list(actor.accountId, {
        page: query.page,
        pageSize: query.pageSize,
        active: query.active,
        lowStock: query.lowStock,
        productId: query.productId
      });
    },

    async update(id: string, patch: UpdateStockItemBody) {
      const actor = ensureActor(ctx.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return null;

      const after = await repo.update(actor.accountId, id, patch);
      if (!after) return null;

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'stockItem',
        entityId: id,
        action: 'stockItem.update',
        beforeJson: before,
        afterJson: after,
        requestId: ctx.requestContext.requestId
      });

      return after;
    },

    async getSummary() {
      const actor = ensureActor(ctx.requestContext);
      const list = await repo.list(actor.accountId, { pageSize: 10000, active: true });

      const totalProducts = list.total;
      const totalItemsInStock = list.data.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
      const lowStockItems = list.data.filter(item => item.quantity < item.minQuantity).length;

      // Get expiring lots count
      const lotsRepo = createStockLotsRepo(ctx.db);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringLots = await lotsRepo.list(actor.accountId, {
        expiringBefore: thirtyDaysFromNow,
        status: 'active',
        pageSize: 10000
      });

      return {
        totalProducts,
        totalItemsInStock,
        lowStockItems,
        expiringLots: expiringLots.total,
        totalValue: 0 // TODO: Calculate from movements
      };
    }
  };
}

// =====================
// Stock Lots Service
// =====================

type StockLotsDeps = {
  lotsRepo?: ReturnType<typeof createStockLotsRepo>;
  itemsRepo?: ReturnType<typeof createStockItemsRepo>;
  movementsRepo?: ReturnType<typeof createStockMovementsRepo>;
  appendAudit?: typeof append;
};

export function createStockLotsService(ctx: StockContext, deps: StockLotsDeps = {}) {
  const lotsRepo = deps.lotsRepo ?? createStockLotsRepo(ctx.db);
  const itemsRepo = deps.itemsRepo ?? createStockItemsRepo(ctx.db);
  const movementsRepo = deps.movementsRepo ?? createStockMovementsRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async getById(id: string) {
      const actor = ensureActor(ctx.requestContext);
      return lotsRepo.findById(actor.accountId, id);
    },

    async list(query: ListStockLotsQuery) {
      const actor = ensureActor(ctx.requestContext);
      return lotsRepo.list(actor.accountId, {
        page: query.page,
        pageSize: query.pageSize,
        productId: query.productId,
        status: query.status,
        expiringBefore: query.expiringBefore ? new Date(query.expiringBefore) : undefined,
        supplier: query.supplier
      });
    },

    async create(input: CreateStockLotBody) {
      const actor = ensureActor(ctx.requestContext);

      // Ensure stock item exists
      await itemsRepo.ensureExists(actor.accountId, input.productId);

      // Get current quantity
      const stockItem = await itemsRepo.findByProductId(actor.accountId, input.productId);
      const previousQuantity = stockItem?.quantity ?? 0;

      // Create lot
      const lot = await lotsRepo.create({
        accountId: actor.accountId,
        productId: input.productId,
        lotNumber: input.lotNumber,
        quantity: input.quantity,
        manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : undefined,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        supplier: input.supplier ?? undefined,
        status: 'active'
      });

      // Update stock item quantity
      const newQuantity = previousQuantity + input.quantity;
      await itemsRepo.updateQuantity(actor.accountId, input.productId, newQuantity);

      // Record movement
      await movementsRepo.create({
        accountId: actor.accountId,
        productId: input.productId,
        lotId: lot.id,
        movementType: 'purchase',
        quantity: input.quantity,
        previousQuantity,
        newQuantity,
        unitCost: input.unitCost,
        reference: `Lote: ${input.lotNumber}`,
        createdByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'stockLot',
        entityId: lot.id,
        action: 'stockLot.create',
        beforeJson: null,
        afterJson: lot,
        requestId: ctx.requestContext.requestId
      });

      return lot;
    }
  };
}

// =====================
// Stock Movements Service
// =====================

type StockMovementsDeps = {
  itemsRepo?: ReturnType<typeof createStockItemsRepo>;
  lotsRepo?: ReturnType<typeof createStockLotsRepo>;
  movementsRepo?: ReturnType<typeof createStockMovementsRepo>;
  appendAudit?: typeof append;
};

export function createStockMovementsService(ctx: StockContext, deps: StockMovementsDeps = {}) {
  const itemsRepo = deps.itemsRepo ?? createStockItemsRepo(ctx.db);
  const lotsRepo = deps.lotsRepo ?? createStockLotsRepo(ctx.db);
  const movementsRepo = deps.movementsRepo ?? createStockMovementsRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async list(query: ListStockMovementsQuery) {
      const actor = ensureActor(ctx.requestContext);
      return movementsRepo.list(actor.accountId, {
        page: query.page,
        pageSize: query.pageSize,
        productId: query.productId,
        lotId: query.lotId,
        movementType: query.movementType,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined
      });
    },

    async create(input: CreateStockMovementBody) {
      const actor = ensureActor(ctx.requestContext);

      // Ensure stock item exists
      await itemsRepo.ensureExists(actor.accountId, input.productId);

      // Get current quantity
      const stockItem = await itemsRepo.findByProductId(actor.accountId, input.productId);
      const previousQuantity = stockItem?.quantity ?? 0;

      // Calculate new quantity based on movement type
      const isIncoming = ['purchase', 'adjustment_in', 'return', 'initial'].includes(input.movementType);
      const newQuantity = isIncoming
        ? previousQuantity + input.quantity
        : previousQuantity - input.quantity;

      if (newQuantity < 0) {
        const error = new Error('Insufficient stock for this movement.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      // Update stock item quantity
      await itemsRepo.updateQuantity(actor.accountId, input.productId, newQuantity);

      // Update lot quantity if specified
      if (input.lotId) {
        const lot = await lotsRepo.findById(actor.accountId, input.lotId);
        if (lot) {
          const newLotQty = isIncoming ? lot.quantity + input.quantity : lot.quantity - input.quantity;
          await lotsRepo.updateQuantity(actor.accountId, input.lotId, Math.max(0, newLotQty));
        }
      }

      // Record movement
      const movement = await movementsRepo.create({
        accountId: actor.accountId,
        productId: input.productId,
        lotId: input.lotId ?? undefined,
        movementType: input.movementType,
        quantity: input.quantity,
        previousQuantity,
        newQuantity,
        unitCost: input.unitCost ?? undefined,
        reference: input.reference ?? undefined,
        notes: input.notes ?? undefined,
        createdByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'stockMovement',
        entityId: movement.id,
        action: 'stockMovement.create',
        beforeJson: { previousQuantity },
        afterJson: { newQuantity, type: input.movementType, qty: input.quantity },
        requestId: ctx.requestContext.requestId
      });

      return movement;
    }
  };
}
