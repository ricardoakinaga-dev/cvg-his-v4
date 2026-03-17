import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const HANDOVER_BUILD_QUEUE_NAME = 'handover-build';
export const HANDOVER_BUILD_JOB_NAME = 'build';

export type HandoverBuildJobName = typeof HANDOVER_BUILD_JOB_NAME;

export type HandoverBuildJobData = {
  handoverId: string;
  accountId: string;
  wardId: string;
  requestedByUserId: string;
  requestId: string;
};

export type HandoverBuildJobResult = {
  status: 'ready' | 'idempotent_ready';
  handoverId: string;
  documentId: string | null;
  storageKey: string | null;
};

export function handoverBuildJobId(payload: HandoverBuildJobData): string {
  return `handover-build-${payload.accountId}-${payload.handoverId}`;
}

export function handoverBuildJobOptions(): JobsOptions {
  return {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 500,
    removeOnFail: 1000
  };
}

export function createHandoverBuildQueue(
  connection: Redis,
  prefix: string
): Queue<
  HandoverBuildJobData,
  HandoverBuildJobResult,
  HandoverBuildJobName
> {
  return new Queue<
    HandoverBuildJobData,
    HandoverBuildJobResult,
    HandoverBuildJobName
  >(HANDOVER_BUILD_QUEUE_NAME, {
    connection,
    prefix
  });
}
