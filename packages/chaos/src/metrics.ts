/**
 * Prometheus metrics for chaos engineering experiments.
 * Exposed at /metrics endpoint when integrated with the API.
 */
import { register, Gauge, Counter, Histogram } from 'prom-client';

function getOrCreateGauge(name: string, help: string, labelNames: string[]): Gauge<string> {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Gauge) {
    return existing as Gauge<string>;
  }

  return new Gauge({
    name,
    help,
    labelNames,
    registers: [register]
  });
}

function getOrCreateCounter(name: string, help: string, labelNames: string[]): Counter<string> {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Counter) {
    return existing as Counter<string>;
  }

  return new Counter({
    name,
    help,
    labelNames,
    registers: [register]
  });
}

function getOrCreateHistogram(
  name: string,
  help: string,
  labelNames: string[],
  buckets: number[]
): Histogram<string> {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Histogram) {
    return existing as Histogram<string>;
  }

  return new Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [register]
  });
}

/** Gauge: 1 if experiment is currently active, 0 otherwise */
export const chaosExperimentActive = getOrCreateGauge(
  'chaos_experiment_active',
  'Whether a chaos experiment is currently active (1=active, 0=inactive)',
  ['experiment']
);

/** Counter: total number of faults injected per experiment and fault type */
export const chaosFaultInjectedTotal = getOrCreateCounter(
  'chaos_fault_injected_total',
  'Total number of faults injected by chaos experiments',
  ['experiment', 'fault_type']
);

/** Histogram: duration of chaos experiments in seconds */
export const chaosExperimentDurationSeconds = getOrCreateHistogram(
  'chaos_experiment_duration_seconds',
  'Duration of chaos experiments in seconds',
  ['experiment'],
  [1, 5, 10, 30, 60, 120, 300, 600]
);

/**
 * All chaos metrics registered with Prometheus.
 * Integrate by importing this object and calling register.collect()
 * at your /metrics endpoint.
 */
export const chaosMetrics = {
  experimentActive: chaosExperimentActive,
  faultInjectedTotal: chaosFaultInjectedTotal,
  experimentDuration: chaosExperimentDurationSeconds,
  register
};

/** Event emitted (as a custom metric update) when an experiment starts */
export const CHAOS_EXPERIMENT_START = 'chaos:experiment:start';

/** Event emitted when an experiment stops */
export const CHAOS_EXPERIMENT_STOP = 'chaos:experiment:stop';
