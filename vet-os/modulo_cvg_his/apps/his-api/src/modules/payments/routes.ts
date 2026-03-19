import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createPaymentsService } from './service.js';
import {
  createPaymentBodySchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema
} from './types.js';

const dateRangeSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date()
});

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  // GET /payments - List payments
  app.get('/payments', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Payments'],
      summary: 'List payments',
      description: 'List payments with optional filters (financial account, method, status, date range)'
    }
  }, async (request) => {
    const query = listPaymentsQuerySchema.parse(request.query);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    return svc.list(query);
  });

  // GET /payments/summary - Payments summary by method
  app.get('/payments/summary', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Payments'],
      summary: 'Payments summary',
      description: 'Get payments summary by method for a date range'
    }
  }, async (request) => {
    const query = dateRangeSchema.parse(request.query);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    const result = await svc.getSummary(query.dateFrom, query.dateTo);
    return { ...result, dateFrom: query.dateFrom, dateTo: query.dateTo };
  });

  // GET /payments/:id - Get payment by ID
  app.get('/payments/:id', {
    preHandler: requirePermission('financial_account.read'),
    schema: {
      tags: ['Payments'],
      summary: 'Get payment by ID'
    }
  }, async (request, reply) => {
    const params = paymentIdParamSchema.parse(request.params);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    const found = await svc.getById(params.id);
    if (!found) return reply.status(404).send({ message: 'Payment not found' });
    return found;
  });

  // POST /payments - Create payment
  app.post('/payments', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Payments'],
      summary: 'Create payment',
      description: 'Create a payment for a financial account. Supports installments.'
    }
  }, async (request, reply) => {
    const body = createPaymentBodySchema.parse(request.body);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    const created = await svc.create(body);
    return reply.status(201).send(created);
  });

  // POST /payments/:id/refund - Refund payment
  app.post('/payments/:id/refund', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Payments'],
      summary: 'Refund payment',
      description: 'Refund a completed payment'
    }
  }, async (request, reply) => {
    const params = paymentIdParamSchema.parse(request.params);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    const result = await svc.refund(params.id);
    if (!result) return reply.status(404).send({ message: 'Payment not found' });
    return result;
  });

  // POST /payments/:id/cancel - Cancel payment
  app.post('/payments/:id/cancel', {
    preHandler: requirePermission('financial_account.close'),
    schema: {
      tags: ['Payments'],
      summary: 'Cancel payment',
      description: 'Cancel a pending or completed payment'
    }
  }, async (request, reply) => {
    const params = paymentIdParamSchema.parse(request.params);
    const svc = createPaymentsService({ db: app.db, requestContext: request.requestContext });
    const result = await svc.cancel(params.id);
    if (!result) return reply.status(404).send({ message: 'Payment not found' });
    return result;
  });
};
