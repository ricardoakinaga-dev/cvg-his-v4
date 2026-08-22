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
}

export type TenantCommandRunner = <T>(input: TenantCommandInput<T>) => Promise<T>;

export function createTenantCommandRunner(options: {
  readonly environment: string;
  readonly unitOfWork?: TenantUnitOfWork;
}): TenantCommandRunner {
  return async <T>(input: TenantCommandInput<T>): Promise<T> => {
    // Route-specific wrappers can be used by direct route tests and by the
    // HTTP dispatcher. Once the dispatcher owns the transaction, do not try
    // to acquire a second idempotency record on the same connection.
    if (getDatabaseTransactionScope()) return input.command();

    const idempotencyKey = input.idempotencyKey ?? readIdempotencyKey(input.request);
    if (idempotencyKey && idempotencyKey.length > 255) {
      throw new ValidationError('Idempotency-Key header must contain at most 255 characters');
    }
    if (isProductionLikeEnvironment(options.environment) && !idempotencyKey) {
      throw new ValidationError('Idempotency-Key header is required for mutating commands');
    }
    if (!options.unitOfWork || !idempotencyKey) {
      return input.command();
    }

    try {
      const execution = await options.unitOfWork.execute(
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
        }
      );
      return execution.value as unknown as T;
    } catch (error) {
      if (error instanceof IdempotencyConflictError || error instanceof IdempotencyInProgressError) {
        throw new AppError(error.code, error.message, 409);
      }
      throw error;
    }
  };
}

function readIdempotencyKey(request: IncomingMessage): string | undefined {
  const value = request.headers['idempotency-key'];
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return value?.trim() || undefined;
}

function isProductionLikeEnvironment(environment: string): boolean {
  return environment === 'production'
    || environment === 'staging'
    || environment === 'prod'
    || environment === 'stage';
}
