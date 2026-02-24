import { computeMedicationSlots, computeNextDueSlot } from '@cvg-his/domain';
import { resolveMedicationScheduleTimezone } from '../medicationSchedules/timezone.js';
import { createMedicationDosesRepo } from './repo.js';
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
function slotKey(orderId, scheduledFor) {
    return `${orderId}:${scheduledFor.getTime()}`;
}
function isWithinWindow(date, from, to) {
    const value = date.getTime();
    return value >= from.getTime() && value <= to.getTime();
}
function sortByScheduledForAsc(left, right) {
    return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
}
export function createMedicationDosesService(context, dependencies = {}) {
    const repo = dependencies.repo ?? createMedicationDosesRepo(context.db);
    return {
        async getDue(input) {
            const actor = ensureAccountActor(context.requestContext);
            const now = new Date();
            const windowMs = input.windowMin * 60_000;
            const from = new Date(now.getTime() - windowMs);
            const to = new Date(now.getTime() + windowMs);
            const schedules = await repo.listActiveOrderSchedules(actor.accountId, input.stayId);
            if (schedules.length === 0) {
                return {
                    now: now.toISOString(),
                    windowMin: input.windowMin,
                    overdue: [],
                    upcoming: [],
                    total: 0
                };
            }
            const orderIds = Array.from(new Set(schedules.map((item) => item.orderId)));
            const [lastByOrderId, administrationRows] = await Promise.all([
                repo.listLastScheduledForByOrderIds(actor.accountId, orderIds),
                repo.listAdministrationRowsInWindow(actor.accountId, orderIds, from, to)
            ]);
            const administeredSlots = new Set(administrationRows
                .filter((item) => item.status === 'administered')
                .map((item) => slotKey(item.orderId, item.scheduledFor)));
            const delayedByOriginalSlot = new Map();
            const delayedByOrderId = new Map();
            for (const row of administrationRows) {
                if (row.status !== 'delayed' || !row.delayedUntil) {
                    continue;
                }
                delayedByOriginalSlot.set(slotKey(row.orderId, row.scheduledFor), row.delayedUntil);
                const byOrder = delayedByOrderId.get(row.orderId) ?? [];
                byOrder.push(row.delayedUntil);
                delayedByOrderId.set(row.orderId, byOrder);
            }
            const overdue = [];
            const upcoming = [];
            const refreshNextDueTasks = [];
            for (const item of schedules) {
                const lastScheduledFor = lastByOrderId.get(item.orderId) ?? null;
                const timezone = resolveMedicationScheduleTimezone({
                    accountId: actor.accountId,
                    wardId: item.wardId
                });
                const schedule = {
                    scheduleType: item.scheduleType,
                    intervalMinutes: item.intervalMinutes,
                    times: item.times,
                    orderStartAt: item.orderStartAt,
                    orderEndAt: item.orderEndAt,
                    lastScheduledFor
                };
                const calculatedNextDue = computeNextDueSlot(now, schedule, timezone);
                const persistedNextDueMs = item.nextDueAt?.getTime() ?? null;
                const calculatedNextDueMs = calculatedNextDue?.getTime() ?? null;
                if (persistedNextDueMs !== calculatedNextDueMs) {
                    refreshNextDueTasks.push(repo.updateScheduleNextDueAt(actor.accountId, item.scheduleId, calculatedNextDue));
                }
                const slotsInWindow = computeMedicationSlots({
                    schedule,
                    windowStart: from,
                    windowEnd: to,
                    timezone
                });
                if (slotsInWindow.length === 0) {
                    const delayedOnlySlots = delayedByOrderId.get(item.orderId) ?? [];
                    if (delayedOnlySlots.length === 0) {
                        continue;
                    }
                }
                const candidateSlotsByKey = new Map();
                for (const slot of slotsInWindow) {
                    const originalSlotKey = slotKey(item.orderId, slot);
                    if (administeredSlots.has(originalSlotKey)) {
                        continue;
                    }
                    const delayedUntil = delayedByOriginalSlot.get(originalSlotKey) ?? null;
                    const effectiveSlot = delayedUntil ?? slot;
                    if (!isWithinWindow(effectiveSlot, from, to)) {
                        continue;
                    }
                    const effectiveSlotKey = slotKey(item.orderId, effectiveSlot);
                    if (administeredSlots.has(effectiveSlotKey)) {
                        continue;
                    }
                    candidateSlotsByKey.set(effectiveSlotKey, effectiveSlot);
                }
                for (const delayedUntil of delayedByOrderId.get(item.orderId) ?? []) {
                    if (!isWithinWindow(delayedUntil, from, to)) {
                        continue;
                    }
                    const delayedSlotKey = slotKey(item.orderId, delayedUntil);
                    if (administeredSlots.has(delayedSlotKey)) {
                        continue;
                    }
                    candidateSlotsByKey.set(delayedSlotKey, delayedUntil);
                }
                for (const slot of candidateSlotsByKey.values()) {
                    const dueItem = {
                        orderId: item.orderId,
                        stayId: item.stayId,
                        encounterId: item.encounterId,
                        timezone,
                        patient: {
                            id: item.patientId,
                            name: item.patientName
                        },
                        medication: {
                            name: item.medicationName,
                            doseValue: item.doseValue,
                            doseUnit: item.doseUnit,
                            route: item.route,
                            frequencyType: item.frequencyType
                        },
                        scheduledFor: slot.toISOString(),
                        nextDueAt: (calculatedNextDue ?? slot).toISOString()
                    };
                    if (slot.getTime() < now.getTime()) {
                        overdue.push(dueItem);
                    }
                    else {
                        upcoming.push(dueItem);
                    }
                }
            }
            if (refreshNextDueTasks.length > 0) {
                await Promise.all(refreshNextDueTasks);
            }
            overdue.sort(sortByScheduledForAsc);
            upcoming.sort(sortByScheduledForAsc);
            return {
                now: now.toISOString(),
                windowMin: input.windowMin,
                overdue,
                upcoming,
                total: overdue.length + upcoming.length
            };
        }
    };
}
//# sourceMappingURL=service.js.map