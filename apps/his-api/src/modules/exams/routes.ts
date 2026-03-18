import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createExamOrdersService, createExamResultsService } from './service.js';
import { createExamOrderBodySchema, updateExamOrderBodySchema, examOrderIdParamSchema, listExamOrdersQuerySchema, createExamResultBodySchema, updateExamResultBodySchema, examResultIdParamSchema, listExamResultsQuerySchema } from './types.js';

export const examsRoutes: FastifyPluginAsync = async (app) => {
  // Exam Orders
  app.post('/exam-orders', { preHandler: requirePermission('appointment.write') }, async (req, reply) => {
    const body = createExamOrderBodySchema.parse(req.body);
    const svc = createExamOrdersService({ db: app.db, requestContext: req.requestContext });
    return reply.status(201).send(await svc.create(body));
  });

  app.get('/exam-orders/:id', { preHandler: requirePermission('appointment.read') }, async (req, reply) => {
    const p = examOrderIdParamSchema.parse(req.params);
    const svc = createExamOrdersService({ db: app.db, requestContext: req.requestContext });
    const r = await svc.getById(p.id);
    if (!r) return reply.status(404).send({ message: 'Exam order not found' });
    return reply.send(r);
  });

  app.get('/exam-orders', { preHandler: requirePermission('appointment.read') }, async (req) => {
    const q = listExamOrdersQuerySchema.parse(req.query);
    return createExamOrdersService({ db: app.db, requestContext: req.requestContext }).list(q);
  });

  app.patch('/exam-orders/:id', { preHandler: requirePermission('appointment.write') }, async (req, reply) => {
    const p = examOrderIdParamSchema.parse(req.params);
    const body = updateExamOrderBodySchema.parse(req.body);
    const r = await createExamOrdersService({ db: app.db, requestContext: req.requestContext }).update(p.id, body);
    if (!r) return reply.status(404).send({ message: 'Exam order not found' });
    return reply.send(r);
  });

  // Exam Results
  app.post('/exam-results', { preHandler: requirePermission('appointment.write') }, async (req, reply) => {
    const body = createExamResultBodySchema.parse(req.body);
    const svc = createExamResultsService({ db: app.db, requestContext: req.requestContext });
    return reply.status(201).send(await svc.create(body));
  });

  app.get('/exam-results/:id', { preHandler: requirePermission('appointment.read') }, async (req, reply) => {
    const p = examResultIdParamSchema.parse(req.params);
    const svc = createExamResultsService({ db: app.db, requestContext: req.requestContext });
    const r = await svc.getById(p.id);
    if (!r) return reply.status(404).send({ message: 'Exam result not found' });
    return reply.send(r);
  });

  app.get('/exam-results', { preHandler: requirePermission('appointment.read') }, async (req) => {
    const q = listExamResultsQuerySchema.parse(req.query);
    return createExamResultsService({ db: app.db, requestContext: req.requestContext }).list(q);
  });

  app.patch('/exam-results/:id', { preHandler: requirePermission('appointment.write') }, async (req, reply) => {
    const p = examResultIdParamSchema.parse(req.params);
    const body = updateExamResultBodySchema.parse(req.body);
    const r = await createExamResultsService({ db: app.db, requestContext: req.requestContext }).update(p.id, body);
    if (!r) return reply.status(404).send({ message: 'Exam result not found' });
    return reply.send(r);
  });
};
