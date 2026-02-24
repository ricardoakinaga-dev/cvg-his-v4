import { createAlertsRepo } from './repo.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function queueUnavailableError(message) {
    const error = new Error(message);
    error.statusCode = 503;
    error.code = 'QUEUE_UNAVAILABLE';
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
export function createAlertsService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createAlertsRepo(context.db);
    return {
        async list(query) {
            const actor = ensureAccountActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                stayId: query.stayId,
                type: query.type,
                page: query.page,
                pageSize: query.pageSize
            });
        },
        async enqueueOverdueScan(input) {
            const actor = ensureWriteActor(context.requestContext);
            const enqueueMedicationOverdueScan = dependencies.enqueueMedicationOverdueScan;
            if (!enqueueMedicationOverdueScan) {
                throw queueUnavailableError('Queue publisher is not configured for medication overdue scans.');
            }
            try {
                return await enqueueMedicationOverdueScan({
                    accountId: actor.accountId,
                    requestId: context.requestContext.requestId,
                    requestedByUserId: actor.userId,
                    trigger: 'manual',
                    graceMinutes: input.graceMinutes,
                    enqueuedAt: new Date().toISOString()
                });
            }
            catch (error) {
                throw queueUnavailableError(`Failed to enqueue medication overdue scan job: ${error instanceof Error ? error.message : 'unknown error'}`);
            }
        },
        /**
         * Acknowledge an alert - confirms that a clinician has seen the alert
         */
        async acknowledge(alertId, notes) {
            const actor = ensureWriteActor(context.requestContext);
            return repo.acknowledge({
                alertId,
                accountId: actor.accountId,
                acknowledgedByUserId: actor.userId,
                notes
            });
        },
        /**
         * Resolve an alert - marks the alert as resolved after action taken
         */
        async resolve(alertId, notes) {
            const actor = ensureWriteActor(context.requestContext);
            return repo.resolve({
                alertId,
                accountId: actor.accountId,
                resolvedByUserId: actor.userId,
                notes
            });
        },
        /**
         * Acknowledge multiple alerts at once
         */
        async acknowledgeMany(alertIds, notes) {
            const actor = ensureWriteActor(context.requestContext);
            const results = await repo.acknowledgeMany({
                alertIds,
                accountId: actor.accountId,
                acknowledgedByUserId: actor.userId,
                notes
            });
            return results;
        },
        /**
         * Resolve multiple alerts at once
         */
        async resolveMany(alertIds, notes) {
            const actor = ensureWriteActor(context.requestContext);
            const results = await repo.resolveMany({
                alertIds,
                accountId: actor.accountId,
                resolvedByUserId: actor.userId,
                notes
            });
            return results;
        }
    };
}
//# sourceMappingURL=service.js.map