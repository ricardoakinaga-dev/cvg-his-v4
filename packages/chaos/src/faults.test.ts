import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanupAllLeaks,
  delayFault,
  errorFault,
  resourceFault,
  timeoutFault
} from './faults/index.js';

describe('chaos faults', () => {
  it('adds the configured delay and restores the original timer', () => {
    const originalSetTimeout = globalThis.setTimeout;
    const scheduledDelays: number[] = [];
    const fakeSetTimeout = ((_: (...args: unknown[]) => void, delay?: number) => {
      scheduledDelays.push(delay ?? 0);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;

    globalThis.setTimeout = fakeSetTimeout;
    try {
      const cleanup = delayFault({ minDelayMs: 7, maxDelayMs: 7, probability: 1 });
      globalThis.setTimeout(() => undefined, 3);
      assert.deepEqual(scheduledDelays, [10]);
      cleanup();
      assert.equal(globalThis.setTimeout, fakeSetTimeout);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it('does not add delay when probability is zero', () => {
    const originalSetTimeout = globalThis.setTimeout;
    const scheduledDelays: number[] = [];
    const fakeSetTimeout = ((_: (...args: unknown[]) => void, delay?: number) => {
      scheduledDelays.push(delay ?? 0);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;

    globalThis.setTimeout = fakeSetTimeout;
    try {
      const cleanup = delayFault({ minDelayMs: 7, maxDelayMs: 7, probability: 0 });
      globalThis.setTimeout(() => undefined, 3);
      assert.deepEqual(scheduledDelays, [3]);
      cleanup();
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it('throws the configured error and preserves its code', () => {
    const fail = errorFault({ message: 'synthetic chaos', code: 'CHAOS_TEST', probability: 1 });

    assert.throws(
      () => fail(),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'synthetic chaos' &&
        (error as Error & { code?: string }).code === 'CHAOS_TEST'
    );

    errorFault({ message: 'never', probability: 0 })();
  });

  it('rejects with a stable timeout code only when selected', async () => {
    await assert.rejects(
      timeoutFault(Promise.resolve('ignored'), { timeoutMs: 1, probability: 1 }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'Chaos timeout fault' &&
        (error as Error & { code?: string }).code === 'CHAOS_TIMEOUT'
    );

    assert.equal(
      await timeoutFault(Promise.resolve('kept'), { timeoutMs: 1, probability: 0 }),
      'kept'
    );
  });

  it('creates and cleans resource faults without leaving active cleanup state', () => {
    const cleanup = resourceFault({ type: 'memory', leakCount: 0 });
    cleanup();
    cleanupAllLeaks();

    const connectionCleanup = resourceFault({ type: 'connections', leakCount: 0 });
    cleanupAllLeaks();
    connectionCleanup();
  });
});
