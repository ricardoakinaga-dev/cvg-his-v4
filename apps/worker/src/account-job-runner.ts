import type { Logger } from '@cvg-his-v2/shared-logging';

export interface WorkerAccountJob {
  readonly name: string;
  readonly run: () => Promise<void>;
}

export interface WorkerAccountJobFailure {
  readonly accountId: string;
  readonly jobName: string;
  readonly error: string;
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

/**
 * Runs account work in deterministic account/job order. A failed job is
 * observable and contained to its account/job boundary; it cannot starve the
 * remaining jobs or accounts in the same worker tick.
 */
export async function runWorkerAccounts(
  logger: Logger,
  accountIds: readonly string[],
  createJobs: (accountId: string) => readonly WorkerAccountJob[]
): Promise<readonly WorkerAccountJobFailure[]> {
  const failures: WorkerAccountJobFailure[] = [];

  for (const accountId of accountIds) {
    let jobs: readonly WorkerAccountJob[];
    try {
      jobs = createJobs(accountId);
    } catch (error) {
      failures.push(recordFailure(logger, accountId, 'account_setup', error));
      continue;
    }

    for (const job of jobs) {
      try {
        await job.run();
      } catch (error) {
        failures.push(recordFailure(logger, accountId, job.name, error));
      }
    }
  }

  return Object.freeze(failures);
}
