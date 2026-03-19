import type { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { requirePermission } from '../../middlewares/requirePermission.js';

const SYSTEM_QUEUE_NAME = 'system';
const SYSTEM_JOB_PING = 'ping';

type SystemPingJobData = {
  requestId?: string;
  enqueuedAt: string;
};

type SystemPingJobResult = {
  result: 'pong';
  ts: string;
  jobId: string;
};

export const systemRoutes: FastifyPluginAsync = async (app) => {
  const queueConnection = new Redis(app.env.REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  });

  queueConnection.on('error', (error: unknown) => {
    app.log.warn({ err: error }, 'system queue redis error');
  });

  const systemQueue = new Queue<SystemPingJobData, SystemPingJobResult, typeof SYSTEM_JOB_PING>(
    SYSTEM_QUEUE_NAME,
    {
      connection: queueConnection,
      prefix: app.env.QUEUE_PREFIX
    }
  );

  app.addHook('onClose', async () => {
    await systemQueue.close();
    try {
      await queueConnection.quit();
    } catch {
      queueConnection.disconnect();
    }
  });

  app.post(
    '/system/ping-job',
    {
      preHandler: requirePermission('system.admin.test')
    },
    async (request) => {
      const job = await systemQueue.add(
        SYSTEM_JOB_PING,
        {
          requestId: request.requestContext.requestId,
          enqueuedAt: new Date().toISOString()
        },
        {
          removeOnComplete: 500,
          removeOnFail: 1000
        }
      );

      return {
        ok: true,
        queue: SYSTEM_QUEUE_NAME,
        jobName: SYSTEM_JOB_PING,
        jobId: job.id?.toString() ?? null,
        requestId: request.requestContext.requestId
      };
    }
  );
};
