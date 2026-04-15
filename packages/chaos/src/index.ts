/**
 * @cvg-his-v2/chaos — Lightweight in-process chaos engineering library.
 *
 * Usage:
 * ```typescript
 * import { ChaosEngine, databaseFailureExperiment } from '@cvg-his-v2/chaos';
 *
 * const chaos = ChaosEngine.getInstance();
 * chaos.register(databaseFailureExperiment);
 *
 * // Start via HTTP or directly:
 * await chaos.start('database-failure', { durationMs: 30_000 });
 * ```
 */
export {
  ChaosEngine,
  chaosContext,
  type Experiment,
  type ExperimentResult,
  type ExperimentStopResult,
  type ChaosConfig
} from './chaos-engine.js';

export {
  delayFault,
  errorFault,
  timeoutFault,
  resourceFault
} from './faults/index.js';

export {
  databaseFailureExperiment,
  DATABASE_FAILURE_ID,
  redisFailureExperiment,
  REDIS_FAILURE_ID,
  networkLatencyExperiment,
  NETWORK_LATENCY_ID,
  type NetworkLatencyOptions,
  workerFailureExperiment,
  WORKER_FAILURE_ID,
  type WorkerFailureOptions,
  apiLatencyExperiment,
  API_LATENCY_ID,
  type ApiLatencyOptions
} from './experiments/index.js';

export {
  chaosMetrics,
  chaosExperimentActive,
  chaosFaultInjectedTotal,
  chaosExperimentDurationSeconds,
  CHAOS_EXPERIMENT_START,
  CHAOS_EXPERIMENT_STOP
} from './metrics.js';
