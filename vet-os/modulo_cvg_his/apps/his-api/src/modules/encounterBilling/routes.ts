import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createEncounterBillingService } from './service.js';
import { createEncounterBillingItemBodySchema, encounterBillingEncounterParamSchema, encounterBillingItemIdParamSchema, listEncounterBillingItemsQuerySchema, updateEncounterBillingItemBodySchema } from './types.js';

export const encounterBillingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/encounters/:encounterId/billing-items', { preHandler: requirePermission('billing_item.write') }, async (request, reply) => {
    const params = encounterBillingEncounterParamSchema.parse(request.params);
    const body = createEncounterBillingItemBodySchema.parse(request.body);
    const service = createEncounterBillingService({ db: app.db, requestContext: request.requestContext });
    const result = await service.create(params.encounterId, body);
    if (result.kind === 'encounter_not_found') return reply.status(404).send({ message: 'Encounter not found' });
    if (result.kind === 'encounter_closed') return reply.status(409).send({ message: 'Encounter billing is locked because the encounter is already closed' });
    return reply.status(201).send(result.item);
  });

  app.get('/encounter-billing-items', { preHandler: requirePermission('billing_item.read') }, async (request) => {
    const query = listEncounterBillingItemsQuerySchema.parse(request.query);
    const service = createEncounterBillingService({ db: app.db, requestContext: request.requestContext });
    return service.list(query);
  });

  app.get('/encounters/:encounterId/billing-summary', { preHandler: requirePermission('billing_item.read') }, async (request, reply) => {
    const params = encounterBillingEncounterParamSchema.parse(request.params);
    const service = createEncounterBillingService({ db: app.db, requestContext: request.requestContext });
    const summary = await service.getSummary(params.encounterId);
    if (!summary) return reply.status(404).send({ message: 'Encounter not found' });
    return reply.send(summary);
  });

  app.patch('/encounter-billing-items/:id', { preHandler: requirePermission('billing_item.write') }, async (request, reply) => {
    const params = encounterBillingItemIdParamSchema.parse(request.params);
    const body = updateEncounterBillingItemBodySchema.parse(request.body);
    const service = createEncounterBillingService({ db: app.db, requestContext: request.requestContext });
    const result = await service.update(params.id, body);
    if (result.kind === 'billing_item_not_found') return reply.status(404).send({ message: 'Billing item not found' });
    if (result.kind === 'encounter_closed') return reply.status(409).send({ message: 'Encounter billing is locked because the encounter is already closed' });
    return reply.send(result.item);
  });

  app.delete('/encounter-billing-items/:id', { preHandler: requirePermission('billing_item.write') }, async (request, reply) => {
    const params = encounterBillingItemIdParamSchema.parse(request.params);
    const service = createEncounterBillingService({ db: app.db, requestContext: request.requestContext });
    const result = await service.remove(params.id);
    if (result.kind === 'billing_item_not_found') return reply.status(404).send({ message: 'Billing item not found' });
    if (result.kind === 'encounter_closed') return reply.status(409).send({ message: 'Encounter billing is locked because the encounter is already closed' });
    return reply.status(204).send();
  });
};
