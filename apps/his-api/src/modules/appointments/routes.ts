import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createAppointmentsService } from './service.js';
import {
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  appointmentIdParamSchema,
  updateAppointmentBodySchema
} from './types.js';

export const appointmentsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('appointment.write'),
      schema: {
        tags: ['Appointments'],
        summary: 'Create appointment',
        description: 'Create a new appointment for a patient'
      }
    },
    async (request, reply) => {
      const body = createAppointmentBodySchema.parse(request.body);
      const service = createAppointmentsService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('appointment.read'),
      schema: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        description: 'Retrieve a single appointment by its ID'
      }
    },
    async (request, reply) => {
      const params = appointmentIdParamSchema.parse(request.params);
      const service = createAppointmentsService({ db: app.db, requestContext: request.requestContext });
      const found = await service.getById(params.id);

      if (!found) {
        return reply.status(404).send({ message: 'Appointment not found' });
      }

      return reply.send(found);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('appointment.read'),
      schema: {
        tags: ['Appointments'],
        summary: 'List appointments',
        description: 'List appointments with optional filters (status, date range, professional)'
      }
    },
    async (request) => {
      const query = listAppointmentsQuerySchema.parse(request.query);
      const service = createAppointmentsService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('appointment.write')
    },
    async (request, reply) => {
      const params = appointmentIdParamSchema.parse(request.params);
      const body = updateAppointmentBodySchema.parse(request.body);
      const service = createAppointmentsService({ db: app.db, requestContext: request.requestContext });
      const updated = await service.update(params.id, body);

      if (!updated) {
        return reply.status(404).send({ message: 'Appointment not found' });
      }

      return reply.send(updated);
    }
  );

  app.post(
    '/:id/cancel',
    {
      preHandler: requirePermission('appointment.write')
    },
    async (request, reply) => {
      const params = appointmentIdParamSchema.parse(request.params);
      const service = createAppointmentsService({ db: app.db, requestContext: request.requestContext });
      const cancelled = await service.cancel(params.id);

      if (!cancelled) {
        return reply.status(404).send({ message: 'Appointment not found' });
      }

      return reply.send(cancelled);
    }
  );
};
