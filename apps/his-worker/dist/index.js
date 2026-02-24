import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { startCron } from './lib/cron.js';
import { closeDbConnection } from './lib/db.js';
import { startHealthServer } from './lib/healthServer.js';
import { acquireOrRenewLeaderLock, releaseLeaderLock } from './lib/leaderLock.js';
import { closeBullMqRedis, createBullMqRedis } from './lib/redis.js';
import { recordCronRunFailure, recordCronRunStart, recordCronRunSuccess } from './lib/workerHealth.js';
import { HANDOVER_BUILD_QUEUE_NAME } from './queues/handover.queue.js';
import { MEDICATION_OVERDUE_QUEUE_NAME, MEDICATION_OVERDUE_SCAN_JOB_NAME, createMedicationOverdueQueue, medicationOverdueScanJobId, medicationOverdueScanJobOptions } from './queues/medicationOverdue.queue.js';
import { PROTOCOL_PUBLISH_QUEUE_NAME } from './queues/protocolPublish.queue.js';
import { SYSTEM_QUEUE_NAME, SYSTEM_QUEUE_PREFIX_DEFAULT } from './queues/system.queue.js';
import { createHandoverWorker } from './workers/handover.worker.js';
import { createMedicationOverdueWorker } from './workers/medicationOverdue.worker.js';
import { createProtocolPublishWorker } from './workers/protocolPublish.worker.js';
import { createSystemWorker } from './workers/system.worker.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    QUEUE_PREFIX: z.string().trim().min(1).default(SYSTEM_QUEUE_PREFIX_DEFAULT),
    HANDOVER_STORAGE_DIR: z.string().trim().min(1).default('/tmp/cvg-his-storage'),
    DEFAULT_TIMEZONE: z.string().trim().min(1).default('America/Sao_Paulo'),
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: z.string().trim().min(1).default('America/Sao_Paulo'),
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: z.string().default('{}'),
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: z.string().default('{}'),
    HEALTH_PORT: z.coerce.number().int().positive().default(3100),
    MEDICATION_OVERDUE_AUTO_SCAN: z
        .enum(['true', 'false'])
        .default('true')
        .transform((value) => value === 'true'),
    MEDICATION_OVERDUE_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    MEDICATION_OVERDUE_GRACE_MINUTES: z.coerce.number().int().positive().default(30),
    CRON_LEADER_LOCK_TTL_MS: z.coerce.number().int().positive().optional()
});
function logInfo(message, extra = {}) {
    console.info(JSON.stringify({
        level: 'info',
        message,
        ...extra
    }));
}
function logError(message, extra = {}) {
    console.error(JSON.stringify({
        level: 'error',
        message,
        ...extra
    }));
}
function logWarn(message, extra = {}) {
    console.warn(JSON.stringify({
        level: 'warn',
        message,
        ...extra
    }));
}
function failFastIfMissingDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (typeof databaseUrl === 'string' && databaseUrl.trim().length > 0) {
        return;
    }
    console.error(JSON.stringify({
        level: 'fatal',
        message: 'his-worker bootstrap failed: DATABASE_URL is required',
        hint: 'Set DATABASE_URL in worker environment before starting the service.'
    }));
    process.exit(1);
}
function registerSystemWorkerLogs(worker) {
    worker.on('completed', (job, result) => {
        logInfo('system job completed', {
            queue: SYSTEM_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? null,
            requestId: job.data.requestId ?? null,
            result
        });
    });
    worker.on('failed', (job, error) => {
        logError('system job failed', {
            queue: SYSTEM_QUEUE_NAME,
            jobName: job?.name ?? null,
            jobId: job?.id?.toString() ?? null,
            requestId: job?.data.requestId ?? null,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    });
}
function registerHandoverWorkerLogs(worker) {
    worker.on('completed', (job, result) => {
        logInfo('handover job completed', {
            queue: HANDOVER_BUILD_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? null,
            requestId: job.data.requestId ?? null,
            handoverId: job.data.handoverId,
            result
        });
    });
    worker.on('failed', (job, error) => {
        logError('handover job failed', {
            queue: HANDOVER_BUILD_QUEUE_NAME,
            jobName: job?.name ?? null,
            jobId: job?.id?.toString() ?? null,
            requestId: job?.data.requestId ?? null,
            handoverId: job?.data.handoverId ?? null,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    });
}
function registerMedicationOverdueWorkerLogs(worker) {
    worker.on('completed', (job, result) => {
        logInfo('medication overdue job completed', {
            queue: MEDICATION_OVERDUE_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? null,
            requestId: job.data.requestId ?? null,
            accountId: job.data.accountId ?? null,
            result
        });
    });
    worker.on('failed', (job, error) => {
        logError('medication overdue job failed', {
            queue: MEDICATION_OVERDUE_QUEUE_NAME,
            jobName: job?.name ?? null,
            jobId: job?.id?.toString() ?? null,
            requestId: job?.data.requestId ?? null,
            accountId: job?.data.accountId ?? null,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    });
}
function registerProtocolPublishWorkerLogs(worker) {
    worker.on('completed', (job, result) => {
        logInfo('protocol publish job completed', {
            queue: PROTOCOL_PUBLISH_QUEUE_NAME,
            jobName: job.name,
            jobId: job.id?.toString() ?? null,
            requestId: job.data.requestId ?? null,
            accountId: job.data.accountId,
            protocolId: job.data.protocolId,
            versionId: job.data.versionId,
            result
        });
    });
    worker.on('failed', (job, error) => {
        logError('protocol publish job failed', {
            queue: PROTOCOL_PUBLISH_QUEUE_NAME,
            jobName: job?.name ?? null,
            jobId: job?.id?.toString() ?? null,
            requestId: job?.data.requestId ?? null,
            accountId: job?.data.accountId ?? null,
            protocolId: job?.data.protocolId ?? null,
            versionId: job?.data.versionId ?? null,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    });
}
async function bootstrap() {
    failFastIfMissingDatabaseUrl();
    const parsedEnv = envSchema.safeParse(process.env);
    if (!parsedEnv.success) {
        const details = parsedEnv.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment variables: ${details}`);
    }
    const env = parsedEnv.data;
    const redis = createBullMqRedis(env.REDIS_URL);
    const medicationOverdueCronLeaderLockKey = `${env.QUEUE_PREFIX}:cron:medication-overdue-scan:leader:v1`;
    const medicationOverdueCronLeaderOwner = `worker-${process.pid}-${randomUUID()}`;
    const medicationOverdueCronLeaderLockTtlMs = env.CRON_LEADER_LOCK_TTL_MS ??
        Math.max(env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS * 3, 30_000);
    const systemWorker = createSystemWorker(redis, env.QUEUE_PREFIX);
    const handoverWorker = createHandoverWorker(redis, env.QUEUE_PREFIX, {
        storageDir: env.HANDOVER_STORAGE_DIR
    });
    const medicationOverdueWorker = createMedicationOverdueWorker(redis, env.QUEUE_PREFIX);
    const protocolPublishWorker = createProtocolPublishWorker(redis, env.QUEUE_PREFIX);
    const medicationOverdueQueue = createMedicationOverdueQueue(redis, env.QUEUE_PREFIX);
    systemWorker.on('ready', () => {
        logInfo('system worker ready', {
            queue: SYSTEM_QUEUE_NAME,
            queuePrefix: env.QUEUE_PREFIX
        });
    });
    handoverWorker.on('ready', () => {
        logInfo('handover worker ready', {
            queue: HANDOVER_BUILD_QUEUE_NAME,
            queuePrefix: env.QUEUE_PREFIX,
            storageDir: env.HANDOVER_STORAGE_DIR
        });
    });
    registerSystemWorkerLogs(systemWorker);
    registerHandoverWorkerLogs(handoverWorker);
    registerMedicationOverdueWorkerLogs(medicationOverdueWorker);
    registerProtocolPublishWorkerLogs(protocolPublishWorker);
    medicationOverdueWorker.on('ready', () => {
        logInfo('medication overdue worker ready', {
            queue: MEDICATION_OVERDUE_QUEUE_NAME,
            queuePrefix: env.QUEUE_PREFIX
        });
    });
    protocolPublishWorker.on('ready', () => {
        logInfo('protocol publish worker ready', {
            queue: PROTOCOL_PUBLISH_QUEUE_NAME,
            queuePrefix: env.QUEUE_PREFIX
        });
    });
    const medicationOverdueCron = env.MEDICATION_OVERDUE_AUTO_SCAN
        ? startCron({
            name: 'medication-overdue-scan',
            intervalMs: env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS,
            runOnStart: true,
            logger: {
                info: (message, extra) => logInfo(message, extra),
                warn: (message, extra) => logWarn(message, extra)
            },
            onTick: async () => {
                const cronName = 'medication-overdue-scan';
                try {
                    await recordCronRunStart(redis, cronName);
                    const isLeader = await acquireOrRenewLeaderLock({
                        redis,
                        key: medicationOverdueCronLeaderLockKey,
                        owner: medicationOverdueCronLeaderOwner,
                        ttlMs: medicationOverdueCronLeaderLockTtlMs
                    });
                    if (!isLeader) {
                        logInfo('medication overdue cron tick skipped: not leader', {
                            lockKey: medicationOverdueCronLeaderLockKey
                        });
                        return;
                    }
                    const slotBaseMs = Math.floor(Date.now() / env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS) *
                        env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS;
                    const payload = {
                        trigger: 'scheduled',
                        graceMinutes: env.MEDICATION_OVERDUE_GRACE_MINUTES,
                        enqueuedAt: new Date(slotBaseMs).toISOString()
                    };
                    await medicationOverdueQueue.add(MEDICATION_OVERDUE_SCAN_JOB_NAME, payload, {
                        ...medicationOverdueScanJobOptions(),
                        jobId: medicationOverdueScanJobId(payload, {
                            intervalMs: env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS
                        })
                    });
                    await recordCronRunSuccess(redis, cronName);
                }
                catch (error) {
                    await recordCronRunFailure(redis, cronName, error instanceof Error ? error : String(error));
                    throw error;
                }
            }
        })
        : null;
    // Start health server
    const cronConfigs = env.MEDICATION_OVERDUE_AUTO_SCAN
        ? [{ name: 'medication-overdue-scan', intervalMs: env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS }]
        : [];
    const healthServer = startHealthServer({
        port: env.HEALTH_PORT,
        redis,
        cronConfigs
    });
    logInfo('his-worker started', {
        nodeEnv: env.NODE_ENV,
        queuePrefix: env.QUEUE_PREFIX,
        healthPort: env.HEALTH_PORT,
        queues: [
            SYSTEM_QUEUE_NAME,
            HANDOVER_BUILD_QUEUE_NAME,
            MEDICATION_OVERDUE_QUEUE_NAME,
            PROTOCOL_PUBLISH_QUEUE_NAME
        ],
        medicationOverdueAutoScan: env.MEDICATION_OVERDUE_AUTO_SCAN,
        medicationOverdueScanIntervalMs: env.MEDICATION_OVERDUE_SCAN_INTERVAL_MS,
        medicationOverdueGraceMinutes: env.MEDICATION_OVERDUE_GRACE_MINUTES,
        medicationOverdueCronLeaderLockKey,
        medicationOverdueCronLeaderLockTtlMs
    });
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;
        logInfo('his-worker shutting down', { signal });
        medicationOverdueCron?.stop();
        try {
            await healthServer.stop();
        }
        catch {
            // best-effort health server stop
        }
        try {
            await releaseLeaderLock({
                redis,
                key: medicationOverdueCronLeaderLockKey,
                owner: medicationOverdueCronLeaderOwner
            });
        }
        catch {
            // best-effort lock release on shutdown
        }
        await Promise.all([
            systemWorker.close(),
            handoverWorker.close(),
            medicationOverdueWorker.close(),
            protocolPublishWorker.close(),
            medicationOverdueQueue.close()
        ]);
        await closeBullMqRedis(redis);
        await closeDbConnection();
    };
    process.on('SIGINT', () => {
        void shutdown('SIGINT').then(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM').then(() => process.exit(0));
    });
}
void bootstrap().catch((error) => {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
    console.error(JSON.stringify({
        level: 'fatal',
        message: 'his-worker bootstrap failed',
        err
    }));
    process.exit(1);
});
//# sourceMappingURL=index.js.map