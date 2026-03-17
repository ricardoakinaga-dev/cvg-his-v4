import type { Redis } from 'ioredis';

const ACQUIRE_OR_RENEW_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    redis.call("pexpire", KEYS[1], ARGV[2])
    return 1
  end
  local acquired = redis.call("set", KEYS[1], ARGV[1], "PX", ARGV[2], "NX")
  if acquired then
    return 1
  end
  return 0
`;

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

export async function acquireOrRenewLeaderLock(input: {
  redis: Redis;
  key: string;
  owner: string;
  ttlMs: number;
}): Promise<boolean> {
  const result = await input.redis.eval(
    ACQUIRE_OR_RENEW_SCRIPT,
    1,
    input.key,
    input.owner,
    String(input.ttlMs)
  );

  return result === 1;
}

export async function releaseLeaderLock(input: {
  redis: Redis;
  key: string;
  owner: string;
}): Promise<boolean> {
  const result = await input.redis.eval(RELEASE_SCRIPT, 1, input.key, input.owner);
  return result === 1;
}
