export interface WorkerLoopWakeController {
  wait(delayMs: number): Promise<void>;
  wake(): void;
}

/**
 * An interruptible interval used by the worker loop. A signal wakes the
 * pending wait immediately; the normal timer still controls the steady-state
 * polling cadence.
 */
export function createWorkerLoopWakeController(): WorkerLoopWakeController {
  type PendingWait = {
    readonly timeout: ReturnType<typeof setTimeout>;
    readonly resolve: () => void;
  };
  let pendingWait: PendingWait | undefined;

  const settlePendingWait = (wait: PendingWait): void => {
    clearTimeout(wait.timeout);
    if (pendingWait === wait) pendingWait = undefined;
    wait.resolve();
  };

  return {
    wait(delayMs: number): Promise<void> {
      if (pendingWait) settlePendingWait(pendingWait);

      return new Promise<void>((resolve) => {
        const wait = {
          timeout: setTimeout(() => {
            if (pendingWait === wait) pendingWait = undefined;
            resolve();
          }, delayMs),
          resolve
        } satisfies PendingWait;
        wait.timeout.unref();
        pendingWait = wait;
      });
    },
    wake(): void {
      if (pendingWait) settlePendingWait(pendingWait);
    }
  };
}
