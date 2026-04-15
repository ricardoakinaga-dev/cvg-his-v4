/**
 * Error fault injector.
 * Throws a configured error after a random delay.
 */

export interface ErrorFaultOptions {
  /** Error message to throw */
  readonly message: string;
  /** Error code/identifier */
  readonly code?: string;
  /** Probability of injecting error (0-1). Default: 1.0 */
  readonly probability?: number;
}

/**
 * Factory that returns a fault function. When the returned function is called,
 * it may throw an error based on configured probability.
 *
 * @example
 * const shouldFail = errorFault({ message: 'Chaos error injected', probability: 0.1 });
 * // 10% chance of throwing on each call
 */
export function errorFault(options: ErrorFaultOptions): () => void {
  const { message, code, probability = 1.0 } = options;

  return () => {
    if (Math.random() < probability) {
      const err = new Error(message);
      if (code) {
        (err as Error & { code: string }).code = code;
      }
      throw err;
    }
  };
}
