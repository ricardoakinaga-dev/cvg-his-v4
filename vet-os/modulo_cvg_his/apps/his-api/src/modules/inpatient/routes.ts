import type { FastifyPluginAsync } from 'fastify';
import {
  InpatientAdmitSchema,
  InpatientDischargeSchema,
  InpatientStayStatusSchema,
  InpatientTransferSchema,
  type InpatientAdmitDto,
  type InpatientDischargeDto,
  type InpatientTransferDto,
  parseOrThrow422
} from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createInpatientService } from './service.js';

const stayIdParamSchema = z.object({
  id: z.string().uuid()
});

const listStaysQuerySchema = z.object({
  status: InpatientStayStatusSchema.optional(),
  wardId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const inpatientRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/admit',
    {
      preHandler: requirePermission('inpatient.write')
    },
    async (request, reply) => {
      const body = parseOrThrow422(InpatientAdmitSchema, request.body) as InpatientAdmitDto;
      const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
      const result = await service.admit(body);

      if (result.kind === 'patient_not_found') {
        return reply.status(404).send({ message: 'Patient not found' });
      }

      if (result.kind === 'ward_not_found') {
        return reply.status(404).send({ message: 'Ward not found' });
      }

      if (result.kind === 'bed_not_found') {
        return reply.status(404).send({ message: 'Bed not found' });
      }

      if (result.kind === 'bed_inactive') {
        return reply.status(409).send({ message: 'Bed is inactive' });
      }

      if (result.kind === 'bed_ward_mismatch') {
        return reply.status(409).send({ message: 'Bed does not belong to the target ward' });
      }

      if (result.kind === 'bed_occupied') {
        return reply.status(409).send({ message: 'Bed is already occupied by an active stay' });
      }

      return reply.send(result.stay);
    }
  );

  app.post(
    '/stays/:id/transfer',
    {
      preHandler: requirePermission('inpatient.write')
    },
    async (request, reply) => {
      const params = stayIdParamSchema.parse(request.params);
      const body = parseOrThrow422(InpatientTransferSchema, request.body) as InpatientTransferDto;
      const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
      const result = await service.transfer(params.id, body);

      if (result.kind === 'stay_not_found') {
        return reply.status(404).send({ message: 'Inpatient stay not found' });
      }

      if (result.kind === 'ward_not_found') {
        return reply.status(404).send({ message: 'Ward not found' });
      }

      if (result.kind === 'bed_not_found') {
        return reply.status(404).send({ message: 'Bed not found' });
      }

      if (result.kind === 'stay_not_active') {
        return reply.status(409).send({
          message: 'Only active stays can be transferred',
          stay: result.stay
        });
      }

      if (result.kind === 'bed_inactive') {
        return reply.status(409).send({ message: 'Bed is inactive' });
      }

      if (result.kind === 'bed_ward_mismatch') {
        return reply.status(409).send({ message: 'Bed does not belong to the target ward' });
      }

      if (result.kind === 'bed_occupied') {
        return reply.status(409).send({ message: 'Bed is already occupied by an active stay' });
      }

      return reply.send(result.stay);
    }
  );

  app.post(
    '/stays/:id/discharge',
    {
      preHandler: requirePermission('inpatient.discharge')
    },
    async (request, reply) => {
      const params = stayIdParamSchema.parse(request.params);
      const body = parseOrThrow422(InpatientDischargeSchema, request.body) as InpatientDischargeDto;
      const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
      const result = await service.discharge(params.id, body);

      if (result.kind === 'stay_not_found') {
        return reply.status(404).send({ message: 'Inpatient stay not found' });
      }

      if (result.kind === 'stay_not_active') {
        return reply.status(409).send({
          message: 'Only active stays can be discharged',
          stay: result.stay
        });
      }

      return reply.send(result.stay);
    }
  );

  app.get(
    '/stays/:id',
    {
      preHandler: requirePermission('inpatient.read')
    },
    async (request, reply) => {
      const params = stayIdParamSchema.parse(request.params);
      const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
      const stay = await service.getById(params.id);

      if (!stay) {
        return reply.status(404).send({ message: 'Inpatient stay not found' });
      }

      return reply.send(stay);
    }
  );

  app.get(
    '/stays',
    {
      preHandler: requirePermission('inpatient.read')
    },
    async (request) => {
      const query = listStaysQuerySchema.parse(request.query);
      const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );
};
