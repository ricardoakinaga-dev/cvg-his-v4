import { append } from '@cvg-his/audit';
import { createServicesRepo } from './repo.js';
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
function isDuplicateCodeError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeDbError = error;
    return maybeDbError.code === '23505' && maybeDbError.constraint === 'services_account_code_unique';
}
export function createServicesService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createServicesRepo(context.db);
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
        async getById(serviceId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, serviceId);
        },
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            let service;
            try {
                service = (await repo.create({
                    accountId: actor.accountId,
                    ...input
                }));
            }
            catch (error) {
                if (isDuplicateCodeError(error)) {
                    return { kind: 'code_conflict' };
                }
                throw error;
            }
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ServiceCreated',
                entityType: 'service',
                entityId: service.id,
                beforeJson: null,
                afterJson: service,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                service
            };
        },
        async update(serviceId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, serviceId);
            if (!before) {
                return { kind: 'service_not_found' };
            }
            let after;
            try {
                after = (await repo.updateById({
                    accountId: actor.accountId,
                    serviceId,
                    patch
                }));
            }
            catch (error) {
                if (isDuplicateCodeError(error)) {
                    return { kind: 'code_conflict' };
                }
                throw error;
            }
            if (!after) {
                return { kind: 'service_not_found' };
            }
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ServiceUpdated',
                entityType: 'service',
                entityId: after.id,
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'updated',
                service: after
            };
        },
        async delete(serviceId) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, serviceId);
            if (!before) {
                return { kind: 'service_not_found' };
            }
            await repo.deleteById(actor.accountId, serviceId);
            await appendAuditFn({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ServiceDeleted',
                entityType: 'service',
                entityId: serviceId,
                beforeJson: before,
                afterJson: null,
                requestId: context.requestContext.requestId
            });
            return { kind: 'deleted' };
        }
    };
}
//# sourceMappingURL=service.js.map