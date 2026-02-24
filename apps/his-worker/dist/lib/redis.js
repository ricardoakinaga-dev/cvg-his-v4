import { Redis } from 'ioredis';
export function createBullMqRedis(redisUrl) {
    return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    });
}
export async function closeBullMqRedis(redis) {
    try {
        await redis.quit();
    }
    catch {
        redis.disconnect();
    }
}
//# sourceMappingURL=redis.js.map