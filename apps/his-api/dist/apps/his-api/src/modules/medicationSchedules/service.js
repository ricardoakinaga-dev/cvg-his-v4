import { calculateNextDueAt } from './calc.js';
import { resolveMedicationScheduleTimezone } from './timezone.js';
import { createMedicationSchedulesRepo } from './repo.js';
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
function validateScheduleConfig(config) {
    if (config.scheduleType === 'interval') {
        if (!config.intervalMinutes || config.intervalMinutes <= 0) {
            return {
                ok: false,
                reason: 'interval_minutes_required'
            };
        }
        return { ok: true };
    }
    if (!config.times || config.times.length === 0) {
        return {
            ok: false,
            reason: 'fixed_times_required'
        };
    }
    return { ok: true };
}
function buildConfigFromCreate(payload) {
    return {
        scheduleType: payload.scheduleType,
        intervalMinutes: payload.scheduleType === 'interval' ? payload.intervalMinutes ?? null : null,
        times: payload.scheduleType === 'fixed_times' ? payload.times ?? null : null
    };
}
function buildConfigFromUpdate(existing, patch) {
    const scheduleType = patch.scheduleType ?? existing.scheduleType;
    const intervalMinutes = scheduleType === 'interval'
        ? patch.intervalMinutes !== undefined
            ? patch.intervalMinutes
            : existing.intervalMinutes
        : null;
    const times = scheduleType === 'fixed_times'
        ? patch.times !== undefined
            ? patch.times
            : existing.times
        : null;
    return {
        scheduleType,
        intervalMinutes: intervalMinutes ?? null,
        times: times ?? null
    };
}
function calculateFromOrder(order, config, lastScheduledFor) {
    const timezone = resolveMedicationScheduleTimezone({
        accountId: order.accountId,
        wardId: order.wardId
    });
    return calculateNextDueAt({
        scheduleType: config.scheduleType,
        intervalMinutes: config.intervalMinutes,
        times: config.times,
        orderStartAt: order.startAt,
        orderEndAt: order.endAt,
        lastScheduledFor,
        now: new Date(),
        timezone
    });
}
export function createMedicationSchedulesService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createMedicationSchedulesRepo(context.db);
    return {
        async create(orderId, payload) {
            const actor = ensureWriteActor(context.requestContext);
            const order = await repo.findOrderInAccount(actor.accountId, orderId);
            if (!order) {
                return { kind: 'order_not_found' };
            }
            if (order.status !== 'active') {
                return { kind: 'order_stopped' };
            }
            const existing = await repo.findScheduleByOrderId(actor.accountId, orderId);
            if (existing) {
                return { kind: 'schedule_already_exists' };
            }
            const config = buildConfigFromCreate(payload);
            const validation = validateScheduleConfig(config);
            if (!validation.ok) {
                return {
                    kind: 'invalid_schedule',
                    reason: validation.reason
                };
            }
            const lastScheduledFor = await repo.findLastScheduledFor(actor.accountId, orderId);
            const nextDueAt = calculateFromOrder(order, config, lastScheduledFor);
            const schedule = await repo.createSchedule({
                accountId: actor.accountId,
                orderId,
                scheduleType: config.scheduleType,
                intervalMinutes: config.intervalMinutes,
                times: config.times,
                nextDueAt
            });
            return {
                kind: 'created',
                schedule
            };
        },
        async update(orderId, patch) {
            const actor = ensureWriteActor(context.requestContext);
            const order = await repo.findOrderInAccount(actor.accountId, orderId);
            if (!order) {
                return { kind: 'order_not_found' };
            }
            if (order.status !== 'active') {
                return { kind: 'order_stopped' };
            }
            const existing = await repo.findScheduleByOrderId(actor.accountId, orderId);
            if (!existing) {
                return { kind: 'schedule_not_found' };
            }
            const config = buildConfigFromUpdate({
                scheduleType: existing.scheduleType,
                intervalMinutes: existing.intervalMinutes,
                times: existing.times
            }, patch);
            const validation = validateScheduleConfig(config);
            if (!validation.ok) {
                return {
                    kind: 'invalid_schedule',
                    reason: validation.reason
                };
            }
            const lastScheduledFor = await repo.findLastScheduledFor(actor.accountId, orderId);
            const nextDueAt = calculateFromOrder(order, config, lastScheduledFor);
            const schedule = await repo.updateScheduleByOrderId({
                accountId: actor.accountId,
                orderId,
                scheduleType: config.scheduleType,
                intervalMinutes: config.intervalMinutes,
                times: config.times,
                nextDueAt
            });
            if (!schedule) {
                return { kind: 'schedule_not_found' };
            }
            return {
                kind: 'updated',
                schedule
            };
        }
    };
}
//# sourceMappingURL=service.js.map