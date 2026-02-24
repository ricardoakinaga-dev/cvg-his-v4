import type { Redis } from 'ioredis';
export declare function acquireOrRenewLeaderLock(input: {
    redis: Redis;
    key: string;
    owner: string;
    ttlMs: number;
}): Promise<boolean>;
export declare function releaseLeaderLock(input: {
    redis: Redis;
    key: string;
    owner: string;
}): Promise<boolean>;
//# sourceMappingURL=leaderLock.d.ts.map