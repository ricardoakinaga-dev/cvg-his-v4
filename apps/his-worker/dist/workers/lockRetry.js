export const LOCK_BUSY_ERROR_CODE = 'LOCK_BUSY';
// Backward-compatible alias.
export const LOCK_NOT_ACQUIRED_ERROR_CODE = LOCK_BUSY_ERROR_CODE;
export class RetryableLockNotAcquiredError extends Error {
    code;
    context;
    constructor(context) {
        super(`Lock busy for ${context.entityType}:${context.entityId} (accountId=${context.accountId}, jobId=${context.jobId}, queue=${context.queue}, lockKey=${context.lockKey})`);
        this.name = 'RetryableLockNotAcquiredError';
        this.code = LOCK_BUSY_ERROR_CODE;
        this.context = context;
    }
}
export function isRetryableLockNotAcquiredError(error) {
    return error instanceof RetryableLockNotAcquiredError;
}
export function throwRetryableLockNotAcquiredError(context) {
    throw new RetryableLockNotAcquiredError(context);
}
//# sourceMappingURL=lockRetry.js.map