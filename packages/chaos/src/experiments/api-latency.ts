/**
 * API latency spike experiment.
 * Injects extra latency into HTTP response handling.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { delayFault } from '../faults/index.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const API_LATENCY_ID = 'api-latency';

export interface ApiLatencyOptions {
  /** Minimum extra latency to inject (ms) */
  readonly minDelayMs: number;
  /** Maximum extra latency to inject (ms) */
  readonly maxDelayMs: number;
  /** Probability of injecting latency per request (0-1) */
  readonly probability?: number;
  /** Total experiment duration in ms */
  readonly durationMs: number;
}

let cleanup: (() => void) | null = null;
let expirationTimer: ReturnType<typeof setTimeout> | null = null;
let active = false;

async function start(options: ApiLatencyOptions): Promise<ExperimentResult> {
  if (active) {
    return { ok: false, error: 'Experiment already running' };
  }
  const { minDelayMs, maxDelayMs, probability = 1.0, durationMs } = options;
  active = true;

  chaosExperimentActive.labels(API_LATENCY_ID).set(1);
  chaosFaultInjectedTotal.labels(API_LATENCY_ID, 'http_latency').inc();

  cleanup = delayFault({ minDelayMs, maxDelayMs, probability });

  expirationTimer = setTimeout(() => {
    void stop();
  }, durationMs);
  expirationTimer.unref?.();

  return {
    ok: true,
    experimentId: API_LATENCY_ID,
    startedAt: new Date().toISOString(),
    durationMs
  };
}

async function stop(): Promise<ExperimentStopResult> {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  active = false;
  chaosExperimentActive.labels(API_LATENCY_ID).set(0);
  return { ok: true };
}

export const apiLatencyExperiment: Experiment = {
  id: API_LATENCY_ID,
  name: 'API Latency Spike',
  description: 'Injects extra HTTP response latency to simulate degraded performance',
  start: (opts?: unknown) => start(opts as ApiLatencyOptions),
  stop
};
