import { Redis } from 'ioredis';
export declare function createBullMqRedis(redisUrl: string): Redis;
export declare function closeBullMqRedis(redis: Redis): Promise<void>;
//# sourceMappingURL=redis.d.ts.map