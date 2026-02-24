import { append } from '@cvg-his/audit';
import { createProductsRepo } from './repo.js';
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
function isDuplicateSkuError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeDbError = error;
    return maybeDbError.code === '23505' && maybeDbError.constraint === 'products_account_sku_unique';
}
export function createProductsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createProductsRepo(context.db);
    const appendAuditFn = dependencies.appendAudit ?? append;
    return {
        async list(params) {
            const actor = ensureAccountActor(context.requestContext);
            const { items, total } = await repo.list({
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
        async getById(productId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, productId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            let product;
            try {
                product = (await repo.create({
                    accountId: actor.accountId,
                    ...input
                }));
            }
            catch (error) {
                if (isDuplicateSkuError(error)) {
                    return { kind: 'sku_conflict' };
                }
                throw error;
            }
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProductCreated',
                entityType: 'product',
                entityId: product.id,
                beforeJson: null,
                afterJson: product,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                product
            };
        },
        async update(productId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, productId);
            if (!before) {
                return { kind: 'product_not_found' };
            }
            let after;
            try {
                after = (await repo.updateById({
                    accountId: actor.accountId,
                    productId,
                    patch
                }));
            }
            catch (error) {
                if (isDuplicateSkuError(error)) {
                    return { kind: 'sku_conflict' };
                }
                throw error;
            }
            if (!after) {
                return { kind: 'product_not_found' };
            }
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProductUpdated',
                entityType: 'product',
                entityId: after.id,
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'updated',
                product: after
            };
        },
        async delete(productId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, productId);
            if (!before) {
                return { kind: 'product_not_found' };
            }
            await repo.deleteById(actor.accountId, productId);
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProductDeleted',
                entityType: 'product',
                entityId: productId,
                beforeJson: before,
                afterJson: null,
                requestId: context.requestContext.requestId
            });
            return { kind: 'deleted' };
        }
    };
}
//# sourceMappingURL=service.js.map