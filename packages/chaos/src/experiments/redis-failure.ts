/**
 * Redis failure experiment.
 * Simulates Redis unavailability; distributed rate-limited requests fail closed.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const REDIS_FAILURE_ID = 'redis-failure';

interface RedisFailureOptions {
  /** Total experiment duration in ms */
  readonly durationMs: number;
}

let injected = false;
let expirationTimer: ReturnType<typeof setTimeout> | null = null;

async function start(opts?: unknown): Promise<ExperimentResult> {
  if (injected) {
    return { ok: false, error: 'Experiment already running' };
  }
  const options = opts as RedisFailureOptions;
  const durationMs = options?.durationMs ?? 30_000;
  injected = true;
  chaosExperimentActive.labels(REDIS_FAILURE_ID).set(1);
  chaosFaultInjectedTotal.labels(REDIS_FAILURE_ID, 'redis_unavailable').inc();

  expirationTimer = setTimeout(() => {
    void stop();
  }, durationMs);
  expirationTimer.unref?.();

  return {
    ok: true,
    experimentId: REDIS_FAILURE_ID,
    startedAt: new Date().toISOString(),
    durationMs
  };
}

async function stop(): Promise<ExperimentStopResult> {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
  injected = false;
  chaosExperimentActive.labels(REDIS_FAILURE_ID).set(0);
  return { ok: true };
}

export const redisFailureExperiment: Experiment = {
  id: REDIS_FAILURE_ID,
  name: 'Redis Failure',
  description: 'Simulates Redis unavailability causing the distributed rate limiter to fail closed',
  start,
  stop
};
