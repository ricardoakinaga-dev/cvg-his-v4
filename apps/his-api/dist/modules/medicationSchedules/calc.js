import { computeNextDueSlot, normalizeTimeZone } from '@cvg-his/domain';
export function calculateNextDueAt(input) {
    const timezone = normalizeTimeZone(input.timezone, process.env.DEFAULT_TIMEZONE ??
        process.env.MEDICATION_SCHEDULE_DEFAULT_TIMEZONE ??
        'America/Sao_Paulo');
    return computeNextDueSlot(input.now, {
        scheduleType: input.scheduleType,
        intervalMinutes: input.intervalMinutes,
        times: input.times,
        orderStartAt: input.orderStartAt,
        orderEndAt: input.orderEndAt,
        lastScheduledFor: input.lastScheduledFor
    }, timezone);
}
//# sourceMappingURL=calc.js.map