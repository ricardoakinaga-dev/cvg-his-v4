import type { Redis } from 'ioredis';
/**
 * Worker Health Check - Operational Monitoring

/**
 * Worker Health Check - Operational Monitoring
 *
 * Tracks last_cron_run timestamps in Redis for operational health monitoring.
 * Each cron job updates its timestamp on successful execution.
 */
export declare const WORKER_HEALTH_KEY_PREFIX = "worker:health";
export declare const WORKER_HEALTH_KEY_SEPARATOR = ":";
export type WorkerHealthKey = `${typeof WORKER_HEALTH_KEY_PREFIX}${string}`;
export type CronHealthStatus = {
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    consecutiveFailures: number;
    lastError: string | null;
};
export type WorkerHealthStatus = {
    status: 'ok' | 'degraded' | 'unhealthy';
    uptime: number;
    crons: Record<string, CronHealthStatus>;
    queues: Record<string, {
        waiting: number;
        active: number;
        failed: number;
    }>;
    checkedAt: string;
};
/**
 * Build Redis key for cron health
 */
export declare function buildCronHealthKey(cronName: string): WorkerHealthKey;
/**
 * Record cron run start
 */
export declare function recordCronRunStart(redis: Redis, cronName: string): Promise<void>;
/**
 * Record cron run success
 */
export declare function recordCronRunSuccess(redis: Redis, cronName: string): Promise<void>;
/**
 * Record cron run failure
 */
export declare function recordCronRunFailure(redis: Redis, cronName: string, error: Error | string): Promise<void>;
/**
 * Get cron health status
 */
export declare function getCronHealthStatus(redis: Redis, cronName: string): Promise<CronHealthStatus>;
/**
 * Check if cron is healthy based on expected interval
 */
export declare function isCronHealthy(status: CronHealthStatus, expectedIntervalMs: number, maxConsecutiveFailures?: number): 'ok' | 'degraded' | 'unhealthy';
/**
 * Get overall worker health status
 */
export declare function getWorkerHealthStatus(redis: Redis, cronConfigs: Array<{
    name: string;
    intervalMs: number;
}>): Promise<WorkerHealthStatus>;
//# sourceMappingURL=workerHealth.d.ts.map