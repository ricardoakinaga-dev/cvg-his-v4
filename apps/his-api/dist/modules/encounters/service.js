import { append } from '@cvg-his/audit';
import { createEncounterClosedEvent } from '@cvg-his/events';
import { createBillingItemsRepo } from '../billingItems/repo.js';
import { createEncountersRepo } from './repo.js';
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
export function createEncountersService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createEncountersRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const patientRef = await repo.findPatientInAccount(actor.accountId, input.patientId);
            if (!patientRef) {
                return { kind: 'patient_not_found' };
            }
            const encounter = await repo.create({
                accountId: actor.accountId,
                patientId: input.patientId,
                ownerId: patientRef.ownerId,
                openedByUserId: actor.userId,
                reason: input.reason
            });
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'encounter',
                entityId: encounter.id,
                action: 'encounter.create',
                beforeJson: null,
                afterJson: encounter,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                encounter
            };
        },
        async getById(encounterId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, encounterId);
        },
        async list(input) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                patientId: input.patientId,
                q: input.q,
                page: input.page,
                pageSize: input.pageSize
            });
        },
        async getTimeline(encounterId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.getTimeline(actor.accountId, encounterId);
        },
        async close(encounterId, input) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, encounterId);
            if (!before) {
                return { kind: 'encounter_not_found' };
            }
            if (before.status === 'closed') {
                return {
                    kind: 'already_closed',
                    encounter: before
                };
            }
            const after = await repo.closeById({
                accountId: actor.accountId,
                encounterId,
                closedByUserId: actor.userId,
                reason: input.reason
            });
            if (!after) {
                return {
                    kind: 'already_closed',
                    encounter: before
                };
            }
            // Confirm all draft billing items for this encounter
            const billingRepo = createBillingItemsRepo(context.db);
            const billingItemCount = await billingRepo.confirmAllByEncounter({
                accountId: actor.accountId,
                encounterId
            });
            // Get billing total
            const billingTotal = await billingRepo.getTotalByEncounter({
                accountId: actor.accountId,
                encounterId
            });
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'encounter',
                entityId: encounterId,
                action: 'encounter.close',
                beforeJson: before,
                afterJson: after,
                reason: input.reason,
                requestId: context.requestContext.requestId
            });
            // Emit EncounterClosed event
            const event = createEncounterClosedEvent({
                encounterId,
                accountId: actor.accountId,
                patientId: before.patientId,
                ownerId: before.ownerId,
                closedByUserId: actor.userId,
                closedAt: after.closedAt?.toISOString() ?? new Date().toISOString(),
                billingItemCount,
                billingTotal,
                requestId: context.requestContext.requestId ?? ''
            });
            // Event is emitted (would publish to event bus in production)
            void event; // Placeholder for event bus publishing
            return {
                kind: 'closed',
                encounter: after,
                billingItemCount,
                billingTotal
            };
        }
    };
}
//# sourceMappingURL=service.js.map