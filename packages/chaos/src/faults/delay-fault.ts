/**
 * Delay fault injector.
 * Adds configurable latency to async operations.
 */

export interface DelayFaultOptions {
  /** Minimum delay in milliseconds */
  readonly minDelayMs: number;
  /** Maximum delay in milliseconds */
  readonly maxDelayMs: number;
  /** Probability of injecting delay (0-1). Default: 1.0 */
  readonly probability?: number;
}

/**
 * Injects a random delay into an async operation.
 * Returns a cleanup function that restores normal behavior.
 *
 * @example
 * const cleanup = delayFault({ minDelayMs: 100, maxDelayMs: 500 });
 * await someAsyncOperation(); // may take 100-500ms longer
 * cleanup();
 */
export function delayFault(options: DelayFaultOptions): () => void {
  const { minDelayMs, maxDelayMs, probability = 1.0 } = options;
  const originalSetTimeout = globalThis.setTimeout;

  const handler = (callback: () => void, ms: number) => {
    if (Math.random() < probability) {
      const extra = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
      return originalSetTimeout(callback, ms + extra);
    }
    return originalSetTimeout(callback, ms);
  };

  // Monkey-patch setTimeout for async delays
  // @ts-expect-error — monkey-patching built-in for fault injection
  globalThis.setTimeout = handler;

  return () => {
    globalThis.setTimeout = originalSetTimeout;
  };
}
