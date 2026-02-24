import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProductsService } from './service.js';
import {
  listProductsQuerySchema,
  productIdParamSchema,
  productCreateSchema,
  productUpdateSchema
} from './types.js';

export const productsRoutes: FastifyPluginAsync = async (app) => {
  // List products with pagination and filters
  app.get(
    '/',
    {
      preHandler: requirePermission('estoque.produtos.read')
    },
    async (request, reply) => {
      const query = listProductsQuerySchema.parse(request.query);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.list({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        active: query.active,
        category: query.category
      });

      return reply.send(result);
    }
  );

  // Get product by ID
  app.get(
    '/:id',
    {
      preHandler: requirePermission('estoque.produtos.read')
    },
    async (request, reply) => {
      const params = productIdParamSchema.parse(request.params);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const product = await service.getById(params.id);

      if (!product) {
        return reply.status(404).send({ message: 'Product not found' });
      }

      return reply.send(product);
    }
  );

  // Create product
  app.post(
    '/',
    {
      preHandler: requirePermission('estoque.produtos.create')
    },
    async (request, reply) => {
      const body = productCreateSchema.parse(request.body);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body);

      if (result.kind === 'sku_conflict') {
        return reply.status(409).send({ message: 'Product SKU already exists for this account' });
      }

      return reply.status(201).send(result.product);
    }
  );

  // Update product
  app.put(
    '/:id',
    {
      preHandler: requirePermission('estoque.produtos.update')
    },
    async (request, reply) => {
      const params = productIdParamSchema.parse(request.params);
      const body = productUpdateSchema.parse(request.body);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body);

      if (result.kind === 'product_not_found') {
        return reply.status(404).send({ message: 'Product not found' });
      }

      if (result.kind === 'sku_conflict') {
        return reply.status(409).send({ message: 'Product SKU already exists for this account' });
      }

      return reply.send(result.product);
    }
  );

  // Delete product
  app.delete(
    '/:id',
    {
      preHandler: requirePermission('estoque.produtos.delete')
    },
    async (request, reply) => {
      const params = productIdParamSchema.parse(request.params);
      const service = createProductsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.delete(params.id);

      if (result.kind === 'product_not_found') {
        return reply.status(404).send({ message: 'Product not found' });
      }

      return reply.status(204).send();
    }
  );
};
