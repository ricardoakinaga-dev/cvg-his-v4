import type { Logger } from '@cvg-his-v2/shared-logging';
import { MAX_WORKER_ACCOUNT_CONCURRENCY } from '@cvg-his-v2/shared-config';

export interface WorkerAccountJob {
  readonly name: string;
  readonly run: () => Promise<void>;
}

export interface WorkerAccountJobFailure {
  readonly accountId: string;
  readonly jobName: string;
  readonly error: string;
}

export interface WorkerAccountRunOptions {
  /** Maximum number of account lanes that may run at once. */
  readonly concurrency?: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recordFailure(
  logger: Logger,
  accountId: string,
  jobName: string,
  error: unknown
): WorkerAccountJobFailure {
  const failure = Object.freeze({ accountId, jobName, error: errorMessage(error) });
  logger.error('worker account job failed; continuing with remaining work', failure);
  return failure;
}

function resolveWorkerConcurrency(concurrency: number | undefined): number {
  // Keep direct helper callers on the historical sequential behavior. The
  // production entrypoint passes the validated configured concurrency.
  const resolved = concurrency ?? 1;
  if (
    !Number.isSafeInteger(resolved) ||
    resolved < 1 ||
    resolved > MAX_WORKER_ACCOUNT_CONCURRENCY
  ) {
    throw new RangeError(
      `Worker account concurrency must be an integer between 1 and ${MAX_WORKER_ACCOUNT_CONCURRENCY}`
    );
  }
  return resolved;
}

/**
 * Maps account-scoped work while retaining input order and limiting the
 * number of active account operations.  Every item is visited; concurrency is
 * the only bound, so a large account catalog is not silently truncated.
 */
export async function mapWorkerAccounts<T, R>(
  values: readonly T[],
  mapper: (value: T, index: number) => Promise<R>,
  options: WorkerAccountRunOptions = {}
): Promise<readonly R[]> {
  const concurrency = resolveWorkerConcurrency(options.concurrency);
  if (values.length === 0) return Object.freeze([]);

  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const runLane = async (): Promise<void> => {
    while (true) {
      const index = nextIndex++;
      if (index >= values.length) return;
      results[index] = await mapper(values[index] as T, index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runLane())
  );
  return Object.freeze(results);
}

/**
 * Runs each account's jobs in deterministic job order while allowing a
 * bounded number of independent account lanes. A failed job is observable and
 * contained to its account/job boundary; it cannot starve the remaining jobs
 * or accounts in the same worker tick.
 */
export async function runWorkerAccounts(
  logger: Logger,
  accountIds: readonly string[],
  createJobs: (accountId: string) => readonly WorkerAccountJob[],
  options: WorkerAccountRunOptions = {}
): Promise<readonly WorkerAccountJobFailure[]> {
  const accountFailures = await mapWorkerAccounts(
    accountIds,
    async (accountId) => {
      const failures: WorkerAccountJobFailure[] = [];
      let jobs: readonly WorkerAccountJob[];
      try {
        jobs = createJobs(accountId);
      } catch (error) {
        failures.push(recordFailure(logger, accountId, 'account_setup', error));
        return failures;
      }

      for (const job of jobs) {
        try {
          await job.run();
        } catch (error) {
          failures.push(recordFailure(logger, accountId, job.name, error));
        }
      }
      return failures;
    },
    options
  );

  return Object.freeze(accountFailures.flat());
}
