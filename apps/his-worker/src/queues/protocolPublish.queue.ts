import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const PROTOCOL_PUBLISH_QUEUE_NAME = 'protocol-publish';
export const PROTOCOL_PUBLISH_JOB_NAME = 'publish';

export type ProtocolPublishJobName = typeof PROTOCOL_PUBLISH_JOB_NAME;

export type ProtocolPublishJobData = {
  accountId: string;
  protocolId: string;
  versionId: string;
  requestedByUserId: string;
  requestId: string;
};

export type ProtocolPublishJobResult = {
  status: 'published' | 'idempotent_published' | 'failed';
  protocolId: string;
  versionId: string;
  snapshotId: string | null;
  snapshotHash: string | null;
  buildError: string | null;
};

export function protocolPublishJobId(payload: ProtocolPublishJobData): string {
  return `protocol-publish-${payload.accountId}-${payload.protocolId}-${payload.versionId}`;
}

export function protocolPublishJobOptions(): JobsOptions {
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

export function createProtocolPublishQueue(
  connection: Redis,
  prefix: string
): Queue<
  ProtocolPublishJobData,
  ProtocolPublishJobResult,
  ProtocolPublishJobName
> {
  return new Queue<
    ProtocolPublishJobData,
    ProtocolPublishJobResult,
    ProtocolPublishJobName
  >(PROTOCOL_PUBLISH_QUEUE_NAME, {
    connection,
    prefix
  });
}
