import { append } from '@cvg-his/audit';
import { createStockLotsRepo, createStockMovementsRepo } from './repo.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function ensureAccountActor(requestContext) {
    const actor = requestContext.actor;
    if (!actor?.accountId) {
        throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
    }
    return actor;
}
function ensureWriteActor(requestContext) {
    const actor = ensureAccountActor(requestContext);
    if (!actor.userId) {
        throw unauthorizedError('Missing actor user context in token.');
    }
    return actor;
}
function isDuplicateLotError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeDbError = error;
    return maybeDbError.code === '23505' && maybeDbError.constraint === 'stock_lots_account_product_lot_unique';
}
export function createStockService(context, dependencies = {}) {
    const lotsRepo = dependencies.lotsRepo ?? createStockLotsRepo(context.db);
    const movementsRepo = dependencies.movementsRepo ?? createStockMovementsRepo(context.db);
    const appendAuditFn = dependencies.appendAudit ?? append;
    return {
        // Stock Lots
        async listLots(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await lotsRepo.list({
                accountId: actor.accountId,
                ...params
            });
            return {
                items: items,
                total,
                page: params.page,
                pageSize: params.pageSize
            };
        },
        async getLotById(lotId) {
            const actor = ensureAccountActor(context.requestContext);
            return lotsRepo.findById(actor.accountId, lotId);
        },
        async createLot(input) {
            const actor = ensureWriteActor(context.requestContext);
            let lot;
            try {
                lot = (await lotsRepo.create({
                    accountId: actor.accountId,
                    performedByUserId: actor.userId,
                    ...input
                }));
            }
            catch (error) {
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
        async updateLot(lotId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await lotsRepo.findById(actor.accountId, lotId);
            if (!before) {
                return { kind: 'lot_not_found' };
            }
            let after;
            try {
                after = (await lotsRepo.updateById({
                    accountId: actor.accountId,
                    lotId,
                    patch
                }));
            }
            catch (error) {
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
        async deleteLot(lotId) {
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
        async listMovements(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await movementsRepo.list({
                accountId: actor.accountId,
                ...params
            });
            return {
                items: items,
                total,
                page: params.page,
                pageSize: params.pageSize
            };
        },
        async createMovement(input) {
            const actor = ensureWriteActor(context.requestContext);
            // Get current product balance
            const balance = await lotsRepo.getProductBalance(actor.accountId, input.productId);
            const currentBalance = Number(balance.totalQuantity);
            // Calculate new balance
            const quantity = input.quantity;
            let newBalance;
            let lotNewBalance;
            // Validate for output movements
            if (['saida', 'consumo', 'devolucao'].includes(input.movementType)) {
                if (currentBalance < quantity) {
                    return { kind: 'insufficient_stock' };
                }
                newBalance = currentBalance - quantity;
            }
            else {
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
                }
                else {
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
                movement: movement
            };
        },
        // Kardex (Product Movement History)
        async getKardex(params) {
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
        async getProductBalance(productId) {
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
            const lots = items.map(lot => {
                const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
                let daysToExpiry = null;
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
//# sourceMappingURL=service.js.map