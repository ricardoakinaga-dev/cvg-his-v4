import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkerLoopWakeController } from './runtime-lifecycle.js';

test('worker loop wake resolves a pending interval immediately', async () => {
  const controller = createWorkerLoopWakeController();
  let resolved = false;
  const waiting = controller.wait(60_000).then(() => {
    resolved = true;
  });

  controller.wake();
  await waiting;

  assert.equal(resolved, true);
});

test('worker loop wake is harmless when no interval is pending', () => {
  const controller = createWorkerLoopWakeController();

  assert.doesNotThrow(() => controller.wake());
});

test('replacing a pending interval settles the previous waiter', async () => {
  const controller = createWorkerLoopWakeController();
  let previousResolved = false;
  const previous = controller.wait(60_000).then(() => {
    previousResolved = true;
  });

  const current = controller.wait(60_000);
  await previous;
  assert.equal(previousResolved, true);

  controller.wake();
  await current;
});
