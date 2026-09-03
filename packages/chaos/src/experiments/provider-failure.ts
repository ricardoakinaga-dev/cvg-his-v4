/**
 * External provider failure experiment.
 * Signals that required third-party providers are unavailable so readiness
 * and operational drills can fail closed without contacting a real vendor.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const PROVIDER_FAILURE_ID = 'provider-failure';

interface ProviderFailureOptions {
  /** Total experiment duration in ms */
  readonly durationMs: number;
}

let injected = false;
let expirationTimer: ReturnType<typeof setTimeout> | null = null;

async function start(opts?: unknown): Promise<ExperimentResult> {
  if (injected) {
    return { ok: false, error: 'Experiment already running' };
  }
  const options = opts as ProviderFailureOptions;
  const durationMs = options?.durationMs ?? 30_000;
  injected = true;
  chaosExperimentActive.labels(PROVIDER_FAILURE_ID).set(1);
  chaosFaultInjectedTotal.labels(PROVIDER_FAILURE_ID, 'external_provider_unavailable').inc();

  expirationTimer = setTimeout(() => {
    void stop();
  }, durationMs);
  expirationTimer.unref?.();

  return {
    ok: true,
    experimentId: PROVIDER_FAILURE_ID,
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
  chaosExperimentActive.labels(PROVIDER_FAILURE_ID).set(0);
  return { ok: true };
}

export const providerFailureExperiment: Experiment = {
  id: PROVIDER_FAILURE_ID,
  name: 'External Provider Failure',
  description:
    'Simulates required payment, fiscal, laboratory or messaging provider unavailability',
  start,
  stop
};
