import type { IncomingMessage } from 'node:http';

import {
  getDatabaseTransactionScope,
  IdempotencyConflictError,
  IdempotencyInProgressError,
  type JsonValue,
  type TenantUnitOfWork
} from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

export interface TenantCommandInput<T> {
  readonly request: IncomingMessage;
  readonly idempotencyKey?: string;
  readonly accountId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
  readonly operation: string;
  readonly payload: JsonValue;
  readonly command: () => Promise<T>;
  /** Runs inside the tenant transaction before idempotency lookup or replay. */
  readonly beforeIdempotency?: () => Promise<void>;
  /** Runs after the owned transaction has rolled back so hot caches can be rehydrated. */
  readonly onRollback?: () => Promise<void>;
  /** Runs after the owned transaction has committed so hot caches reflect durable state. */
  readonly onCommit?: () => Promise<void>;
}

export type TenantCommandRunner = <T>(input: TenantCommandInput<T>) => Promise<T>;

export interface TenantTransactionMetadata {
  readonly actorUserId: string;
  readonly correlationId: string;
}

export function createTenantCommandRunner(options: {
  readonly environment: string;
  readonly unitOfWork?: TenantUnitOfWork;
  readonly transaction?: <T>(
    accountId: string,
    command: () => Promise<T>,
    metadata: TenantTransactionMetadata
  ) => Promise<T>;
}): TenantCommandRunner {
  return async <T>(input: TenantCommandInput<T>): Promise<T> => {
    // Route-specific wrappers can be used by direct route tests and by the
    // HTTP dispatcher. Once the dispatcher owns the transaction, do not try
    // to acquire a second idempotency record on the same connection.
    if (getDatabaseTransactionScope()) {
      await input.beforeIdempotency?.();
      return input.command();
    }

    const idempotencyKey = input.idempotencyKey ?? readIdempotencyKey(input.request);
    if (idempotencyKey && idempotencyKey.length > 255) {
      throw new ValidationError('Idempotency-Key header must contain at most 255 characters');
    }
    if (isProductionLikeEnvironment(options.environment) && !idempotencyKey) {
      throw new ValidationError('Idempotency-Key header is required for mutating commands');
    }
    if (!options.unitOfWork || !idempotencyKey) {
      let result: T;
      try {
        if (options.transaction) {
          result = await options.transaction(
            input.accountId,
            async () => {
              await input.beforeIdempotency?.();
              return input.command();
            },
            {
              actorUserId: input.actorUserId,
              correlationId: input.correlationId
            }
          );
        } else {
          await input.beforeIdempotency?.();
          result = await input.command();
        }
      } catch (error) {
        await runRollbackRecovery(input);
        throw error;
      }
      await runCommitRecovery(input);
      return result;
    }

    let execution: { readonly value: JsonValue; readonly replayed: boolean };
    try {
      execution = await options.unitOfWork.execute(
        {
          accountId: input.accountId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          operation: input.operation,
          idempotencyKey
        },
        input.payload,
        async () => {
          const value = await input.command();
          return (value === undefined ? null : value) as unknown as JsonValue;
        },
        input.beforeIdempotency
          ? async () => {
              await input.beforeIdempotency!();
            }
          : undefined
      );
    } catch (error) {
      await runRollbackRecovery(input);
      if (
        error instanceof IdempotencyConflictError ||
        error instanceof IdempotencyInProgressError
      ) {
        throw new AppError(error.code, error.message, 409);
      }
      throw error;
    }
    await runCommitRecovery(input);
    return execution.value as unknown as T;
  };
}

async function runRollbackRecovery<T>(input: TenantCommandInput<T>): Promise<void> {
  if (!input.onRollback) return;
  try {
    await input.onRollback();
  } catch {
    throw new AppError(
      'TENANT_COMMAND_RECOVERY_FAILED',
      'Tenant command recovery failed; privileged access is temporarily unavailable',
      503
    );
  }
}

async function runCommitRecovery<T>(input: TenantCommandInput<T>): Promise<void> {
  if (!input.onCommit) return;
  try {
    await input.onCommit();
  } catch {
    throw new AppError(
      'TENANT_COMMAND_COMMIT_RECOVERY_FAILED',
      'Tenant command committed but its authorization state could not be refreshed',
      503
    );
  }
}

function readIdempotencyKey(request: IncomingMessage): string | undefined {
  const value = request.headers['idempotency-key'];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

function isProductionLikeEnvironment(environment: string): boolean {
  return (
    environment === 'production' ||
    environment === 'staging' ||
    environment === 'prod' ||
    environment === 'stage'
  );
}
