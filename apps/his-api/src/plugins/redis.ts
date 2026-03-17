import { Redis } from 'ioredis';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    void promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    checkRedisHealth: () => Promise<'ok' | 'fail'>;
  }
}

const redisPluginImpl: FastifyPluginAsync = async (app) => {
  const redis = new Redis(app.env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    retryStrategy: () => null
  });

  redis.on('error', (error: unknown) => {
    app.log.warn({ err: error }, 'redis client error');
  });

  app.decorate('redis', redis);

  app.decorate('checkRedisHealth', async () => {
    try {
      if (redis.status === 'wait') {
        await withTimeout(redis.connect(), 1000);
      }
      const response = await withTimeout(redis.ping(), 1000);
      return response === 'PONG' ? 'ok' : 'fail';
    } catch (error) {
      app.log.warn({ err: error }, 'redis health check failed');
      return 'fail';
    }
  });

  app.addHook('onClose', async () => {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
  });
};

export const redisPlugin = fp(redisPluginImpl, {
  name: 'redis-plugin'
});
