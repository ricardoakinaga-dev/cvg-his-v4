import type { FastifyPluginAsync } from 'fastify';
import { HandoverDraftSchema, HandoverPublishSchema, type HandoverDraftDto, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import { createApiQueues, HANDOVER_BUILD_QUEUE_NAME } from '../../lib/queues.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createHandoversService } from './service.js';

const handoverIdParamSchema = z.object({
  id: z.string().uuid()
});

const latestHandoverQuerySchema = z.object({
  wardId: z.string().uuid()
});

export const handoversRoutes: FastifyPluginAsync = async (app) => {
  const queues = createApiQueues({
    redisUrl: app.env.REDIS_URL,
    prefix: app.env.QUEUE_PREFIX,
    logger: app.log
  });

  app.addHook('onClose', async () => {
    await queues.close();
  });

  app.post(
    '/draft',
    {
      preHandler: requirePermission('handover.write')
    },
    async (request, reply) => {
      const body = parseOrThrow422(HandoverDraftSchema, request.body) as HandoverDraftDto;
      const service = createHandoversService({ db: app.db, requestContext: request.requestContext });
      const result = await service.createDraft(body);

      if (result.kind === 'ward_not_found') {
        return reply.status(404).send({ message: 'Ward not found' });
      }

      if (result.kind === 'stay_not_found') {
        return reply.status(404).send({
          message: `Inpatient stay not found: ${result.stayId}`
        });
      }

      if (result.kind === 'stay_ward_mismatch') {
        return reply.status(422).send({
          message: `Inpatient stay does not belong to the handover ward: ${result.stayId}`
        });
      }

      return reply.send(result.handover);
    }
  );

  app.post(
    '/:id/publish',
    {
      preHandler: requirePermission('handover.publish')
    },
    async (request, reply) => {
      const params = handoverIdParamSchema.parse(request.params);
      const { handoverId } = parseOrThrow422(HandoverPublishSchema, { handoverId: params.id });
      const service = createHandoversService(
        { db: app.db, requestContext: request.requestContext },
        {
          enqueueHandoverBuild: queues.enqueueHandoverBuild
        }
      );
      const result = await service.publish(handoverId);

      if (result.kind === 'handover_not_found') {
        return reply.status(404).send({ message: 'Handover not found' });
      }

      if (result.kind === 'handover_not_draft') {
        return reply.status(409).send({
          message: 'Only draft handovers or published handovers with failed build can be published',
          handover: result.handover
        });
      }

      return reply.send({
        ...result.handover,
        queue: HANDOVER_BUILD_QUEUE_NAME,
        jobId: result.job.jobId
      });
    }
  );

  app.get(
    '/latest',
    {
      preHandler: requirePermission('handover.read')
    },
    async (request, reply) => {
      const query = latestHandoverQuerySchema.parse(request.query);
      const service = createHandoversService({ db: app.db, requestContext: request.requestContext });
      const handover = await service.getLatestByWard(query.wardId);

      if (!handover) {
        return reply.status(404).send({
          message: 'No published handover found for ward'
        });
      }

      return reply.send(handover);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('handover.read')
    },
    async (request, reply) => {
      const params = handoverIdParamSchema.parse(request.params);
      const service = createHandoversService({ db: app.db, requestContext: request.requestContext });
      const handover = await service.getById(params.id);

      if (!handover) {
        return reply.status(404).send({ message: 'Handover not found' });
      }

      return reply.send(handover);
    }
  );

  app.get(
    '/:id/document',
    {
      preHandler: requirePermission('handover.read')
    },
    async (request, reply) => {
      const params = handoverIdParamSchema.parse(request.params);
      const service = createHandoversService({ db: app.db, requestContext: request.requestContext });
      const result = await service.getDocumentByHandoverId(params.id);

      if (result.kind === 'handover_not_found') {
        return reply.status(404).send({ message: 'Handover not found' });
      }

      if (result.kind === 'document_not_found') {
        return reply.status(404).send({ message: 'Handover document not available' });
      }

      return reply.send(result.document);
    }
  );
};
