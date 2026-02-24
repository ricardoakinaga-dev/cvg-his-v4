import { describe, expect, it } from 'vitest';
import { LOCK_BUSY_ERROR_CODE, LOCK_NOT_ACQUIRED_ERROR_CODE, RetryableLockNotAcquiredError, isRetryableLockNotAcquiredError, throwRetryableLockNotAcquiredError } from './lockRetry.js';
describe('lock miss retry behavior', () => {
    it('represents lock miss as retriable error (worker should fail/retry, not complete)', () => {
        const error = new RetryableLockNotAcquiredError({
            queue: 'handover-build',
            jobId: 'job-123',
            accountId: 'acc-123',
            entityType: 'handover',
            entityId: 'handover-123',
            lockKey: 'handover:build:handover-123:v1'
        });
        expect(isRetryableLockNotAcquiredError(error)).toBe(true);
        expect(error.code).toBe(LOCK_BUSY_ERROR_CODE);
        expect(LOCK_NOT_ACQUIRED_ERROR_CODE).toBe(LOCK_BUSY_ERROR_CODE);
        expect(error.message).toContain('jobId=job-123');
        expect(error.message).toContain('accountId=acc-123');
        expect(error.message).toContain('lockKey=handover:build:handover-123:v1');
    });
    it('throws on lock miss instead of returning completion payload', () => {
        expect(() => throwRetryableLockNotAcquiredError({
            queue: 'protocol-publish',
            jobId: 'job-456',
            accountId: 'acc-456',
            entityType: 'protocol_version',
            entityId: 'version-456',
            lockKey: 'protocol:publish:version-456:v1'
        })).toThrow(RetryableLockNotAcquiredError);
    });
});
//# sourceMappingURL=lockRetry.test.js.map