import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
export declare const HANDOVER_BUILD_QUEUE_NAME = "handover-build";
export declare const HANDOVER_BUILD_JOB_NAME = "build";
export type HandoverBuildJobName = typeof HANDOVER_BUILD_JOB_NAME;
export type HandoverBuildJobData = {
    handoverId: string;
    accountId: string;
    wardId: string;
    requestedByUserId: string;
    requestId: string;
};
export type HandoverBuildJobResult = {
    status: 'ready' | 'idempotent_ready';
    handoverId: string;
    documentId: string | null;
    storageKey: string | null;
};
export declare function handoverBuildJobId(payload: HandoverBuildJobData): string;
export declare function handoverBuildJobOptions(): JobsOptions;
export declare function createHandoverBuildQueue(connection: Redis, prefix: string): Queue<HandoverBuildJobData, HandoverBuildJobResult, HandoverBuildJobName>;
//# sourceMappingURL=handover.queue.d.ts.map