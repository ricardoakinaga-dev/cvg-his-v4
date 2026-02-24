import { randomUUID } from 'node:crypto';
import { append } from '@cvg-his/audit';
import { createDocumentsRepo } from './repo.js';
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
function buildStorageKey(accountId, filename) {
    const safeName = filename.replace(/[^\w.\-]/g, '_');
    return `${accountId}/${Date.now()}-${randomUUID()}-${safeName}`;
}
export function createDocumentsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createDocumentsRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const storageKey = buildStorageKey(actor.accountId, input.filename);
            const document = await repo.create({
                accountId: actor.accountId,
                storageKey,
                createdByUserId: actor.userId,
                payload: input
            });
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'document',
                entityId: document.id,
                action: 'document.create',
                beforeJson: null,
                afterJson: document,
                requestId: context.requestContext.requestId
            });
            return document;
        },
        async getById(documentId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, documentId);
        },
        async attachToEncounter(encounterId, documentId) {
            const actor = ensureWriteActor(context.requestContext);
            const encounterExists = await repo.encounterExistsInAccount(actor.accountId, encounterId);
            if (!encounterExists) {
                return { kind: 'encounter_not_found' };
            }
            const document = await repo.findById(actor.accountId, documentId);
            if (!document) {
                return { kind: 'document_not_found' };
            }
            const attached = await repo.attachToEncounter({
                accountId: actor.accountId,
                encounterId,
                documentId,
                attachedByUserId: actor.userId
            });
            if (!attached) {
                return { kind: 'document_not_found' };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'encounter',
                entityId: encounterId,
                action: attached.alreadyAttached ? 'encounter.document.attach.duplicate' : 'encounter.document.attach',
                beforeJson: null,
                afterJson: {
                    documentId,
                    relationId: attached.relation.id,
                    alreadyAttached: attached.alreadyAttached
                },
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'attached',
                relation: attached.relation,
                alreadyAttached: attached.alreadyAttached
            };
        }
    };
}
//# sourceMappingURL=service.js.map