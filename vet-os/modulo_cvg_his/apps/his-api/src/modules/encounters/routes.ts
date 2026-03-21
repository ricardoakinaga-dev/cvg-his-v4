import type { FastifyPluginAsync } from 'fastify';
import {
  createEncounterBodySchema,
  closeEncounterBodySchema,
  encounterIdParamSchema,
  listEncountersQuerySchema
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

      return reply.status(201).send(result.encounter);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('medical_record.read')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const encounter = await service.getById(params.id);

      if (!encounter) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      return reply.send(encounter);
    }
  );

  app.get(
    '/:id/timeline',
    {
      preHandler: requirePermission('medical_record.read')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const service = createEncountersService({ db: app.db, requestContext: request.requestContext });
      const timeline = await service.getTimeline(params.id);

      if (!timeline) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      return reply.send(timeline);
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
      return service.list(query);
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
        return reply.status(409).send({
          message: 'Encounter is already closed',
          encounter: result.encounter
        });
      }

      return reply.send(result.encounter);
    }
  );
};
