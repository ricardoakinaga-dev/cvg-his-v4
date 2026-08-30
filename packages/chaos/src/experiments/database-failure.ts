/**
 * Database failure experiment.
 * Signals PostgreSQL unavailability; the API must fail closed and must not
 * switch an already database-backed runtime to non-durable persistence.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const DATABASE_FAILURE_ID = 'database-failure';

interface DatabaseFailureOptions {
  /** Total experiment duration in ms */
  readonly durationMs: number;
}

let injected = false;

async function start(opts?: unknown): Promise<ExperimentResult> {
  if (injected) {
    return { ok: false, error: 'Experiment already running' };
  }
  const options = opts as DatabaseFailureOptions;
  const durationMs = options?.durationMs ?? 30_000;
  injected = true;
  chaosExperimentActive.labels(DATABASE_FAILURE_ID).set(1);
  chaosFaultInjectedTotal.labels(DATABASE_FAILURE_ID, 'database_unavailable').inc();

  setTimeout(() => {
    stop();
  }, durationMs);

  return {
    ok: true,
    experimentId: DATABASE_FAILURE_ID,
    startedAt: new Date().toISOString(),
    durationMs
  };
}

async function stop(): Promise<ExperimentStopResult> {
  injected = false;
  chaosExperimentActive.labels(DATABASE_FAILURE_ID).set(0);
  return { ok: true };
}

export const databaseFailureExperiment: Experiment = {
  id: DATABASE_FAILURE_ID,
  name: 'Database Failure',
  description: 'Simulates PostgreSQL unavailability; runtime persistence becomes unavailable',
  start,
  stop
};
