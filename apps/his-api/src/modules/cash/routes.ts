import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createCashService } from './service.js';
import {
  openCashRegisterBodySchema,
  closeCashRegisterBodySchema,
  cashRegisterIdParamSchema,
  createCashMovementBodySchema,
  listCashMovementsQuerySchema
} from './types.js';

export const cashRoutes: FastifyPluginAsync = async (app) => {
  // GET /cash/current - Get current open register
  app.get('/cash/current', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Get current open cash register',
      description: 'Returns the currently open cash register, or null if none is open'
    }
  }, async (request) => {
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    return svc.getOpenRegister();
  });

  // GET /cash/registers - List all registers
  app.get('/cash/registers', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Cash Register'],
      summary: 'List cash registers',
      description: 'List cash registers with optional status filter'
    }
  }, async (request) => {
    const query = request.query as any;
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    return svc.listRegisters({ page: query.page, pageSize: query.pageSize, status: query.status });
  });

  // GET /cash/registers/:id - Get register by ID
  app.get('/cash/registers/:id', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Get cash register by ID'
    }
  }, async (request, reply) => {
    const params = cashRegisterIdParamSchema.parse(request.params);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    const found = await svc.getRegisterById(params.id);
    if (!found) return reply.status(404).send({ message: 'Cash register not found' });
    return found;
  });

  // POST /cash/open - Open a new cash register
  app.post('/cash/open', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Open cash register',
      description: 'Open a new cash register with initial balance'
    }
  }, async (request, reply) => {
    const body = openCashRegisterBodySchema.parse(request.body);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    const created = await svc.open(body);
    return reply.status(201).send(created);
  });

  // POST /cash/close - Close the current cash register
  app.post('/cash/close', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Close cash register',
      description: 'Close the current open cash register with final balance'
    }
  }, async (request) => {
    const body = closeCashRegisterBodySchema.parse(request.body);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    return svc.close(body);
  });

  // GET /cash/registers/:id/summary - Get register summary
  app.get('/cash/registers/:id/summary', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Cash register summary',
      description: 'Get summary of a cash register (totals by movement type)'
    }
  }, async (request, reply) => {
    const params = cashRegisterIdParamSchema.parse(request.params);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    const summary = await svc.getSummary(params.id);
    if (!summary) return reply.status(404).send({ message: 'Cash register not found' });
    return summary;
  });

  // POST /cash/movements - Create a cash movement
  app.post('/cash/movements', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Cash Register'],
      summary: 'Create cash movement',
      description: 'Create a cash movement (supply, withdrawal, adjustment)'
    }
  }, async (request, reply) => {
    const body = createCashMovementBodySchema.parse(request.body);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    const created = await svc.createMovement(body);
    return reply.status(201).send(created);
  });

  // GET /cash/movements - List cash movements
  app.get('/cash/movements', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Cash Register'],
      summary: 'List cash movements',
      description: 'List cash movements with filters'
    }
  }, async (request) => {
    const query = listCashMovementsQuerySchema.parse(request.query);
    const svc = createCashService({ db: app.db, requestContext: request.requestContext });
    return svc.listMovements(query);
  });
};
