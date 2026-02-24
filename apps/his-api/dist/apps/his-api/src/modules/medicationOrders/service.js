import { append } from '@cvg-his/audit';
import { createMedicationOrdersRepo } from './repo.js';
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
export function createMedicationOrdersService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createMedicationOrdersRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async create(input) {
            const actor = ensureWriteActor(context.requestContext);
            const patient = await repo.findPatientInAccount(actor.accountId, input.patientId);
            if (!patient) {
                return { kind: 'patient_not_found' };
            }
            if (input.stayId) {
                const stay = await repo.findStayInAccount(actor.accountId, input.stayId);
                if (!stay) {
                    return { kind: 'stay_not_found' };
                }
                if (stay.patientId !== input.patientId) {
                    return {
                        kind: 'patient_mismatch',
                        message: 'O paciente da internação não corresponde ao paciente selecionado.'
                    };
                }
            }
            if (input.encounterId) {
                const encounter = await repo.findEncounterInAccount(actor.accountId, input.encounterId);
                if (!encounter) {
                    return { kind: 'encounter_not_found' };
                }
                if (encounter.patientId !== input.patientId) {
                    return {
                        kind: 'patient_mismatch',
                        message: 'O paciente do atendimento não corresponde ao paciente selecionado.'
                    };
                }
            }
            const order = await repo.create({
                accountId: actor.accountId,
                createdByUserId: actor.userId,
                ...input
            });
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'MedicationOrderCreated',
                entityType: 'medication_order',
                entityId: order.id,
                beforeJson: null,
                afterJson: order,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                order
            };
        },
        async getById(orderId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findById(actor.accountId, orderId);
        },
        async list(query) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                encounterId: query.encounterId,
                stayId: query.stayId,
                status: query.status,
                page: query.page,
                pageSize: query.pageSize
            });
        },
        async update(orderId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, orderId);
            if (!before) {
                return { kind: 'order_not_found' };
            }
            if (before.status === 'stopped') {
                return {
                    kind: 'order_stopped',
                    order: before
                };
            }
            const after = await repo.updateById({
                accountId: actor.accountId,
                orderId,
                patch
            });
            if (!after) {
                return { kind: 'order_not_found' };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'MedicationOrderUpdated',
                entityType: 'medication_order',
                entityId: orderId,
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'updated',
                order: after
            };
        },
        async stop(orderId, input) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findById(actor.accountId, orderId);
            if (!before) {
                return { kind: 'order_not_found' };
            }
            if (before.status === 'stopped') {
                return {
                    kind: 'already_stopped',
                    order: before
                };
            }
            const after = await repo.stopById({
                accountId: actor.accountId,
                orderId,
                stopReason: input.stopReason,
                stoppedByUserId: actor.userId
            });
            if (!after) {
                return {
                    kind: 'already_stopped',
                    order: before
                };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'MedicationOrderStopped',
                entityType: 'medication_order',
                entityId: orderId,
                beforeJson: before,
                afterJson: after,
                reason: input.stopReason,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'stopped',
                order: after
            };
        }
    };
}
//# sourceMappingURL=service.js.map