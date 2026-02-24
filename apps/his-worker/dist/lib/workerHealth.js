/**
 * Worker Health Check - Operational Monitoring

/**
 * Worker Health Check - Operational Monitoring
 *
 * Tracks last_cron_run timestamps in Redis for operational health monitoring.
 * Each cron job updates its timestamp on successful execution.
 */
export const WORKER_HEALTH_KEY_PREFIX = 'worker:health';
export const WORKER_HEALTH_KEY_SEPARATOR = ':';
/**
 * Build Redis key for cron health
 */
export function buildCronHealthKey(cronName) {
    return `${WORKER_HEALTH_KEY_PREFIX}${WORKER_HEALTH_KEY_SEPARATOR}cron${WORKER_HEALTH_KEY_SEPARATOR}${cronName}`;
}
/**
 * Record cron run start
 */
export async function recordCronRunStart(redis, cronName) {
    const key = buildCronHealthKey(cronName);
    const now = new Date().toISOString();
    await redis.hset(key, {
        lastRunAt: now,
        updatedAt: now
    });
}
/**
 * Record cron run success
 */
export async function recordCronRunSuccess(redis, cronName) {
    const key = buildCronHealthKey(cronName);
    const now = new Date().toISOString();
    await redis.hset(key, {
        lastSuccessAt: now,
        consecutiveFailures: '0',
        lastError: '',
        updatedAt: now
    });
}
/**
 * Record cron run failure
 */
export async function recordCronRunFailure(redis, cronName, error) {
    const key = buildCronHealthKey(cronName);
    const now = new Date().toISOString();
    const errorMessage = typeof error === 'string' ? error : error.message;
    // Increment consecutive failures
    const current = await redis.hget(key, 'consecutiveFailures');
    const consecutiveFailures = parseInt(current ?? '0', 10) + 1;
    await redis.hset(key, {
        lastFailureAt: now,
        consecutiveFailures: consecutiveFailures.toString(),
        lastError: errorMessage,
        updatedAt: now
    });
}
/**
 * Get cron health status
 */
export async function getCronHealthStatus(redis, cronName) {
    const key = buildCronHealthKey(cronName);
    const data = await redis.hgetall(key);
    return {
        lastRunAt: data.lastRunAt ?? null,
        lastSuccessAt: data.lastSuccessAt ?? null,
        lastFailureAt: data.lastFailureAt ?? null,
        consecutiveFailures: parseInt(data.consecutiveFailures ?? '0', 10),
        lastError: data.lastError ?? null
    };
}
/**
 * Check if cron is healthy based on expected interval
 */
export function isCronHealthy(status, expectedIntervalMs, maxConsecutiveFailures = 3) {
    // Unhealthy: too many consecutive failures
    if (status.consecutiveFailures >= maxConsecutiveFailures) {
        return 'unhealthy';
    }
    // No runs yet - degraded
    if (!status.lastRunAt) {
        return 'degraded';
    }
    const lastRun = new Date(status.lastRunAt).getTime();
    const now = Date.now();
    const elapsed = now - lastRun;
    // Unhealthy: last run was more than 3x the expected interval
    if (elapsed > expectedIntervalMs * 3) {
        return 'unhealthy';
    }
    // Degraded: last run was more than 2x the expected interval
    if (elapsed > expectedIntervalMs * 2) {
        return 'degraded';
    }
    // Degraded: has recent failures but still running
    if (status.consecutiveFailures > 0) {
        return 'degraded';
    }
    return 'ok';
}
/**
 * Get overall worker health status
 */
export async function getWorkerHealthStatus(redis, cronConfigs) {
    const checkedAt = new Date().toISOString();
    const crons = {};
    let worstStatus = 'ok';
    for (const config of cronConfigs) {
        const status = await getCronHealthStatus(redis, config.name);
        crons[config.name] = status;
        const health = isCronHealthy(status, config.intervalMs);
        if (health === 'unhealthy') {
            worstStatus = 'unhealthy';
        }
        else if (health === 'degraded' && worstStatus !== 'unhealthy') {
            worstStatus = 'degraded';
        }
    }
    return {
        status: worstStatus,
        uptime: process.uptime(),
        crons,
        queues: {}, // Populated separately if needed
        checkedAt
    };
}
//# sourceMappingURL=workerHealth.js.map