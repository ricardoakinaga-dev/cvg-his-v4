import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createStockItemsService, createStockLotsService, createStockMovementsService } from './service.js';
import {
  listStockItemsQuerySchema,
  updateStockItemBodySchema,
  stockItemIdParamSchema,
  createStockLotBodySchema,
  listStockLotsQuerySchema,
  createStockMovementBodySchema,
  listStockMovementsQuerySchema
} from './types.js';

export const stockRoutes: FastifyPluginAsync = async (app) => {
  // =====================
  // Stock Items
  // =====================

  app.get('/stock/items', {
    preHandler: requirePermission('inventory.read'),
    schema: {
      tags: ['Stock'],
      summary: 'List stock items',
      description: 'List stock items with optional filters (low stock, active)'
    }
  }, async (request) => {
    const query = listStockItemsQuerySchema.parse(request.query);
    const svc = createStockItemsService({ db: app.db, requestContext: request.requestContext });
    return svc.list(query);
  });

  app.get('/stock/summary', {
    preHandler: requirePermission('inventory.read'),
    schema: {
      tags: ['Stock'],
      summary: 'Stock summary',
      description: 'Get stock summary (total products, items in stock, low stock, expiring lots)'
    }
  }, async (request) => {
    const svc = createStockItemsService({ db: app.db, requestContext: request.requestContext });
    return svc.getSummary();
  });

  app.get('/stock/items/:id', {
    preHandler: requirePermission('inventory.read'),
    schema: {
      tags: ['Stock'],
      summary: 'Get stock item by ID'
    }
  }, async (request, reply) => {
    const params = stockItemIdParamSchema.parse(request.params);
    const svc = createStockItemsService({ db: app.db, requestContext: request.requestContext });
    const found = await svc.getById(params.id);
    if (!found) return reply.status(404).send({ message: 'Stock item not found' });
    return found;
  });

  app.patch('/stock/items/:id', {
    preHandler: requirePermission('inventory.adjust'),
    schema: {
      tags: ['Stock'],
      summary: 'Update stock item',
      description: 'Update stock item settings (min quantity, max quantity, location)'
    }
  }, async (request, reply) => {
    const params = stockItemIdParamSchema.parse(request.params);
    const body = updateStockItemBodySchema.parse(request.body);
    const svc = createStockItemsService({ db: app.db, requestContext: request.requestContext });
    const updated = await svc.update(params.id, body);
    if (!updated) return reply.status(404).send({ message: 'Stock item not found' });
    return updated;
  });

  // =====================
  // Stock Lots
  // =====================

  app.get('/stock/lots', {
    preHandler: requirePermission('inventory.read'),
    schema: {
      tags: ['Stock'],
      summary: 'List stock lots',
      description: 'List stock lots with optional filters (expiring, supplier, status)'
    }
  }, async (request) => {
    const query = listStockLotsQuerySchema.parse(request.query);
    const svc = createStockLotsService({ db: app.db, requestContext: request.requestContext });
    return svc.list(query);
  });

  app.post('/stock/lots', {
    preHandler: requirePermission('inventory.adjust'),
    schema: {
      tags: ['Stock'],
      summary: 'Create stock lot',
      description: 'Create a new stock lot (entry) and update stock quantity'
    }
  }, async (request, reply) => {
    const body = createStockLotBodySchema.parse(request.body);
    const svc = createStockLotsService({ db: app.db, requestContext: request.requestContext });
    const created = await svc.create(body);
    return reply.status(201).send(created);
  });

  // =====================
  // Stock Movements
  // =====================

  app.get('/stock/movements', {
    preHandler: requirePermission('inventory.read'),
    schema: {
      tags: ['Stock'],
      summary: 'List stock movements',
      description: 'List stock movements with filters (product, type, date range)'
    }
  }, async (request) => {
    const query = listStockMovementsQuerySchema.parse(request.query);
    const svc = createStockMovementsService({ db: app.db, requestContext: request.requestContext });
    return svc.list(query);
  });

  app.post('/stock/movements', {
    preHandler: requirePermission('inventory.adjust'),
    schema: {
      tags: ['Stock'],
      summary: 'Create stock movement',
      description: 'Create a stock movement (in/out/adjustment) and update stock quantity'
    }
  }, async (request, reply) => {
    const body = createStockMovementBodySchema.parse(request.body);
    const svc = createStockMovementsService({ db: app.db, requestContext: request.requestContext });
    const created = await svc.create(body);
    return reply.status(201).send(created);
  });
};
