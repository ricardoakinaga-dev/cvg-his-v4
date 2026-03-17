import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createServicesService } from './service.js';
import {
  createServiceBodySchema,
  listServicesQuerySchema,
  serviceIdParamSchema,
  updateServiceBodySchema
} from './types.js';

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('service.write')
    },
    async (request, reply) => {
      const body = createServiceBodySchema.parse(request.body);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('service.read')
    },
    async (request, reply) => {
      const params = serviceIdParamSchema.parse(request.params);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const found = await service.getById(params.id);

      if (!found) {
        return reply.status(404).send({ message: 'Service not found' });
      }

      return reply.send(found);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('service.write')
    },
    async (request, reply) => {
      const params = serviceIdParamSchema.parse(request.params);
      const body = updateServiceBodySchema.parse(request.body);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const updated = await service.update(params.id, body);

      if (!updated) {
        return reply.status(404).send({ message: 'Service not found' });
      }

      return reply.send(updated);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('service.read')
    },
    async (request) => {
      const query = listServicesQuerySchema.parse(request.query);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );
};
