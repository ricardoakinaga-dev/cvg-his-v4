import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
export declare const PROTOCOL_PUBLISH_QUEUE_NAME = "protocol-publish";
export declare const PROTOCOL_PUBLISH_JOB_NAME = "publish";
export type ProtocolPublishJobName = typeof PROTOCOL_PUBLISH_JOB_NAME;
export type ProtocolPublishJobData = {
    accountId: string;
    protocolId: string;
    versionId: string;
    requestedByUserId: string;
    requestId: string;
};
export type ProtocolPublishJobResult = {
    status: 'published' | 'idempotent_published' | 'failed';
    protocolId: string;
    versionId: string;
    snapshotId: string | null;
    snapshotHash: string | null;
    buildError: string | null;
};
export declare function protocolPublishJobId(payload: ProtocolPublishJobData): string;
export declare function protocolPublishJobOptions(): JobsOptions;
export declare function createProtocolPublishQueue(connection: Redis, prefix: string): Queue<ProtocolPublishJobData, ProtocolPublishJobResult, ProtocolPublishJobName>;
//# sourceMappingURL=protocolPublish.queue.d.ts.map