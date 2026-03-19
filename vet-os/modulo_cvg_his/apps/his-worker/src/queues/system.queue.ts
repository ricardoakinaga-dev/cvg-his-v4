import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const SYSTEM_QUEUE_NAME = 'system';
export const SYSTEM_QUEUE_PREFIX_DEFAULT = 'cvg-his';
export const SYSTEM_JOB_PING = 'ping';

export type SystemPingJobName = typeof SYSTEM_JOB_PING;

export type SystemPingJobData = {
  requestId?: string;
  enqueuedAt: string;
};

export type SystemPingJobResult = {
  result: 'pong';
  ts: string;
  jobId: string;
};

export function pingJobOptions(): JobsOptions {
  return {
    removeOnComplete: 500,
    removeOnFail: 1000
  };
}

export function createSystemQueue(
  connection: Redis,
  prefix: string
): Queue<SystemPingJobData, SystemPingJobResult, SystemPingJobName> {
  const effectivePrefix =
    typeof prefix === 'string' && prefix.trim().length > 0 ? prefix.trim() : SYSTEM_QUEUE_PREFIX_DEFAULT;

  return new Queue<SystemPingJobData, SystemPingJobResult, SystemPingJobName>(SYSTEM_QUEUE_NAME, {
    connection,
    prefix: effectivePrefix
  });
}
