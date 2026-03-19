import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createAvailabilityService, createTypeConfigService } from './service.js';
import {
  createAvailabilityBodySchema,
  updateAvailabilityBodySchema,
  availabilityIdParamSchema,
  listAvailabilityQuerySchema,
  createTypeConfigBodySchema,
  updateTypeConfigBodySchema,
  typeConfigIdParamSchema,
  listTypeConfigsQuerySchema
} from './types.js';

export const agendaConfigRoutes: FastifyPluginAsync = async (app) => {
  // =====================
  // Professional Availability
  // =====================

  app.post(
    '/availability',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const body = createAvailabilityBodySchema.parse(request.body);
      const service = createAvailabilityService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/availability/:id',
    { preHandler: requirePermission('appointment.read') },
    async (request, reply) => {
      const params = availabilityIdParamSchema.parse(request.params);
      const service = createAvailabilityService({ db: app.db, requestContext: request.requestContext });
      const found = await service.getById(params.id);
      if (!found) return reply.status(404).send({ message: 'Availability not found' });
      return reply.send(found);
    }
  );

  app.get(
    '/availability',
    { preHandler: requirePermission('appointment.read') },
    async (request) => {
      const query = listAvailabilityQuerySchema.parse(request.query);
      const service = createAvailabilityService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );

  app.patch(
    '/availability/:id',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const params = availabilityIdParamSchema.parse(request.params);
      const body = updateAvailabilityBodySchema.parse(request.body);
      const service = createAvailabilityService({ db: app.db, requestContext: request.requestContext });
      const updated = await service.update(params.id, body);
      if (!updated) return reply.status(404).send({ message: 'Availability not found' });
      return reply.send(updated);
    }
  );

  app.delete(
    '/availability/:id',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const params = availabilityIdParamSchema.parse(request.params);
      const service = createAvailabilityService({ db: app.db, requestContext: request.requestContext });
      const deleted = await service.delete(params.id);
      if (!deleted) return reply.status(404).send({ message: 'Availability not found' });
      return reply.status(204).send();
    }
  );

  // =====================
  // Appointment Type Configs
  // =====================

  app.post(
    '/appointment-types',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const body = createTypeConfigBodySchema.parse(request.body);
      const service = createTypeConfigService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/appointment-types/:id',
    { preHandler: requirePermission('appointment.read') },
    async (request, reply) => {
      const params = typeConfigIdParamSchema.parse(request.params);
      const service = createTypeConfigService({ db: app.db, requestContext: request.requestContext });
      const found = await service.getById(params.id);
      if (!found) return reply.status(404).send({ message: 'Type config not found' });
      return reply.send(found);
    }
  );

  app.get(
    '/appointment-types',
    { preHandler: requirePermission('appointment.read') },
    async (request) => {
      const query = listTypeConfigsQuerySchema.parse(request.query);
      const service = createTypeConfigService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );

  app.patch(
    '/appointment-types/:id',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const params = typeConfigIdParamSchema.parse(request.params);
      const body = updateTypeConfigBodySchema.parse(request.body);
      const service = createTypeConfigService({ db: app.db, requestContext: request.requestContext });
      const updated = await service.update(params.id, body);
      if (!updated) return reply.status(404).send({ message: 'Type config not found' });
      return reply.send(updated);
    }
  );

  app.delete(
    '/appointment-types/:id',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const params = typeConfigIdParamSchema.parse(request.params);
      const service = createTypeConfigService({ db: app.db, requestContext: request.requestContext });
      const deleted = await service.delete(params.id);
      if (!deleted) return reply.status(404).send({ message: 'Type config not found' });
      return reply.status(204).send();
    }
  );
};
