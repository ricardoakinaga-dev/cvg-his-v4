/**
 * Timeout fault injector.
 * Simulates request timeouts by rejecting a promise after a short delay.
 */

export interface TimeoutFaultOptions {
  /** Timeout in milliseconds (short timeout to simulate failure) */
  readonly timeoutMs: number;
  /** Probability of timing out (0-1). Default: 1.0 */
  readonly probability?: number;
}

/**
 * Wraps a promise so it may reject with a timeout error.
 * Returns a cleanup function.
 *
 * @example
 * const wrap = timeoutFault({ timeoutMs: 1, probability: 0.2 });
 * const result = await wrap(someAsyncOperation()); // 20% chance of timeout
 * cleanup();
 */
export function timeoutFault<T>(
  promise: Promise<T>,
  options: TimeoutFaultOptions
): Promise<T> {
  const { timeoutMs, probability = 1.0 } = options;

  if (Math.random() >= probability) {
    return promise;
  }

  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(Object.assign(new Error('Chaos timeout fault'), { code: 'CHAOS_TIMEOUT' }));
    }, timeoutMs);
  });
}

/**
 * Returns a wrapper function that can wrap any promise-returning function
 * to potentially time out.
 */
export function createTimeoutFaultWrapper(
  options: TimeoutFaultOptions
): <T>(promise: Promise<T>) => Promise<T> {
  return <T>(promise: Promise<T>): Promise<T> => timeoutFault(promise, options);
}
