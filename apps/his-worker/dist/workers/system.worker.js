import { Worker } from 'bullmq';
import { SYSTEM_JOB_PING, SYSTEM_QUEUE_NAME } from '../queues/system.queue.js';
export function createSystemWorker(connection, prefix) {
    return new Worker(SYSTEM_QUEUE_NAME, async (job) => {
        if (job.name !== SYSTEM_JOB_PING) {
            throw new Error(`Unsupported system job name: ${job.name}`);
        }
        const result = {
            result: 'pong',
            ts: new Date().toISOString(),
            jobId: job.id?.toString() ?? 'unknown'
        };
        console.info(JSON.stringify({
            level: 'info',
            message: 'system.ping processed',
            requestId: job.data.requestId ?? null,
            jobId: result.jobId,
            ts: result.ts
        }));
        return result;
    }, {
        connection,
        prefix
    });
}
//# sourceMappingURL=system.worker.js.map