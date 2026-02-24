import { createMedicationLogsRepo } from './repo.js';
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
function resolveViewMode(actor) {
    if (actor.roles.includes('vet')) {
        return 'vet';
    }
    if (actor.roles.includes('enfermagem')) {
        return 'enfermagem';
    }
    return 'default';
}
function mapOrder(row) {
    return {
        id: row.id,
        medicationName: row.medicationName,
        dose: `${row.doseValue} ${row.doseUnit}`,
        route: row.route,
        frequencyType: row.frequencyType,
        status: row.status,
        nextDueAt: row.nextDueAt ? row.nextDueAt.toISOString() : null
    };
}
function mapAdministration(row) {
    return {
        id: row.id,
        orderId: row.orderId,
        scheduledFor: row.scheduledFor.toISOString(),
        status: row.status,
        effectiveAt: row.effectiveAt ? row.effectiveAt.toISOString() : null,
        delayedUntil: row.delayedUntil ? row.delayedUntil.toISOString() : null,
        administeredAt: row.administeredAt ? row.administeredAt.toISOString() : null,
        reason: row.reason,
        byUserId: row.byUserId
    };
}
function nextDueSort(left, right) {
    const leftValue = left.nextDueAt ? new Date(left.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
    const rightValue = right.nextDueAt ? new Date(right.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
}
function administrationRecentSort(left, right) {
    return new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime();
}
export function createMedicationLogsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createMedicationLogsRepo(context.db);
    return {
        async getByStay(stayId) {
            const actor = ensureAccountActor(context.requestContext);
            const viewMode = resolveViewMode(actor);
            const administrationLimit = viewMode === 'vet' ? 120 : viewMode === 'enfermagem' ? 80 : 100;
            const [orderRows, administrationRows] = await Promise.all([
                repo.listActiveOrdersByStay(actor.accountId, stayId),
                repo.listRecentAdministrationsByStay(actor.accountId, stayId, administrationLimit)
            ]);
            const orders = orderRows.map(mapOrder);
            const administrations = administrationRows.map(mapAdministration);
            if (viewMode === 'enfermagem') {
                orders.sort(nextDueSort);
            }
            else if (viewMode === 'vet') {
                orders.sort((left, right) => left.medicationName.localeCompare(right.medicationName));
            }
            else {
                orders.sort(nextDueSort);
            }
            administrations.sort(administrationRecentSort);
            return {
                stayId,
                orders,
                administrations
            };
        }
    };
}
//# sourceMappingURL=service.js.map