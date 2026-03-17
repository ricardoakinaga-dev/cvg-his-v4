import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { type SystemPingJobData, type SystemPingJobName, type SystemPingJobResult } from '../queues/system.queue.js';
export declare function createSystemWorker(connection: Redis, prefix: string): Worker<SystemPingJobData, SystemPingJobResult, SystemPingJobName>;
//# sourceMappingURL=system.worker.d.ts.map