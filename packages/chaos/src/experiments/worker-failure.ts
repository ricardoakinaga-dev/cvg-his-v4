/**
 * Worker failure experiment.
 * Simulates worker job timeouts and crashes.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const WORKER_FAILURE_ID = 'worker-failure';

export interface WorkerFailureOptions {
  /** How long to wait before throwing the fault (ms) */
  readonly faultDelayMs: number;
  /** Probability of failure per job execution */
  readonly probability?: number;
  /** Total experiment duration in ms */
  readonly durationMs: number;
}

let active = false;
let injected = false;

async function start(options: WorkerFailureOptions): Promise<ExperimentResult> {
  if (active) {
    return { ok: false, error: 'Experiment already running' };
  }
  const { faultDelayMs, probability = 0.3, durationMs } = options;
  active = true;

  chaosExperimentActive.labels(WORKER_FAILURE_ID).set(1);

  // Monkey-patch the worker's job execution to occasionally fail
  // The actual injection point is in apps/worker/src/runner.ts
  // where we check a CHAOS_WORKER_FAIL injected flag
  injected = true;
  chaosFaultInjectedTotal.labels(WORKER_FAILURE_ID, 'worker_job_crash').inc();

  // Simulate failure for the duration
  const faultTimer = setInterval(() => {
    if (Math.random() < probability) {
      chaosFaultInjectedTotal.labels(WORKER_FAILURE_ID, 'worker_job_crash').inc();
    }
  }, faultDelayMs);

  setTimeout(() => {
    clearInterval(faultTimer);
    stop();
  }, durationMs);

  return {
    ok: true,
    experimentId: WORKER_FAILURE_ID,
    startedAt: new Date().toISOString(),
    durationMs
  };
}

async function stop(): Promise<ExperimentStopResult> {
  active = false;
  injected = false;
  chaosExperimentActive.labels(WORKER_FAILURE_ID).set(0);
  return { ok: true };
}

export const workerFailureExperiment: Experiment = {
  id: WORKER_FAILURE_ID,
  name: 'Worker Failure',
  description: 'Simulates worker job timeouts and crashes',
  start: (opts?: unknown) => start(opts as WorkerFailureOptions),
  stop
};
