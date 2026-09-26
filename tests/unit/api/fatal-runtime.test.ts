import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS,
  createFatalRuntimeHandler,
  createRuntimeExitCodeController,
  createStartupFailureHandler
} from '../../../apps/api/src/fatal-runtime.ts';

function createDeps(overrides: Partial<Parameters<typeof createFatalRuntimeHandler>[0]> = {}) {
  const logger = { error: vi.fn() };
  const markNotReady = vi.fn();
  const shutdown = vi.fn(async () => undefined);
  const markProcessFailed = vi.fn();
  const forceExit = vi.fn();
  return {
    deps: {
      logger: () => logger,
      markNotReady,
      shutdown,
      markProcessFailed,
      forceExit,
      ...overrides
    },
    logger,
    markNotReady,
    shutdown,
    markProcessFailed,
    forceExit
  };
}

describe('createRuntimeExitCodeController', () => {
  it('keeps exit code zero until a terminal failure is observed', () => {
    const setExitCode = vi.fn();
    const controller = createRuntimeExitCodeController(setExitCode);
    controller.completeSignalShutdown();
    expect(setExitCode).toHaveBeenLastCalledWith(0);
    controller.markProcessFailed();
    expect(setExitCode).toHaveBeenLastCalledWith(1);
    controller.completeSignalShutdown();
    expect(setExitCode).toHaveBeenLastCalledWith(1);
  });
});

describe('createFatalRuntimeHandler', () => {
  it('drains shutdown and force-exits once for repeated fatal events', async () => {
    const { deps, logger, markNotReady, shutdown, markProcessFailed, forceExit } = createDeps();
    const handler = createFatalRuntimeHandler(deps);

    await handler('uncaughtException', new Error('boom'));
    await handler('unhandledRejection', 'string-error');

    expect(markProcessFailed).toHaveBeenCalled();
    expect(markNotReady).toHaveBeenCalledWith('uncaughtException');
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(forceExit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith('uncaughtException in api runtime', {
      error: 'boom'
    });
    expect(logger.error).toHaveBeenCalledWith('unhandledRejection in api runtime', {
      error: 'string-error'
    });
  });

  it('logs shutdown failures and still force-exits', async () => {
    const { deps, logger, shutdown, forceExit } = createDeps({
      shutdown: vi.fn(async () => {
        throw new Error('drain failed');
      })
    });
    shutdown.mockRejectedValue(new Error('drain failed'));
    const handler = createFatalRuntimeHandler(deps);

    await handler('startupFailure', new Error('start'));

    expect(logger.error).toHaveBeenCalledWith('api fatal-error shutdown failed', {
      event: 'startupFailure',
      error: 'drain failed'
    });
    expect(forceExit).toHaveBeenCalledWith(1);
  });

  it('invokes the deadline path when shutdown hangs', async () => {
    const onShutdownDeadline = vi.fn();
    const scheduleDeadline = vi.fn((callback: () => void) => {
      callback();
      return () => undefined;
    });
    const { deps, logger, forceExit } = createDeps({
      shutdown: () => new Promise(() => undefined),
      onShutdownDeadline,
      scheduleDeadline,
      shutdownDeadlineMs: 1
    });
    const handler = createFatalRuntimeHandler(deps);

    await handler('uncaughtException', new Error('hang'));

    expect(logger.error).toHaveBeenCalledWith('api fatal-error shutdown deadline exceeded', {
      event: 'uncaughtException',
      deadlineMs: 1
    });
    expect(onShutdownDeadline).toHaveBeenCalledWith('uncaughtException');
    expect(forceExit).toHaveBeenCalledWith(1);
    expect(DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS).toBe(10_000);
  });

  it('swallows deadline fallback errors', async () => {
    const onShutdownDeadline = vi.fn(() => {
      throw new Error('fallback failed');
    });
    const scheduleDeadline = vi.fn((callback: () => void) => {
      callback();
      return () => undefined;
    });
    const { deps, logger } = createDeps({
      shutdown: () => new Promise(() => undefined),
      onShutdownDeadline,
      scheduleDeadline
    });
    const handler = createFatalRuntimeHandler(deps);

    await handler('uncaughtException', new Error('hang'));

    expect(logger.error).toHaveBeenCalledWith(
      'api fatal-error shutdown deadline fallback failed',
      expect.objectContaining({ error: 'fallback failed' })
    );
  });
});

describe('createStartupFailureHandler', () => {
  it('routes startup errors through the fatal handler', async () => {
    const handleFatalRuntimeError = vi.fn(async () => undefined);
    const logger = { error: vi.fn() };
    const handler = createStartupFailureHandler({
      logger: () => logger,
      handleFatalRuntimeError
    });

    await handler(new Error('bind failed'));

    expect(logger.error).toHaveBeenCalledWith('failed to start api server', {
      error: 'bind failed'
    });
    expect(handleFatalRuntimeError).toHaveBeenCalledWith('startupFailure', expect.any(Error));
  });
});
