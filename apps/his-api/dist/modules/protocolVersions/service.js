import { append } from '@cvg-his/audit';
import { createProtocolVersionsRepo } from './repo.js';
import { hasChangeReason, hasCriticalProtocolContentChange, isDraftVersion } from './rules.js';
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
export function createProtocolVersionsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createProtocolVersionsRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async createDraft(protocolId) {
            const actor = ensureWriteActor(context.requestContext);
            const protocol = await repo.findProtocolInAccount(actor.accountId, protocolId);
            if (!protocol) {
                return { kind: 'protocol_not_found' };
            }
            const version = await repo.createDraftVersion({
                accountId: actor.accountId,
                protocolId,
                createdByUserId: actor.userId
            });
            if (!version) {
                return { kind: 'protocol_not_found' };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolVersionCreated',
                entityType: 'protocol_version',
                entityId: version.id,
                beforeJson: null,
                afterJson: version,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                version
            };
        },
        async listByProtocol(protocolId, query) {
            const actor = ensureAccountActor(context.requestContext);
            const protocol = await repo.findProtocolInAccount(actor.accountId, protocolId);
            if (!protocol) {
                return { kind: 'protocol_not_found' };
            }
            const versions = await repo.listByProtocol({
                accountId: actor.accountId,
                protocolId,
                page: query.page,
                pageSize: query.pageSize
            });
            return {
                kind: 'ok',
                versions
            };
        },
        async getById(versionId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, versionId);
        },
        async editDraft(versionId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, versionId);
            if (!before) {
                return { kind: 'version_not_found' };
            }
            if (!isDraftVersion(before.status)) {
                return {
                    kind: 'version_not_editable',
                    version: before
                };
            }
            const criticalChanged = hasCriticalProtocolContentChange(before.contentJson, patch.contentJson);
            if (criticalChanged && !hasChangeReason(patch.changeReason)) {
                return { kind: 'change_reason_required' };
            }
            const after = await repo.updateDraftById({
                accountId: actor.accountId,
                versionId,
                contentJson: patch.contentJson,
                changeReason: patch.changeReason,
                updatedByUserId: actor.userId
            });
            if (!after) {
                const current = await repo.findById(actor.accountId, versionId);
                if (!current) {
                    return { kind: 'version_not_found' };
                }
                return {
                    kind: 'version_not_editable',
                    version: current
                };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'ProtocolVersionEdited',
                entityType: 'protocol_version',
                entityId: versionId,
                beforeJson: before,
                afterJson: after,
                reason: patch.changeReason,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'edited',
                version: after
            };
        }
    };
}
//# sourceMappingURL=service.js.map