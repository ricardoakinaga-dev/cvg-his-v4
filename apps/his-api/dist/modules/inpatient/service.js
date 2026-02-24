import { append } from '@cvg-his/audit';
import { bedBelongsToWard, isActiveBedConflictError, isActiveStay } from './rules.js';
import { createInpatientRepo } from './repo.js';
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
export function createInpatientService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createInpatientRepo(context.db);
    const appendAudit = dependencies.appendAudit ?? append;
    return {
        async admit(input) {
            const actor = ensureWriteActor(context.requestContext);
            const patientRef = await repo.findPatientInAccount(actor.accountId, input.patientId);
            if (!patientRef) {
                return { kind: 'patient_not_found' };
            }
            const wardExists = await repo.wardExistsInAccount(actor.accountId, input.wardId);
            if (!wardExists) {
                return { kind: 'ward_not_found' };
            }
            const bed = await repo.findBedInAccount(actor.accountId, input.bedId);
            if (!bed) {
                return { kind: 'bed_not_found' };
            }
            if (!bed.isActive) {
                return { kind: 'bed_inactive' };
            }
            if (!bedBelongsToWard(bed.wardId, input.wardId)) {
                return { kind: 'bed_ward_mismatch' };
            }
            const occupied = await repo.hasActiveStayInBed(actor.accountId, input.bedId);
            if (occupied) {
                return { kind: 'bed_occupied' };
            }
            let stay;
            try {
                stay = await repo.admit({
                    accountId: actor.accountId,
                    patientId: patientRef.patientId,
                    ownerId: patientRef.ownerId,
                    encounterId: input.encounterId,
                    wardId: input.wardId,
                    bedId: input.bedId,
                    admittedByUserId: actor.userId,
                    chiefComplaint: input.chiefComplaint,
                    reason: input.reason,
                    planSummary: input.planSummary
                });
            }
            catch (error) {
                if (isActiveBedConflictError(error)) {
                    return { kind: 'bed_occupied' };
                }
                throw error;
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'InpatientAdmitted',
                entityType: 'inpatient_stay',
                entityId: stay.id,
                beforeJson: null,
                afterJson: stay,
                reason: input.reason ?? input.chiefComplaint,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'admitted',
                stay
            };
        },
        async transfer(stayId, input) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findStayById(actor.accountId, stayId);
            if (!before) {
                return { kind: 'stay_not_found' };
            }
            if (!isActiveStay(before.status)) {
                return { kind: 'stay_not_active', stay: before };
            }
            const wardExists = await repo.wardExistsInAccount(actor.accountId, input.toWardId);
            if (!wardExists) {
                return { kind: 'ward_not_found' };
            }
            const bed = await repo.findBedInAccount(actor.accountId, input.toBedId);
            if (!bed) {
                return { kind: 'bed_not_found' };
            }
            if (!bed.isActive) {
                return { kind: 'bed_inactive' };
            }
            if (!bedBelongsToWard(bed.wardId, input.toWardId)) {
                return { kind: 'bed_ward_mismatch' };
            }
            const occupied = await repo.hasActiveStayInBed(actor.accountId, input.toBedId, stayId);
            if (occupied) {
                return { kind: 'bed_occupied' };
            }
            let after;
            try {
                after = await repo.transfer({
                    accountId: actor.accountId,
                    stayId,
                    toWardId: input.toWardId,
                    toBedId: input.toBedId,
                    reason: input.reason
                });
            }
            catch (error) {
                if (isActiveBedConflictError(error)) {
                    return { kind: 'bed_occupied' };
                }
                throw error;
            }
            if (!after) {
                const current = await repo.findStayById(actor.accountId, stayId);
                if (!current) {
                    return { kind: 'stay_not_found' };
                }
                return { kind: 'stay_not_active', stay: current };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'InpatientTransferred',
                entityType: 'inpatient_stay',
                entityId: stayId,
                beforeJson: before,
                afterJson: after,
                reason: input.reason,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'transferred',
                stay: after
            };
        },
        async discharge(stayId, input) {
            const actor = ensureWriteActor(context.requestContext);
            const before = await repo.findStayById(actor.accountId, stayId);
            if (!before) {
                return { kind: 'stay_not_found' };
            }
            if (!isActiveStay(before.status)) {
                return { kind: 'stay_not_active', stay: before };
            }
            const after = await repo.discharge({
                accountId: actor.accountId,
                stayId,
                reason: input.reason,
                dischargedByUserId: actor.userId
            });
            if (!after) {
                const current = await repo.findStayById(actor.accountId, stayId);
                if (!current) {
                    return { kind: 'stay_not_found' };
                }
                return { kind: 'stay_not_active', stay: current };
            }
            await appendAudit({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                action: 'InpatientDischarged',
                entityType: 'inpatient_stay',
                entityId: stayId,
                beforeJson: before,
                afterJson: after,
                reason: input.reason,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'discharged',
                stay: after
            };
        },
        async getById(stayId) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.findStayById(actor.accountId, stayId);
        },
        async list(query) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                page: query.page,
                pageSize: query.pageSize,
                status: query.status,
                wardId: query.wardId
            });
        }
    };
}
//# sourceMappingURL=service.js.map