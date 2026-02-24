export type LockMissContext = {
    queue: string;
    jobId: string;
    accountId: string;
    entityType: 'handover' | 'protocol_version';
    entityId: string;
    lockKey: string;
};
export declare const LOCK_BUSY_ERROR_CODE = "LOCK_BUSY";
export declare const LOCK_NOT_ACQUIRED_ERROR_CODE = "LOCK_BUSY";
export declare class RetryableLockNotAcquiredError extends Error {
    readonly code: typeof LOCK_BUSY_ERROR_CODE;
    readonly context: LockMissContext;
    constructor(context: LockMissContext);
}
export declare function isRetryableLockNotAcquiredError(error: unknown): error is RetryableLockNotAcquiredError;
export declare function throwRetryableLockNotAcquiredError(context: LockMissContext): never;
//# sourceMappingURL=lockRetry.d.ts.map