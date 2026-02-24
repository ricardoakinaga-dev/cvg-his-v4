import type { Redis } from 'ioredis';

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
  queues: Record<string, { waiting: number; active: number; failed: number }>;
  checkedAt: string;
};

/**
 * Build Redis key for cron health
 */
export function buildCronHealthKey(cronName: string): WorkerHealthKey {
  return `${WORKER_HEALTH_KEY_PREFIX}${WORKER_HEALTH_KEY_SEPARATOR}cron${WORKER_HEALTH_KEY_SEPARATOR}${cronName}`;
}

/**
 * Record cron run start
 */
export async function recordCronRunStart(
  redis: Redis,
  cronName: string
): Promise<void> {
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
export async function recordCronRunSuccess(
  redis: Redis,
  cronName: string
): Promise<void> {
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
export async function recordCronRunFailure(
  redis: Redis,
  cronName: string,
  error: Error | string
): Promise<void> {
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
export async function getCronHealthStatus(
  redis: Redis,
  cronName: string
): Promise<CronHealthStatus> {
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
export function isCronHealthy(
  status: CronHealthStatus,
  expectedIntervalMs: number,
  maxConsecutiveFailures = 3
): 'ok' | 'degraded' | 'unhealthy' {
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
export async function getWorkerHealthStatus(
  redis: Redis,
  cronConfigs: Array<{ name: string; intervalMs: number }>
): Promise<WorkerHealthStatus> {
  const checkedAt = new Date().toISOString();
  const crons: Record<string, CronHealthStatus> = {};
  let worstStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';

  for (const config of cronConfigs) {
    const status = await getCronHealthStatus(redis, config.name);
    crons[config.name] = status;

    const health = isCronHealthy(status, config.intervalMs);
    if (health === 'unhealthy') {
      worstStatus = 'unhealthy';
    } else if (health === 'degraded' && worstStatus !== 'unhealthy') {
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
