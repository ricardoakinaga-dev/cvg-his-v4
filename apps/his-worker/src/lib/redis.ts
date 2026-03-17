import { Redis } from 'ioredis';

export function createBullMqRedis(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

export async function closeBullMqRedis(redis: Redis): Promise<void> {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}
