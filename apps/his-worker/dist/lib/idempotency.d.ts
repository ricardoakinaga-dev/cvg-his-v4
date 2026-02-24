import type { Redis } from 'ioredis';
export type IdempotencyLock = {
    key: string;
    token: string;
};
export declare const PROTOCOL_PUBLISH_LOCK_TTL_SECONDS: number;
export declare function protocolPublishLockKey(versionId: string): string;
export declare function acquireRedisLock(redis: Redis, key: string, ttlSeconds: number): Promise<IdempotencyLock | null>;
export declare function releaseRedisLock(redis: Redis, lock: IdempotencyLock): Promise<boolean>;
//# sourceMappingURL=idempotency.d.ts.map