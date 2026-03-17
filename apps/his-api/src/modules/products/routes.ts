import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProductsService } from './service.js';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductBodySchema
} from './types.js';

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('product.write')
    },
    async (request, reply) => {
      const body = createProductBodySchema.parse(request.body);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('product.read')
    },
    async (request, reply) => {
      const params = productIdParamSchema.parse(request.params);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const found = await service.getById(params.id);

      if (!found) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      return reply.send(found);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('product.write')
    },
    async (request, reply) => {
      const params = productIdParamSchema.parse(request.params);
      const body = updateProductBodySchema.parse(request.body);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const updated = await service.update(params.id, body);

      if (!updated) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      return reply.send(updated);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('product.read')
    },
    async (request) => {
      const query = listProductsQuerySchema.parse(request.query);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );
};
