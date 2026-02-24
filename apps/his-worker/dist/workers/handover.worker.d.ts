import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { type HandoverBuildJobData, type HandoverBuildJobName, type HandoverBuildJobResult } from '../queues/handover.queue.js';
type HandoverWorkerOptions = {
    storageDir: string;
};
export declare function createHandoverWorker(connection: Redis, prefix: string, options: HandoverWorkerOptions): Worker<HandoverBuildJobData, HandoverBuildJobResult, HandoverBuildJobName>;
export {};
//# sourceMappingURL=handover.worker.d.ts.map