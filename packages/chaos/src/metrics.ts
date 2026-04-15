/**
 * Prometheus metrics for chaos engineering experiments.
 * Exposed at /metrics endpoint when integrated with the API.
 */
import { register, Gauge, Counter, Histogram } from 'prom-client';

/** Gauge: 1 if experiment is currently active, 0 otherwise */
export const chaosExperimentActive = new Gauge({
  name: 'chaos_experiment_active',
  help: 'Whether a chaos experiment is currently active (1=active, 0=inactive)',
  labelNames: ['experiment'],
  registers: [register]
});

/** Counter: total number of faults injected per experiment and fault type */
export const chaosFaultInjectedTotal = new Counter({
  name: 'chaos_fault_injected_total',
  help: 'Total number of faults injected by chaos experiments',
  labelNames: ['experiment', 'fault_type'],
  registers: [register]
});

/** Histogram: duration of chaos experiments in seconds */
export const chaosExperimentDurationSeconds = new Histogram({
  name: 'chaos_experiment_duration_seconds',
  help: 'Duration of chaos experiments in seconds',
  labelNames: ['experiment'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register]
});

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
