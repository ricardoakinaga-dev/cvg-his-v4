import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS,
  createFatalRuntimeHandler,
  createRuntimeExitCodeController,
  createStartupFailureHandler
} from './fatal-runtime.js';

test('fatal runtime errors fail readiness and exit status before draining', async () => {
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
      const exitCode = 1;
      events.push(`exit:${exitCode}`);
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

  assert.deepEqual(events.slice(0, 3), [
    'exit:1',
    'not-ready:uncaughtException',
    'log:uncaughtException in api runtime'
  ]);
  assert.equal(events[3], 'shutdown:uncaughtException');

  resolveShutdown();
  await draining;
  assert.equal(events.at(-1), 'exit:1');
  assert.equal(deadlineCancelled, true);
  assert.equal(events.filter((entry) => entry === 'force-exit:1').length, 1);
});

test('concurrent fatal events share one shutdown and preserve a non-zero exit', async () => {
  const markedNotReady: string[] = [];
  const exitCodes: number[] = [];
  const logged: string[] = [];
  let shutdownCalls = 0;
  let forceExitCalls = 0;
  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({
      error(message) {
        logged.push(message);
      }
    }),
    markNotReady(event) {
      markedNotReady.push(event);
    },
    async shutdown() {
      shutdownCalls += 1;
    },
    markProcessFailed() {
      exitCodes.push(1);
    },
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
  assert.deepEqual(exitCodes, [1, 1, 1, 1]);
  assert.equal(logged.length, 2);
});

test('a rejected startup with failed shutdown still forces bounded termination', async () => {
  const logged: string[] = [];
  let exitCode = 0;
  const forcedExitCodes: number[] = [];
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
    'failed to start api server',
    'startupFailure in api runtime',
    'api fatal-error shutdown failed'
  ]);
});

test('a signal completed after a fatal drain cannot restore exit code zero', async () => {
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

test('a normal signal completion remains successful without entering the fatal exit path', () => {
  let exitCode: number | undefined;
  const runtimeExitCode = createRuntimeExitCodeController((value) => {
    exitCode = value;
  });

  runtimeExitCode.completeSignalShutdown();

  assert.equal(exitCode, 0);
});

test('a rejected startup with blocked shutdown reaches its deadline and force-exits', async () => {
  const events: string[] = [];
  let scheduledDelay: number | undefined;
  let reachDeadline!: () => void;
  let deadlineCancelled = false;
  const shutdownBlocked = new Promise<void>(() => {});
  const handleFatalRuntimeError = createFatalRuntimeHandler({
    logger: () => ({
      error(message) {
        events.push(`log:${message}`);
      }
    }),
    markNotReady() {},
    async shutdown() {
      events.push('shutdown');
      await shutdownBlocked;
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
  const handleStartupFailure = createStartupFailureHandler({
    logger: () => ({
      error(message) {
        events.push(`log:${message}`);
      }
    }),
    handleFatalRuntimeError
  });

  const draining = handleStartupFailure(new Error('startup failed'));
  reachDeadline();
  await draining;

  assert.equal(scheduledDelay, DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS);
  assert.equal(deadlineCancelled, true);
  assert.deepEqual(events.slice(-5), [
    'log:api fatal-error shutdown deadline exceeded',
    'close-all-connections',
    'failed',
    'force-exit:1',
    'failed'
  ]);
});
