import { Queue } from 'bullmq';
export const HANDOVER_BUILD_QUEUE_NAME = 'handover-build';
export const HANDOVER_BUILD_JOB_NAME = 'build';
export function handoverBuildJobId(payload) {
    return `handover-build-${payload.accountId}-${payload.handoverId}`;
}
export function handoverBuildJobOptions() {
    return {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 500,
        removeOnFail: 1000
    };
}
export function createHandoverBuildQueue(connection, prefix) {
    return new Queue(HANDOVER_BUILD_QUEUE_NAME, {
        connection,
        prefix
    });
}
//# sourceMappingURL=handover.queue.js.map