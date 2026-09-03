/**
 * Chaos Integration — GAP-15 R2
 *
 * Wires the existing `packages/chaos` package into the API runtime.
 * Exposes chaos experiments via HTTP endpoints and includes chaos
 * metrics in the Prometheus scrape endpoint.
 */

import type { Logger } from '@cvg-his-v2/shared-logging';

import {
  ChaosEngine,
  databaseFailureExperiment,
  redisFailureExperiment,
  networkLatencyExperiment,
  workerFailureExperiment,
  apiLatencyExperiment,
  providerFailureExperiment,
  chaosContext,
  type Experiment
} from '@cvg-his-v2/chaos';

export interface ChaosIntegrationOptions {
  readonly logger?: Logger;
  /** If true, registers all built-in experiments at startup */
  readonly registerExperiments?: boolean;
}

let chaosInstance: ChaosEngine | null = null;

/**
 * Initialize the chaos engine and optionally register built-in experiments.
 * Called once during API server startup.
 */
export function initializeChaos(options: ChaosIntegrationOptions = {}): ChaosEngine {
  if (chaosInstance) {
    options.logger?.debug('chaos engine already initialized');
    return chaosInstance;
  }

  const logger = options.logger;
  chaosInstance = new ChaosEngine({ logger });

  if (options.registerExperiments !== false) {
    const experiments: Experiment[] = [
      databaseFailureExperiment,
      redisFailureExperiment,
      networkLatencyExperiment,
      workerFailureExperiment,
      apiLatencyExperiment,
      providerFailureExperiment
    ];

    for (const experiment of experiments) {
      try {
        chaosInstance.register(experiment);
        logger?.info(`chaos experiment registered: ${experiment.id}`);
      } catch (err) {
        logger?.warn(`failed to register chaos experiment "${experiment.id}":`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }

  logger?.info('chaos engine initialized', {
    registeredExperiments: chaosInstance.listExperiments().length
  });

  return chaosInstance;
}

/**
 * Get the initialized chaos engine instance.
 * Throws if `initializeChaos` has not been called.
 */
export function getChaosEngine(): ChaosEngine {
  if (!chaosInstance) {
    throw new Error('ChaosEngine not initialized — call initializeChaos() first');
  }
  return chaosInstance;
}

/**
 * Check if the chaos engine has been initialized.
 */
export function isChaosEngineInitialized(): boolean {
  return chaosInstance !== null;
}

/**
 * Stop all active chaos experiments.
 * Useful for graceful shutdown.
 */
export async function stopAllChaosExperiments(): Promise<void> {
  if (!chaosInstance) return;

  const active = chaosInstance.listActiveExperiments();
  for (const { id } of active) {
    await chaosInstance.stop(id);
  }
}
