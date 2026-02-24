import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { createApiQueues, MEDICATION_OVERDUE_QUEUE_NAME } from '../../lib/queues.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createAlertsService } from './service.js';

const listAlertsQuerySchema = z.object({
  stayId: z.string().uuid().optional(),
  type: z.enum(['medication_delay', 'dose_refused_needs_review']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

const enqueueScanBodySchema = z.object({
  graceMinutes: z.coerce.number().int().positive().max(1440).optional()
});

const alertParamsSchema = z.object({
  alertId: z.string().uuid()
});

const acknowledgeBodySchema = z.object({
  notes: z.string().optional()
});

const resolveBodySchema = z.object({
  notes: z.string().optional()
});

export const alertsRoutes: FastifyPluginAsync = async (app) => {
  const queues = createApiQueues({
    redisUrl: app.env.REDIS_URL,
    prefix: app.env.QUEUE_PREFIX,
    logger: app.log
  });

  app.addHook('onClose', async () => {
    await queues.close();
  });

  app.get(
    '/',
    {
      preHandler: requirePermission('alerts.read')
    },
    async (request) => {
      const query = listAlertsQuerySchema.parse(request.query);
      const service = createAlertsService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );

  app.post(
    '/scan',
    {
      preHandler: requirePermission('system.admin.test')
    },
    async (request) => {
      const body = enqueueScanBodySchema.parse(request.body ?? {});
      const service = createAlertsService(
        { db: app.db, requestContext: request.requestContext },
        {
          enqueueMedicationOverdueScan: queues.enqueueMedicationOverdueScan
        }
      );
      const result = await service.enqueueOverdueScan(body);

      return {
        queue: MEDICATION_OVERDUE_QUEUE_NAME,
        jobId: result.jobId
      };
    }
  );

  /**
   * POST /alerts/:alertId/acknowledge
   * Acknowledge an alert - confirms that a clinician has seen the alert
   */
  app.post(
    '/:alertId/acknowledge',
    {
      preHandler: requirePermission('alerts.write')
    },
    async (request, reply) => {
      const params = alertParamsSchema.parse(request.params);
      const body = acknowledgeBodySchema.parse(request.body ?? {});
      const service = createAlertsService({ db: app.db, requestContext: request.requestContext });
      
      const result = await service.acknowledge(params.alertId, body.notes);
      
      if (!result) {
        return reply.status(404).send({ 
          message: 'Alert not found',
          code: 'ALERT_NOT_FOUND'
        });
      }

      return reply.send(result);
    }
  );

  /**
   * POST /alerts/:alertId/resolve
   * Resolve an alert - marks the alert as resolved after action taken
   */
  app.post(
    '/:alertId/resolve',
    {
      preHandler: requirePermission('alerts.write')
    },
    async (request, reply) => {
      const params = alertParamsSchema.parse(request.params);
      const body = resolveBodySchema.parse(request.body ?? {});
      const service = createAlertsService({ db: app.db, requestContext: request.requestContext });
      
      const result = await service.resolve(params.alertId, body.notes);
      
      if (!result) {
        return reply.status(404).send({ 
          message: 'Alert not found',
          code: 'ALERT_NOT_FOUND'
        });
      }

      return reply.send(result);
    }
  );

  /**
   * POST /alerts/batch/acknowledge
   * Acknowledge multiple alerts at once
   */
  app.post(
    '/batch/acknowledge',
    {
      preHandler: requirePermission('alerts.write')
    },
    async (request) => {
      const body = z.object({
        alertIds: z.array(z.string().uuid()).min(1).max(50),
        notes: z.string().optional()
      }).parse(request.body ?? {});
      
      const service = createAlertsService({ db: app.db, requestContext: request.requestContext });
      const results = await service.acknowledgeMany(body.alertIds, body.notes);
      
      return {
        acknowledged: results.acknowledged,
        notFound: results.notFound,
        alreadyAcknowledged: results.alreadyAcknowledged
      };
    }
  );

  /**
   * POST /alerts/batch/resolve
   * Resolve multiple alerts at once
   */
  app.post(
    '/batch/resolve',
    {
      preHandler: requirePermission('alerts.write')
    },
    async (request) => {
      const body = z.object({
        alertIds: z.array(z.string().uuid()).min(1).max(50),
        notes: z.string().optional()
      }).parse(request.body ?? {});
      
      const service = createAlertsService({ db: app.db, requestContext: request.requestContext });
      const results = await service.resolveMany(body.alertIds, body.notes);
      
      return {
        resolved: results.resolved,
        notFound: results.notFound,
        alreadyResolved: results.alreadyResolved
      };
    }
  );
};
