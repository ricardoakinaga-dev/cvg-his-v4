import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  apiLatencyExperiment,
  databaseFailureExperiment,
  networkLatencyExperiment,
  providerFailureExperiment,
  redisFailureExperiment,
  workerFailureExperiment
} from './experiments/index.js';
import { chaosMetrics } from './metrics.js';

describe('built-in chaos experiments', () => {
  it('starts and stops every built-in experiment without external dependencies', async () => {
    const experiments = [
      {
        experiment: databaseFailureExperiment,
        options: { durationMs: 10_000 }
      },
      {
        experiment: redisFailureExperiment,
        options: { durationMs: 10_000 }
      },
      {
        experiment: providerFailureExperiment,
        options: { durationMs: 10_000 }
      },
      {
        experiment: networkLatencyExperiment,
        options: { minDelayMs: 0, maxDelayMs: 0, durationMs: 10_000 }
      },
      {
        experiment: apiLatencyExperiment,
        options: { minDelayMs: 0, maxDelayMs: 0, durationMs: 10_000 }
      },
      {
        experiment: workerFailureExperiment,
        options: { faultDelayMs: 10_000, probability: 0, durationMs: 10_000 }
      }
    ];

    for (const { experiment, options } of experiments) {
      const started = await experiment.start(options);
      assert.equal(started.ok, true, `${experiment.id} should start`);
      assert.equal(started.experimentId, experiment.id);
      assert.equal((await experiment.start(options)).ok, false);
      assert.deepEqual(await experiment.stop(), { ok: true });
    }
  });

  it('automatically stops a timed experiment', async () => {
    const started = await databaseFailureExperiment.start({ durationMs: 5 });
    assert.equal(started.ok, true);

    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    const restarted = await databaseFailureExperiment.start({ durationMs: 10_000 });
    assert.equal(restarted.ok, true);
    await databaseFailureExperiment.stop();
  });

  it('publishes the expected metric families', async () => {
    const metrics = await chaosMetrics.register.metrics();
    assert.match(metrics, /chaos_experiment_active/);
    assert.match(metrics, /chaos_fault_injected_total/);
    assert.match(metrics, /chaos_experiment_duration_seconds/);
  });
});
