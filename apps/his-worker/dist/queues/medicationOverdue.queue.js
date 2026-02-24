import { Queue } from 'bullmq';
export const MEDICATION_OVERDUE_QUEUE_NAME = 'medication-overdue';
export const MEDICATION_OVERDUE_SCAN_JOB_NAME = 'scan';
export function medicationOverdueScanJobOptions() {
    return {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 200,
        removeOnFail: 500
    };
}
function normalizeEnqueuedAt(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
}
function slotBucketMs(payload, intervalMs) {
    const base = normalizeEnqueuedAt(payload.enqueuedAt);
    return Math.floor(base / intervalMs) * intervalMs;
}
export function medicationOverdueScanJobId(payload, input = {}) {
    const intervalMs = input.intervalMs && input.intervalMs > 0 ? input.intervalMs : 60_000;
    const accountKey = payload.accountId ?? 'all-accounts';
    const graceKey = payload.graceMinutes ?? 'default';
    const slotKey = slotBucketMs(payload, intervalMs);
    return `medication-overdue-scan-${payload.trigger}-${accountKey}-${slotKey}-${graceKey}`;
}
export function createMedicationOverdueQueue(connection, prefix) {
    return new Queue(MEDICATION_OVERDUE_QUEUE_NAME, {
        connection,
        prefix
    });
}
//# sourceMappingURL=medicationOverdue.queue.js.map