import { Queue } from 'bullmq';
export const SYSTEM_QUEUE_NAME = 'system';
export const SYSTEM_QUEUE_PREFIX_DEFAULT = 'cvg-his';
export const SYSTEM_JOB_PING = 'ping';
export function pingJobOptions() {
    return {
        removeOnComplete: 500,
        removeOnFail: 1000
    };
}
export function createSystemQueue(connection, prefix) {
    return new Queue(SYSTEM_QUEUE_NAME, {
        connection,
        prefix
    });
}
//# sourceMappingURL=system.queue.js.map