import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createPatientsService } from './service.js';
import { getPatientSummary } from './summary.js';
import {
  createPatientBodySchema,
  listPatientsQuerySchema,
  patientIdParamSchema,
  updatePatientBodySchema
} from './types.js';

export const patientsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('patient.write')
    },
    async (request, reply) => {
      const body = createPatientBodySchema.parse(request.body);
      const service = createPatientsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body);

      if (result.kind === 'owner_not_found') {
        return reply.status(404).send({ message: 'Owner not found' });
      }

      return reply.status(201).send(result.patient);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = patientIdParamSchema.parse(request.params);
      const service = createPatientsService({ db: app.db, requestContext: request.requestContext });
      const patient = await service.getById(params.id);

      if (!patient) {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      return reply.send(patient);
    }
  );

  app.get(
    '/:id/summary',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = patientIdParamSchema.parse(request.params);
      const summary = await getPatientSummary(app.db, request.requestContext, params.id);

      if (!summary) {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      return reply.send(summary);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('patient.write')
    },
    async (request, reply) => {
      const params = patientIdParamSchema.parse(request.params);
      const body = updatePatientBodySchema.parse(request.body);
      const service = createPatientsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body);

      if (result.kind === 'patient_not_found') {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      if (result.kind === 'owner_not_found') {
        return reply.status(404).send({ message: 'Owner not found' });
      }

      return reply.send(result.patient);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request) => {
      const query = listPatientsQuerySchema.parse(request.query);
      const service = createPatientsService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );
};
