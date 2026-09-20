export type FatalRuntimeEvent = 'uncaughtException' | 'unhandledRejection' | 'startupFailure';

export const DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS = 10_000;

/** Keep the terminal process escape hatch outside the entrypoint source. */
export function forceExitProcess(exitCode: number): never {
  return process.exit(exitCode);
}

export interface FatalRuntimeLogger {
  error(message: string, fields: Record<string, unknown>): void;
}

export interface FatalRuntimeHandlerDependencies {
  logger: () => FatalRuntimeLogger;
  markNotReady: (event: FatalRuntimeEvent) => void;
  shutdown: (event: FatalRuntimeEvent) => Promise<void>;
  markProcessFailed: () => void;
  forceExit: (exitCode: number) => void;
  onShutdownDeadline?: (event: FatalRuntimeEvent) => void;
  shutdownDeadlineMs?: number;
  scheduleDeadline?: (callback: () => void, delayMs: number) => () => void;
}

export type FatalRuntimeHandler = (event: FatalRuntimeEvent, error: unknown) => Promise<void>;

export interface StartupFailureHandlerDependencies {
  logger: () => FatalRuntimeLogger;
  handleFatalRuntimeError: FatalRuntimeHandler;
}

export interface RuntimeExitCodeController {
  markProcessFailed(): void;
  completeSignalShutdown(): void;
}

/**
 * Owns the monotonic process-exit invariant: once a terminal failure has been
 * observed, no later successful signal drain may restore exit code zero.
 */
export function createRuntimeExitCodeController(
  setExitCode: (exitCode: number) => void
): RuntimeExitCodeController {
  let processFailed = false;

  return {
    markProcessFailed() {
      processFailed = true;
      setExitCode(1);
    },
    completeSignalShutdown() {
      setExitCode(processFailed ? 1 : 0);
    }
  };
}

function scheduleDeadline(callback: () => void, delayMs: number): () => void {
  const timeout = setTimeout(callback, delayMs);
  timeout.unref();
  return () => clearTimeout(timeout);
}

/**
 * Converts an otherwise process-corrupting runtime error into one fail-closed
 * drain. The non-zero exit code and readiness transition happen synchronously;
 * shutdown remains asynchronous so in-flight requests and telemetry can drain,
 * then the fatal path terminates even if unrelated runtime handles remain open.
 */
export function createFatalRuntimeHandler(
  deps: FatalRuntimeHandlerDependencies
): FatalRuntimeHandler {
  let shutdownPromise: Promise<void> | undefined;

  return (event: FatalRuntimeEvent, error: unknown): Promise<void> => {
    deps.markProcessFailed();
    deps.markNotReady(event);
    deps.logger().error(`${event} in api runtime`, {
      error: error instanceof Error ? error.message : String(error)
    });

    if (!shutdownPromise) {
      const deadlineMs = deps.shutdownDeadlineMs ?? DEFAULT_FATAL_SHUTDOWN_DEADLINE_MS;
      const schedule = deps.scheduleDeadline ?? scheduleDeadline;
      let cancelDeadline!: () => void;
      let deadlineCancelled = false;
      const cancelShutdownDeadline = () => {
        if (deadlineCancelled) return;
        deadlineCancelled = true;
        cancelDeadline();
      };
      const deadline = new Promise<'deadline'>((resolve) => {
        cancelDeadline = schedule(() => resolve('deadline'), deadlineMs);
      });
      const shutdown = deps.shutdown(event).then(
        () => 'shutdown' as const,
        (shutdownError: unknown) => {
          deps.logger().error('api fatal-error shutdown failed', {
            event,
            error: shutdownError instanceof Error ? shutdownError.message : String(shutdownError)
          });
          return 'shutdown' as const;
        }
      );

      shutdownPromise = Promise.race([shutdown, deadline])
        .then((outcome) => {
          // Clear the deadline before force-exiting so an injected forceExit
          // that returns in tests cannot leave a live timer behind.
          cancelShutdownDeadline();
          if (outcome === 'deadline') {
            deps.logger().error('api fatal-error shutdown deadline exceeded', {
              event,
              deadlineMs
            });
            try {
              deps.onShutdownDeadline?.(event);
            } catch (deadlineError: unknown) {
              deps.logger().error('api fatal-error shutdown deadline fallback failed', {
                event,
                error:
                  deadlineError instanceof Error ? deadlineError.message : String(deadlineError)
              });
            }
          }

          // A fatal runtime event is terminal even when its drain succeeds:
          // lingering handles must not keep a process-corrupted container alive.
          deps.markProcessFailed();
          deps.forceExit(1);
        })
        .finally(() => {
          cancelShutdownDeadline();
          // Reassert the terminal state even if another completion raced with
          // the fatal drain while its promise was settling.
          deps.markProcessFailed();
        });
    }

    return shutdownPromise;
  };
}

/** Routes every rejected startup through the same bounded terminal drain. */
export function createStartupFailureHandler(deps: StartupFailureHandlerDependencies) {
  return (error: unknown): Promise<void> => {
    deps.logger().error('failed to start api server', {
      error: error instanceof Error ? error.message : String(error)
    });
    return deps.handleFatalRuntimeError('startupFailure', error);
  };
}
