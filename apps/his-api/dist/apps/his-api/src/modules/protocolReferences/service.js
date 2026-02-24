import { append } from '@cvg-his/audit';
import { createProtocolReferencesRepo } from './repo.js';
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
export function createProtocolReferencesService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createProtocolReferencesRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    const suggestAdapter = dependencies.suggestAdapter ?? null;
    return {
        async list(protocolId) {
            const actor = ensureAccountActor(context.requestContext);
            const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);
            if (!protocolExists) {
                return { kind: 'protocol_not_found' };
            }
            const references = await repo.listByProtocol(actor.accountId, protocolId);
            return { kind: 'ok', references };
        },
        async add(protocolId, input) {
            const actor = ensureWriteActor(context.requestContext);
            const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);
            if (!protocolExists) {
                return { kind: 'protocol_not_found' };
            }
            const created = await repo.create({
                accountId: actor.accountId,
                protocolId,
                refType: input.refType,
                title: input.title,
                url: input.url,
                sourceId: input.sourceId,
                score: input.score,
                metadataJson: input.metadataJson,
                createdByUserId: actor.userId
            });
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolReferenceAdded',
                entityType: 'protocol_reference',
                entityId: created.id,
                beforeJson: null,
                afterJson: created,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                reference: created
            };
        },
        async remove(protocolId, refId) {
            const actor = ensureWriteActor(context.requestContext);
            const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);
            if (!protocolExists) {
                return { kind: 'protocol_not_found' };
            }
            const before = await repo.findById(actor.accountId, protocolId, refId);
            if (!before) {
                return { kind: 'reference_not_found' };
            }
            const removed = await repo.deleteById(actor.accountId, protocolId, refId);
            if (!removed) {
                return { kind: 'reference_not_found' };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolReferenceRemoved',
                entityType: 'protocol_reference',
                entityId: refId,
                beforeJson: before,
                afterJson: null,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'removed',
                reference: removed
            };
        },
        async suggest(protocolId, query) {
            const actor = ensureAccountActor(context.requestContext);
            const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);
            if (!protocolExists) {
                return { kind: 'protocol_not_found' };
            }
            if (!suggestAdapter) {
                return {
                    kind: 'qdrant_unavailable',
                    message: 'QDRANT_URL is not configured. Suggestions are unavailable.'
                };
            }
            try {
                const hits = await suggestAdapter.suggest({
                    q: query.q,
                    limit: query.limit
                });
                return {
                    kind: 'ok',
                    hits
                };
            }
            catch (error) {
                return {
                    kind: 'qdrant_unavailable',
                    message: `Failed to query Qdrant: ${error instanceof Error ? error.message : 'unknown error'}`
                };
            }
        }
    };
}
//# sourceMappingURL=service.js.map