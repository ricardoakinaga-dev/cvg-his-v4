export type LockMissContext = {
  queue: string;
  jobId: string;
  accountId: string;
  entityType: 'handover' | 'protocol_version';
  entityId: string;
  lockKey: string;
};

export const LOCK_BUSY_ERROR_CODE = 'LOCK_BUSY';
// Backward-compatible alias.
export const LOCK_NOT_ACQUIRED_ERROR_CODE = LOCK_BUSY_ERROR_CODE;

export class RetryableLockNotAcquiredError extends Error {
  readonly code: typeof LOCK_BUSY_ERROR_CODE;
  readonly context: LockMissContext;

  constructor(context: LockMissContext) {
    super(
      `Lock busy for ${context.entityType}:${context.entityId} (accountId=${context.accountId}, jobId=${context.jobId}, queue=${context.queue}, lockKey=${context.lockKey})`
    );
    this.name = 'RetryableLockNotAcquiredError';
    this.code = LOCK_BUSY_ERROR_CODE;
    this.context = context;
  }
}

export function isRetryableLockNotAcquiredError(
  error: unknown
): error is RetryableLockNotAcquiredError {
  return error instanceof RetryableLockNotAcquiredError;
}

export function throwRetryableLockNotAcquiredError(context: LockMissContext): never {
  throw new RetryableLockNotAcquiredError(context);
}
