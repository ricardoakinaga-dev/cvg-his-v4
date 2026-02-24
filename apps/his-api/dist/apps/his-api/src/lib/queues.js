import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
/**
 * 🔥 IMPORTANTE
 * BullMQ NÃO permite ":" no nome da fila.
 * Use "-" ou "__" para namespace.
 * Prefixo deve separar ambiente / tenant.
 */
export const HANDOVER_BUILD_QUEUE_NAME = 'handover-build';
export const HANDOVER_BUILD_JOB_NAME = 'build';
export const MEDICATION_OVERDUE_QUEUE_NAME = 'medication-overdue';
export const MEDICATION_OVERDUE_SCAN_JOB_NAME = 'scan';
export const PROTOCOL_PUBLISH_QUEUE_NAME = 'protocol-publish';
export const PROTOCOL_PUBLISH_JOB_NAME = 'publish';
/**
 * 🔐 Guardrail para evitar erro em produção
 */
function assertBullMqQueueName(name) {
    if (name.includes(':')) {
        throw new Error(`Invalid BullMQ queue name (contains ":"): ${name}`);
    }
}
/**
 * =========================
 * JOB OPTIONS (retry / backoff)
 * =========================
 */
function handoverBuildJobOptions() {
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
function medicationOverdueScanJobOptions() {
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
function protocolPublishJobOptions() {
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
function handoverBuildJobId(payload) {
    return `handover-build-${payload.accountId}-${payload.handoverId}`;
}
function protocolPublishJobId(payload) {
    return `protocol-publish-${payload.accountId}-${payload.protocolId}-${payload.versionId}`;
}
function normalizeEnqueuedAt(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
}
function medicationOverdueScanJobId(payload) {
    const intervalMs = 60_000;
    const slotKey = Math.floor(normalizeEnqueuedAt(payload.enqueuedAt) / intervalMs) * intervalMs;
    const accountKey = payload.accountId ?? 'all-accounts';
    const graceKey = payload.graceMinutes ?? 'default';
    return `medication-overdue-scan-${payload.trigger}-${accountKey}-${slotKey}-${graceKey}`;
}
/**
 * =========================
 * FACTORY
 * =========================
 */
export function createApiQueues(input) {
    const { redisUrl, prefix, logger } = input;
    /**
     * 🔐 Segurança adicional
     */
    if (prefix.includes(':')) {
        logger?.warn({ prefix }, 'BullMQ prefix contains ":" which may generate Redis key issues. Prefer "-"');
    }
    /**
     * Redis connection (reutilizável)
     */
    const connection = new Redis(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
    });
    connection.on('error', (error) => {
        logger?.warn({ err: error }, 'api queue redis error');
    });
    /**
     * Guardrails
     */
    assertBullMqQueueName(HANDOVER_BUILD_QUEUE_NAME);
    assertBullMqQueueName(MEDICATION_OVERDUE_QUEUE_NAME);
    assertBullMqQueueName(PROTOCOL_PUBLISH_QUEUE_NAME);
    /**
     * Filas
     */
    const handoverBuildQueue = new Queue(HANDOVER_BUILD_QUEUE_NAME, {
        connection,
        prefix
    });
    const medicationOverdueQueue = new Queue(MEDICATION_OVERDUE_QUEUE_NAME, {
        connection,
        prefix
    });
    const protocolPublishQueue = new Queue(PROTOCOL_PUBLISH_QUEUE_NAME, {
        connection,
        prefix
    });
    /**
     * =========================
     * API
     * =========================
     */
    return {
        async enqueueHandoverBuild(payload) {
            const job = await handoverBuildQueue.add(HANDOVER_BUILD_JOB_NAME, payload, {
                ...handoverBuildJobOptions(),
                jobId: handoverBuildJobId(payload)
            });
            logger?.info({ jobId: job.id, queue: HANDOVER_BUILD_QUEUE_NAME }, 'handover build job enqueued');
            return {
                jobId: job.id?.toString() ?? null
            };
        },
        async enqueueMedicationOverdueScan(payload) {
            const job = await medicationOverdueQueue.add(MEDICATION_OVERDUE_SCAN_JOB_NAME, payload, {
                ...medicationOverdueScanJobOptions(),
                jobId: medicationOverdueScanJobId(payload)
            });
            logger?.info({ jobId: job.id, queue: MEDICATION_OVERDUE_QUEUE_NAME }, 'medication overdue scan job enqueued');
            return {
                jobId: job.id?.toString() ?? null
            };
        },
        async enqueueProtocolPublish(payload) {
            const job = await protocolPublishQueue.add(PROTOCOL_PUBLISH_JOB_NAME, payload, {
                ...protocolPublishJobOptions(),
                jobId: protocolPublishJobId(payload)
            });
            logger?.info({ jobId: job.id, queue: PROTOCOL_PUBLISH_QUEUE_NAME }, 'protocol publish job enqueued');
            return {
                jobId: job.id?.toString() ?? null
            };
        },
        async close() {
            await Promise.all([
                handoverBuildQueue.close(),
                medicationOverdueQueue.close(),
                protocolPublishQueue.close()
            ]);
            try {
                await connection.quit();
            }
            catch {
                connection.disconnect();
            }
        }
    };
}
//# sourceMappingURL=queues.js.map