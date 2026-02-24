import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createServicesService } from './service.js';
import {
  listServicesQuerySchema,
  serviceCreateSchema,
  serviceIdParamSchema,
  serviceUpdateSchema
} from './types.js';

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  // List services with pagination and filters
  app.get(
    '/',
    {
      preHandler: requirePermission('financeiro.servicos.read')
    },
    async (request, reply) => {
      const query = listServicesQuerySchema.parse(request.query);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.list({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        group: query.group,
        sector: query.sector,
        active: query.active
      });

      return reply.send(result);
    }
  );

  // Get service by ID
  app.get(
    '/:id',
    {
      preHandler: requirePermission('financeiro.servicos.read')
    },
    async (request, reply) => {
      const params = serviceIdParamSchema.parse(request.params);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.getById(params.id);

      if (!result) {
        return reply.status(404).send({ message: 'Service not found' });
      }

      return reply.send(result);
    }
  );

  // Create service
  app.post(
    '/',
    {
      preHandler: requirePermission('financeiro.servicos.create')
    },
    async (request, reply) => {
      const body = serviceCreateSchema.parse(request.body);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body);

      if (result.kind === 'code_conflict') {
        return reply.status(409).send({ message: 'Service code already exists for this account' });
      }

      return reply.status(201).send(result.service);
    }
  );

  // Update service
  app.put(
    '/:id',
    {
      preHandler: requirePermission('financeiro.servicos.update')
    },
    async (request, reply) => {
      const params = serviceIdParamSchema.parse(request.params);
      const body = serviceUpdateSchema.parse(request.body);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body);

      if (result.kind === 'service_not_found') {
        return reply.status(404).send({ message: 'Service not found' });
      }

      if (result.kind === 'code_conflict') {
        return reply.status(409).send({ message: 'Service code already exists for this account' });
      }

      return reply.send(result.service);
    }
  );

  // Delete service
  app.delete(
    '/:id',
    {
      preHandler: requirePermission('financeiro.servicos.delete')
    },
    async (request, reply) => {
      const params = serviceIdParamSchema.parse(request.params);
      const service = createServicesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.delete(params.id);

      if (result.kind === 'service_not_found') {
        return reply.status(404).send({ message: 'Service not found' });
      }

      return reply.status(204).send();
    }
  );
};
