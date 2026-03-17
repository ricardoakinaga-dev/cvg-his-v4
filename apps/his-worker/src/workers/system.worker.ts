import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';

import {
  SYSTEM_JOB_PING,
  SYSTEM_QUEUE_NAME,
  type SystemPingJobData,
  type SystemPingJobName,
  type SystemPingJobResult
} from '../queues/system.queue.js';

export function createSystemWorker(
  connection: Redis,
  prefix: string
): Worker<SystemPingJobData, SystemPingJobResult, SystemPingJobName> {
  return new Worker<SystemPingJobData, SystemPingJobResult, SystemPingJobName>(
    SYSTEM_QUEUE_NAME,
    async (job) => {
      if (job.name !== SYSTEM_JOB_PING) {
        throw new Error(`Unsupported system job name: ${job.name}`);
      }

      const result: SystemPingJobResult = {
        result: 'pong',
        ts: new Date().toISOString(),
        jobId: job.id?.toString() ?? 'unknown'
      };

      console.info(
        JSON.stringify({
          level: 'info',
          message: 'system.ping processed',
          requestId: job.data.requestId ?? null,
          jobId: result.jobId,
          ts: result.ts
        })
      );

      return result;
    },
    {
      connection,
      prefix
    }
  );
}
