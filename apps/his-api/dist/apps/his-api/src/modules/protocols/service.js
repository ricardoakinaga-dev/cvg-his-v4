import { append } from '@cvg-his/audit';
import { createProtocolsRepo } from './repo.js';
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
function isDuplicateProtocolSlugError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const maybeDbError = error;
    return maybeDbError.code === '23505' && maybeDbError.constraint === 'uq_protocols_account_slug';
}
export function createProtocolsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createProtocolsRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            let protocol;
            try {
                protocol = await repo.create({
                    accountId: actor.accountId,
                    createdByUserId: actor.userId,
                    ...input
                });
            }
            catch (error) {
                if (isDuplicateProtocolSlugError(error)) {
                    return { kind: 'slug_conflict' };
                }
                throw error;
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolCreated',
                entityType: 'protocol',
                entityId: protocol.id,
                beforeJson: null,
                afterJson: protocol,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                protocol
            };
        },
        async getById(protocolId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, protocolId);
        },
        async update(protocolId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, protocolId);
            if (!before) {
                return { kind: 'protocol_not_found' };
            }
            let after;
            try {
                after = await repo.updateById({
                    accountId: actor.accountId,
                    protocolId,
                    patch,
                    updatedByUserId: actor.userId
                });
            }
            catch (error) {
                if (isDuplicateProtocolSlugError(error)) {
                    return { kind: 'slug_conflict' };
                }
                throw error;
            }
            if (!after) {
                return { kind: 'protocol_not_found' };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolUpdated',
                entityType: 'protocol',
                entityId: protocolId,
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'updated',
                protocol: after
            };
        },
        async list(query) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                q: query.q,
                status: query.status,
                specialty: query.specialty,
                domain: query.domain,
                page: query.page,
                pageSize: query.pageSize
            });
        }
    };
}
//# sourceMappingURL=service.js.map