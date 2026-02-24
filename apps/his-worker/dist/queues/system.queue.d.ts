import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
export declare const SYSTEM_QUEUE_NAME = "system";
export declare const SYSTEM_QUEUE_PREFIX_DEFAULT = "cvg-his";
export declare const SYSTEM_JOB_PING = "ping";
export type SystemPingJobName = typeof SYSTEM_JOB_PING;
export type SystemPingJobData = {
    requestId?: string;
    enqueuedAt: string;
};
export type SystemPingJobResult = {
    result: 'pong';
    ts: string;
    jobId: string;
};
export declare function pingJobOptions(): JobsOptions;
export declare function createSystemQueue(connection: Redis, prefix: string): Queue<SystemPingJobData, SystemPingJobResult, SystemPingJobName>;
//# sourceMappingURL=system.queue.d.ts.map