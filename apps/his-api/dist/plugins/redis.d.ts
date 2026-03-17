import { Redis } from 'ioredis';
import type { FastifyPluginAsync } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis;
        checkRedisHealth: () => Promise<'ok' | 'fail'>;
    }
}
export declare const redisPlugin: FastifyPluginAsync;
//# sourceMappingURL=redis.d.ts.map