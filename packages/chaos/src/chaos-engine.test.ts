import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChaosEngine, chaosContext, type Experiment } from './chaos-engine.js';

function makeExperiment(
  id: string,
  start: Experiment['start'] = async () => ({ ok: true, experimentId: id }),
  stop: Experiment['stop'] = async () => ({ ok: true })
): Experiment {
  return {
    id,
    name: `Experiment ${id}`,
    description: `Synthetic ${id} experiment`,
    start,
    stop
  };
}

describe('ChaosEngine', () => {
  it('registers experiments, exposes lifecycle state and prevents duplicates', async () => {
    const stores: Array<Map<string, unknown> | undefined> = [];
    const experiment = makeExperiment('synthetic', async () => {
      stores.push(chaosContext.getStore() as Map<string, unknown> | undefined);
      return { ok: true, experimentId: 'synthetic', durationMs: 25 };
    });
    const engine = new ChaosEngine();

    engine.register(experiment);
    assert.deepEqual(engine.listExperiments(), [experiment]);
    assert.throws(() => engine.register(experiment), /already registered/);

    const started = await engine.start('synthetic');
    assert.equal(started.ok, true);
    assert.equal(started.experimentId, 'synthetic');
    assert.equal(engine.isActive('synthetic'), true);
    assert.equal(engine.listActiveExperiments()[0]?.durationMs, 25);
    assert.equal(stores[0] instanceof Map, true);

    const duplicate = await engine.start('synthetic');
    assert.deepEqual(duplicate, {
      ok: false,
      error: 'Experiment "synthetic" is already running'
    });

    assert.deepEqual(await engine.stop('synthetic'), { ok: true });
    assert.equal(engine.isActive('synthetic'), false);
    assert.deepEqual(await engine.stop('synthetic'), {
      ok: false,
      error: 'Experiment "synthetic" is not running'
    });
  });

  it('fails closed for unknown experiment ids', async () => {
    const engine = new ChaosEngine();

    assert.deepEqual(await engine.start('missing'), {
      ok: false,
      error: 'Experiment "missing" not found'
    });
    assert.deepEqual(await engine.stop('missing'), {
      ok: false,
      error: 'Experiment "missing" not found'
    });
  });

  it('does not mark a failed experiment as active', async () => {
    const engine = new ChaosEngine();
    engine.register(
      makeExperiment('failed', async () => ({ ok: false, error: 'synthetic failure' }))
    );

    assert.deepEqual(await engine.start('failed'), {
      ok: false,
      error: 'synthetic failure'
    });
    assert.equal(engine.listActiveExperiments().length, 0);
  });
});
