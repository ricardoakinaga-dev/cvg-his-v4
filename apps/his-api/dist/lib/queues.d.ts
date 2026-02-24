import type { FastifyBaseLogger } from 'fastify';
/**
 * 🔥 IMPORTANTE
 * BullMQ NÃO permite ":" no nome da fila.
 * Use "-" ou "__" para namespace.
 * Prefixo deve separar ambiente / tenant.
 */
export declare const HANDOVER_BUILD_QUEUE_NAME = "handover-build";
export declare const HANDOVER_BUILD_JOB_NAME = "build";
export declare const MEDICATION_OVERDUE_QUEUE_NAME = "medication-overdue";
export declare const MEDICATION_OVERDUE_SCAN_JOB_NAME = "scan";
export declare const PROTOCOL_PUBLISH_QUEUE_NAME = "protocol-publish";
export declare const PROTOCOL_PUBLISH_JOB_NAME = "publish";
/**
 * =========================
 * JOB DATA TYPES
 * =========================
 */
export type HandoverBuildJobData = {
    handoverId: string;
    accountId: string;
    wardId: string;
    requestedByUserId: string;
    requestId: string;
};
export type HandoverBuildEnqueueResult = {
    jobId: string | null;
};
export type MedicationOverdueScanJobData = {
    accountId?: string;
    requestId?: string;
    requestedByUserId?: string;
    trigger: 'manual' | 'scheduled';
    graceMinutes?: number;
    enqueuedAt: string;
};
export type MedicationOverdueScanEnqueueResult = {
    jobId: string | null;
};
export type ProtocolPublishJobData = {
    accountId: string;
    protocolId: string;
    versionId: string;
    requestedByUserId: string;
    requestId: string;
};
export type ProtocolPublishEnqueueResult = {
    jobId: string | null;
};
type CreateApiQueuesInput = {
    redisUrl: string;
    prefix: string;
    logger?: FastifyBaseLogger;
};
export type ApiQueues = {
    enqueueHandoverBuild: (payload: HandoverBuildJobData) => Promise<HandoverBuildEnqueueResult>;
    enqueueMedicationOverdueScan: (payload: MedicationOverdueScanJobData) => Promise<MedicationOverdueScanEnqueueResult>;
    enqueueProtocolPublish: (payload: ProtocolPublishJobData) => Promise<ProtocolPublishEnqueueResult>;
    close: () => Promise<void>;
};
/**
 * =========================
 * FACTORY
 * =========================
 */
export declare function createApiQueues(input: CreateApiQueuesInput): ApiQueues;
export {};
//# sourceMappingURL=queues.d.ts.map