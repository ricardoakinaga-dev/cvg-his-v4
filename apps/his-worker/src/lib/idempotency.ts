import { randomUUID } from 'node:crypto';

import type { Redis } from 'ioredis';

export type IdempotencyLock = {
  key: string;
  token: string;
};

export const PROTOCOL_PUBLISH_LOCK_TTL_SECONDS = 10 * 60;

export function protocolPublishLockKey(versionId: string): string {
  return `protocol:publish:${versionId}:v1`;
}

export async function acquireRedisLock(
  redis: Redis,
  key: string,
  ttlSeconds: number
): Promise<IdempotencyLock | null> {
  const token = randomUUID();
  const result = await redis.set(key, token, 'EX', ttlSeconds, 'NX');

  if (result !== 'OK') {
    return null;
  }

  return {
    key,
    token
  };
}

export async function releaseRedisLock(redis: Redis, lock: IdempotencyLock): Promise<boolean> {
  const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const released = await redis.eval(releaseScript, 1, lock.key, lock.token);
  return released === 1;
}
