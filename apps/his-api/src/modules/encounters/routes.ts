import type { FastifyPluginAsync } from 'fastify';
import {
  createEncounterBodySchema,
  closeEncounterBodySchema,
  encounterIdParamSchema,
  listEncountersQuerySchema,
  encounterResponseSchema,
  listEncountersResponseSchema,
  encounterTimelineResponseSchema
} from '@cvg-his/contracts';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createEncountersService } from './service.js';

export const encountersRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('encounter.write')
    },
    async (request, reply) => {
      const body = createEncounterBodySchema.parse(request.body);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body);

      if (result.kind === 'patient_not_found') {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      const response = encounterResponseSchema.parse(result.encounter);
      return reply.status(201).send(response);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('encounter.read')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const encounter = await service.getById(params.id);

      if (!encounter) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      const response = encounterResponseSchema.parse(encounter);
      return reply.send(response);
    }
  );

  app.get(
    '/:id/timeline',
    {
      preHandler: requirePermission('timeline.read')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const timeline = await service.getTimeline(params.id);

      if (!timeline) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      const response = encounterTimelineResponseSchema.parse(timeline);
      return reply.send(response);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('encounter.read')
    },
    async (request) => {
      const query = listEncountersQuerySchema.parse(request.query);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const data = await service.list(query);
      return listEncountersResponseSchema.parse(data);
    }
  );

  app.post(
    '/:id/close',
    {
      preHandler: requirePermission('encounter.close')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const body = closeEncounterBodySchema.parse(request.body ?? {});
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const result = await service.close(params.id, body);

      if (result.kind === 'encounter_not_found') {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      if (result.kind === 'already_closed') {
        const encounter = encounterResponseSchema.parse(result.encounter);
        return reply.status(409).send({
          message: 'Encounter is already closed',
          encounter
        });
      }

      const response = encounterResponseSchema.parse(result.encounter);
      return reply.send({
        encounter: response,
        billingItemCount: result.billingItemCount,
        billingTotal: result.billingTotal
      });
    }
  );
};
