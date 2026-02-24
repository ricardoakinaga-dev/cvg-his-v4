import type { FastifyPluginAsync } from 'fastify';
import {
  MedicationOrderCreateSchema,
  MedicationOrderStopSchema,
  MedicationOrderUpdateSchema,
  parseOrThrow422
} from '@cvg-his/domain';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createMedicationOrdersService } from './service.js';
import {
  listMedicationOrdersQuerySchema,
  medicationOrderIdParamSchema
} from './types.js';

export const medicationOrdersRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('medorder.write')
    },
    async (request, reply) => {
      const body = parseOrThrow422(MedicationOrderCreateSchema, request.body);
      const service = createMedicationOrdersService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body as any);

      if (result.kind === 'patient_not_found') {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      if (result.kind === 'stay_not_found') {
        return reply.status(404).send({ message: 'Inpatient stay not found' });
      }

      if (result.kind === 'encounter_not_found') {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      if (result.kind === 'patient_mismatch') {
        return reply.status(400).send({ message: result.message });
      }

      return reply.status(201).send(result.order);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('medorder.read')
    },
    async (request, reply) => {
      const params = medicationOrderIdParamSchema.parse(request.params);
      const service = createMedicationOrdersService({ db: app.db, requestContext: request.requestContext });
      const order = await service.getById(params.id);

      if (!order) {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      return reply.send(order);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('medorder.read')
    },
    async (request) => {
      const query = listMedicationOrdersQuerySchema.parse(request.query);
      const service = createMedicationOrdersService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('medorder.write')
    },
    async (request, reply) => {
      const params = medicationOrderIdParamSchema.parse(request.params);
      const body = parseOrThrow422(MedicationOrderUpdateSchema, request.body);
      const service = createMedicationOrdersService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body as any);

      if (result.kind === 'order_not_found') {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      if (result.kind === 'order_stopped') {
        return reply.status(409).send({
          message: 'Medication order is stopped and cannot be edited',
          order: result.order
        });
      }

      return reply.send(result.order);
    }
  );

  app.post(
    '/:id/stop',
    {
      preHandler: requirePermission('medorder.stop')
    },
    async (request, reply) => {
      const params = medicationOrderIdParamSchema.parse(request.params);
      const body = parseOrThrow422(MedicationOrderStopSchema, request.body);
      const service = createMedicationOrdersService({ db: app.db, requestContext: request.requestContext });
      const result = await service.stop(params.id, body);

      if (result.kind === 'order_not_found') {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      if (result.kind === 'already_stopped') {
        return reply.status(409).send({
          message: 'Medication order is already stopped',
          order: result.order
        });
      }

      return reply.send(result.order);
    }
  );
};

