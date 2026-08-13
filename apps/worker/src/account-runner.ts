import type { Pool } from 'pg';

import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import {
  runWithTenantContext,
  withTenantQuery
} from '@cvg-his-v2/tenant-context';

import { loadWorkerAccountConfig } from './account-config.js';
import type { WorkerTickContext } from './runner.js';

export type WorkerAccountOperationName =
  | 'notifications'
  | 'eventBus'
  | 'scheduledReports';

export interface WorkerAccountTickContext extends WorkerTickContext {
  readonly accountId: AccountId;
  readonly runAsUserId: UserId;
}

export interface WorkerAccountOperations {
  readonly notifications: (context: WorkerAccountTickContext) => Promise<void>;
  readonly eventBus: (context: WorkerAccountTickContext) => Promise<void>;
  readonly scheduledReports: (context: WorkerAccountTickContext) => Promise<void>;
}

export type TenantTransactionRunner = (operation: () => Promise<void>) => Promise<void>;

export interface RunWorkerAccountsOptions {
  readonly accountIds: readonly string[];
  readonly baseContext: Omit<WorkerTickContext, 'correlationId'>;
  readonly createCorrelationId: (accountId: string) => string;
  readonly resolveRunAsUserId: (accountId: string) => string;
  readonly transaction: TenantTransactionRunner;
  readonly operations: WorkerAccountOperations;
}

export interface WorkerAccountRunResult {
  readonly accountId: string;
  readonly correlationId: string;
}

export async function assertWorkerAccountsAreActive(
  database: Pick<Pool, 'query'>,
  accountIds: readonly string[]
): Promise<void> {
  const results = await Promise.all(
    accountIds.map(async (accountId) => {
      const result = await database.query<{ active: boolean }>(
        'SELECT app.is_active_account_id($1::uuid) AS active',
        [accountId]
      );
      return Object.freeze({ accountId, active: result.rows[0]?.active === true });
    })
  );
  const inactiveAccountIds = results
    .filter((result) => !result.active)
    .map((result) => result.accountId);

  if (inactiveAccountIds.length > 0) {
    throw new Error(
      `WORKER_ACCOUNT_IDS contains ${inactiveAccountIds.length} unknown or inactive account(s): ${inactiveAccountIds.join(', ')}`
    );
  }
}

interface NamedOperation {
  readonly name: WorkerAccountOperationName;
  readonly run: () => Promise<void>;
}

export function createPostgresTenantTransactionRunner(pool: Pool): TenantTransactionRunner {
  return (operation) => withTenantQuery(pool, async () => operation());
}

async function settleSequentially<T, TResult>(
  values: readonly T[],
  execute: (value: T) => Promise<TResult>
): Promise<readonly PromiseSettledResult<TResult>[]> {
  const [current, ...remaining] = values;
  if (current === undefined) return Object.freeze([]);

  let result: PromiseSettledResult<TResult>;
  try {
    result = { status: 'fulfilled', value: await execute(current) };
  } catch (reason) {
    result = { status: 'rejected', reason };
  }

  const remainingResults = await settleSequentially(remaining, execute);
  return Object.freeze([result, ...remainingResults]);
}

function operationFailure(
  accountId: string,
  operationName: WorkerAccountOperationName,
  reason: unknown
): Error {
  const detail = reason instanceof Error ? reason.message : String(reason);
  return new Error(
    `Worker operation ${operationName} failed for account ${accountId}: ${detail}`,
    { cause: reason }
  );
}

async function runWorkerAccount(
  accountId: string,
  options: RunWorkerAccountsOptions
): Promise<WorkerAccountRunResult> {
  const correlationId = options.createCorrelationId(accountId);
  const context: WorkerAccountTickContext = Object.freeze({
    ...options.baseContext,
    correlationId,
    accountId: accountId as AccountId,
    runAsUserId: options.resolveRunAsUserId(accountId) as UserId
  });

  return runWithTenantContext(
    {
      tenantId: accountId,
      accountId,
      correlationId
    },
    async () => {
      const operations: readonly NamedOperation[] = Object.freeze([
        Object.freeze({
          name: 'notifications',
          run: () => options.operations.notifications(context)
        }),
        Object.freeze({
          name: 'eventBus',
          run: () => options.operations.eventBus(context)
        }),
        Object.freeze({
          name: 'scheduledReports',
          run: () => options.operations.scheduledReports(context)
        })
      ]);

      const outcomes = await settleSequentially(operations, async (operation) => {
        try {
          await options.transaction(operation.run);
        } catch (error) {
          throw operationFailure(accountId, operation.name, error);
        }
      });
      const failures = outcomes.flatMap((outcome) =>
        outcome.status === 'rejected' ? [outcome.reason] : []
      );

      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          `Worker account ${accountId} failed in ${failures.length} operation(s)`
        );
      }

      return Object.freeze({ accountId, correlationId });
    }
  );
}

export async function runWorkerAccounts(
  options: RunWorkerAccountsOptions
): Promise<readonly WorkerAccountRunResult[]> {
  const validatedAccountIds = loadWorkerAccountConfig(
    { WORKER_ACCOUNT_IDS: options.accountIds.join(',') || undefined },
    options.baseContext.environment
  ).accountIds;
  const outcomes = await settleSequentially(validatedAccountIds, (accountId) =>
    runWorkerAccount(accountId, options)
  );

  const failures = outcomes.flatMap((outcome) =>
    outcome.status === 'rejected' ? [outcome.reason] : []
  );
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `Worker account batch failed for ${failures.length} account(s)`
    );
  }

  return Object.freeze(
    outcomes.flatMap((outcome) =>
      outcome.status === 'fulfilled' ? [outcome.value] : []
    )
  );
}
