import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS,
  createFatalRuntimeHandler,
  createRuntimeExitCodeController,
  createStartupFailureHandler
} from './fatal-runtime.js';

test('fatal worker runtime errors mark readiness failed before the shared drain', async () => {
  const events: string[] = [];
  let resolveShutdown!: () => void;
  const shutdownBlocked = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });
  let deadlineCancelled = false;

  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({
      error(message) {
        events.push(`log:${message}`);
      }
    }),
    markNotReady(event) {
      events.push(`not-ready:${event}`);
    },
    async shutdown(event) {
      events.push(`shutdown:${event}`);
      await shutdownBlocked;
    },
    markProcessFailed() {
      events.push('exit:1');
    },
    forceExit(exitCode) {
      assert.equal(deadlineCancelled, true);
      events.push(`force-exit:${exitCode}`);
    },
    scheduleDeadline() {
      return () => {
        deadlineCancelled = true;
      };
    }
  });

  const draining = handleFatalRuntimeError('uncaughtException', new Error('corrupt state'));

  assert.deepEqual(events.slice(0, 4), [
    'exit:1',
    'not-ready:uncaughtException',
    'log:uncaughtException in worker runtime',
    'shutdown:uncaughtException'
  ]);

  resolveShutdown();
  await draining;
  assert.equal(events.at(-1), 'exit:1');
  assert.equal(events.filter((entry) => entry === 'force-exit:1').length, 1);
});

test('concurrent worker fatal events share one bounded shutdown', async () => {
  const markedNotReady: string[] = [];
  let shutdownCalls = 0;
  let forceExitCalls = 0;

  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({ error() {} }),
    markNotReady(event) {
      markedNotReady.push(event);
    },
    async shutdown() {
      shutdownCalls += 1;
    },
    markProcessFailed() {},
    forceExit(exitCode) {
      assert.equal(exitCode, 1);
      forceExitCalls += 1;
    }
  });

  await Promise.all([
    handleFatalRuntimeError('unhandledRejection', 'rejected'),
    handleFatalRuntimeError('uncaughtException', new Error('thrown'))
  ]);

  assert.equal(shutdownCalls, 1);
  assert.equal(forceExitCalls, 1);
  assert.deepEqual(markedNotReady, ['unhandledRejection', 'uncaughtException']);
});

test('startup failures use the fatal handler and force exit when shutdown fails', async () => {
  const logged: string[] = [];
  const forcedExitCodes: number[] = [];
  let exitCode = 0;
  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({
      error(message) {
        logged.push(message);
      }
    }),
    markNotReady() {},
    async shutdown() {
      throw new Error('drain failed');
    },
    markProcessFailed() {
      exitCode = 1;
    },
    forceExit(value) {
      forcedExitCodes.push(value);
    }
  });
  const handleStartupFailure = createStartupFailureHandler({
    logger: () => ({
      error(message) {
        logged.push(message);
      }
    }),
    handleFatalRuntimeError
  });

  await handleStartupFailure(new Error('startup failed'));

  assert.equal(exitCode, 1);
  assert.deepEqual(forcedExitCodes, [1]);
  assert.deepEqual(logged, [
    'failed to start worker',
    'startupFailure in worker runtime',
    'worker fatal-error shutdown failed'
  ]);
});

test('a fatal worker shutdown reaches its deadline and invokes the fallback', async () => {
  const events: string[] = [];
  let scheduledDelay: number | undefined;
  let reachDeadline!: () => void;
  let deadlineCancelled = false;

  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({
      error(message) {
        events.push(`log:${message}`);
      }
    }),
    markNotReady() {},
    async shutdown() {
      events.push('shutdown');
      await new Promise<void>(() => {});
    },
    markProcessFailed() {
      events.push('failed');
    },
    onShutdownDeadline() {
      events.push('close-all-connections');
    },
    forceExit(exitCode) {
      events.push(`force-exit:${exitCode}`);
    },
    scheduleDeadline(callback, delayMs) {
      reachDeadline = callback;
      scheduledDelay = delayMs;
      return () => {
        deadlineCancelled = true;
      };
    }
  });

  const draining = handleFatalRuntimeError('unhandledRejection', 'rejected');
  reachDeadline();
  await draining;

  assert.equal(scheduledDelay, DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS);
  assert.equal(deadlineCancelled, true);
  assert.deepEqual(events.slice(-5), [
    'log:worker fatal-error shutdown deadline exceeded',
    'close-all-connections',
    'failed',
    'force-exit:1',
    'failed'
  ]);
});

test('a signal completion cannot restore exit zero after a fatal worker event', async () => {
  let exitCode: number | undefined;
  const runtimeExitCode = createRuntimeExitCodeController((value) => {
    exitCode = value;
  });
  const forcedExitCodes: number[] = [];
  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({ error() {} }),
    markNotReady() {},
    async shutdown() {},
    markProcessFailed: runtimeExitCode.markProcessFailed,
    forceExit(value) {
      forcedExitCodes.push(value);
    }
  });

  await handleFatalRuntimeError('uncaughtException', new Error('fatal'));
  runtimeExitCode.completeSignalShutdown();

  assert.equal(exitCode, 1);
  assert.deepEqual(forcedExitCodes, [1]);
});
