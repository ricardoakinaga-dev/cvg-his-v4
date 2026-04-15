/**
 * Network latency experiment.
 * Injects variable delays into EventBus and webhook delivery.
 */
import type { Experiment, ExperimentResult, ExperimentStopResult } from '../chaos-engine.js';
import { delayFault } from '../faults/index.js';
import { chaosFaultInjectedTotal, chaosExperimentActive } from '../metrics.js';

export const NETWORK_LATENCY_ID = 'network-latency';

export interface NetworkLatencyOptions {
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly durationMs: number;
}

let cleanup: (() => void) | null = null;
let active = false;

async function start(options: NetworkLatencyOptions): Promise<ExperimentResult> {
  if (active) {
    return { ok: false, error: 'Experiment already running' };
  }
  const { minDelayMs, maxDelayMs, durationMs } = options;
  active = true;

  chaosExperimentActive.labels(NETWORK_LATENCY_ID).set(1);
  chaosFaultInjectedTotal.labels(NETWORK_LATENCY_ID, 'network_delay').inc();

  cleanup = delayFault({ minDelayMs, maxDelayMs, probability: 1.0 });

  setTimeout(() => {
    stop();
  }, durationMs);

  return {
    ok: true,
    experimentId: NETWORK_LATENCY_ID,
    startedAt: new Date().toISOString(),
    durationMs
  };
}

async function stop(): Promise<ExperimentStopResult> {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  active = false;
  chaosExperimentActive.labels(NETWORK_LATENCY_ID).set(0);
  return { ok: true };
}

export const networkLatencyExperiment: Experiment = {
  id: NETWORK_LATENCY_ID,
  name: 'Network Latency',
  description: 'Injects variable delays into async operations simulating network partition',
  start: (opts?: unknown) => start(opts as NetworkLatencyOptions),
  stop
};
