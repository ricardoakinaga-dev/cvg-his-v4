/**
 * Core chaos engine: orchestrates registered experiments and tracks active chaos context.
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { Logger, LogContext } from '@cvg-his-v2/shared-logging';

export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  start: (opts?: unknown) => Promise<ExperimentResult>;
  stop: () => Promise<ExperimentStopResult>;
}

export interface ExperimentResult {
  ok: boolean;
  error?: string;
  experimentId?: string;
  startedAt?: string;
  durationMs?: number;
}

export interface ExperimentStopResult {
  ok: boolean;
  error?: string;
}

export interface ChaosConfig {
  logger?: Logger;
}

interface ActiveExperiment {
  experiment: Experiment;
  startedAt: Date;
  durationMs: number;
}

/** AsyncLocalStorage context for tracking active chaos injections */
export const chaosContext = new AsyncLocalStorage<Map<string, ActiveExperiment>>();

/**
 * Core chaos engine. Register experiments, start/stop them, and list what's active.
 */
export class ChaosEngine {
  private readonly experiments = new Map<string, Experiment>();
  private readonly active = new Map<string, ActiveExperiment>();
  private readonly config: ChaosConfig;

  constructor(config: ChaosConfig = {}) {
    this.config = config;
  }

  /**
   * Register an experiment with the engine.
   * @throws Error if an experiment with the same ID is already registered
   */
  register(experiment: Experiment): void {
    if (this.experiments.has(experiment.id)) {
      throw new Error(`Experiment "${experiment.id}" is already registered`);
    }
    this.experiments.set(experiment.id, experiment);
    this.config.logger?.debug(`Chaos experiment registered: ${experiment.id}`);
  }

  /**
   * Start an experiment by ID with optional parameters.
   */
  async start(experimentId: string, opts?: unknown): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { ok: false, error: `Experiment "${experimentId}" not found` };
    }
    if (this.active.has(experimentId)) {
      return { ok: false, error: `Experiment "${experimentId}" is already running` };
    }

    this.config.logger?.info(`Starting chaos experiment: ${experimentId}`, opts as LogContext);

    return chaosContext.run(new Map(), async () => {
      const result = await experiment.start(opts);
      if (result.ok) {
        this.active.set(experimentId, {
          experiment,
          startedAt: new Date(),
          durationMs: result.durationMs ?? 0
        });
      }
      return result;
    });
  }

  /**
   * Stop an experiment by ID.
   */
  async stop(experimentId: string): Promise<ExperimentStopResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { ok: false, error: `Experiment "${experimentId}" not found` };
    }
    if (!this.active.has(experimentId)) {
      return { ok: false, error: `Experiment "${experimentId}" is not running` };
    }

    this.config.logger?.info(`Stopping chaos experiment: ${experimentId}`);
    const result = await experiment.stop();
    if (result.ok) {
      this.active.delete(experimentId);
    }
    return result;
  }

  /**
   * List all registered experiments.
   */
  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * List all currently active experiments.
   */
  listActiveExperiments(): Array<{ id: string; name: string; startedAt: Date; durationMs: number }> {
    return Array.from(this.active.entries()).map(([id, { experiment, startedAt, durationMs }]) => ({
      id,
      name: experiment.name,
      startedAt,
      durationMs
    }));
  }

  /**
   * Returns true if a specific experiment is currently active.
   */
  isActive(experimentId: string): boolean {
    return this.active.has(experimentId);
  }

  /**
   * Get the ChaosEngine singleton instance.
   * Use this for the HTTP endpoint integration.
   */
  static getInstance(): ChaosEngine {
    if (!globalThis.__chaosEngineInstance) {
      globalThis.__chaosEngineInstance = new ChaosEngine();
    }
    return globalThis.__chaosEngineInstance;
  }
}

// Declare global singleton for instance reuse across the process
declare global {
  // eslint-disable-next-line no-var
  var __chaosEngineInstance: ChaosEngine | undefined;
}
