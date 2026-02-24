import { requirePermission } from '../../middlewares/requirePermission.js';
import { createBillingItemsService } from './service.js';
import { encounterIdParamSchema, billingItemIdParamSchema, listBillingItemsQuerySchema, billingItemCreateSchema, billingItemUpdateSchema } from './types.js';
export const billingItemsRoutes = async (app) => {
    // List billing items for an encounter
    app.get('/:encounterId/billing-items', {
        preHandler: requirePermission('clinica.atendimentos.read')
    }, async (request, reply) => {
        const params = encounterIdParamSchema.parse(request.params);
        const query = listBillingItemsQuerySchema.parse(request.query ?? {});
        const service = createBillingItemsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.listByEncounter(params.encounterId, query.status);
        return reply.send({
            items: result.items,
            total: result.total,
            itemCount: result.itemCount
        });
    });
    // Add a billing item to an encounter
    app.post('/:encounterId/billing-items', {
        preHandler: requirePermission('financeiro.comandas.update')
    }, async (request, reply) => {
        const params = encounterIdParamSchema.parse(request.params);
        const body = billingItemCreateSchema.parse(request.body);
        const service = createBillingItemsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(params.encounterId, body);
        if (result.kind === 'encounter_not_found') {
            return reply.status(404).send({ message: 'Encounter not found' });
        }
        if (result.kind === 'encounter_closed') {
            return reply.status(409).send({ message: 'Cannot add billing items to a closed encounter' });
        }
        return reply.status(201).send(result.billingItem);
    });
    // Update a billing item
    app.put('/:encounterId/billing-items/:id', {
        preHandler: requirePermission('financeiro.comandas.update')
    }, async (request, reply) => {
        const params = billingItemIdParamSchema.parse(request.params);
        const body = billingItemUpdateSchema.parse(request.body);
        const service = createBillingItemsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'billing_item_not_found') {
            return reply.status(404).send({ message: 'Billing item not found' });
        }
        if (result.kind === 'already_confirmed') {
            return reply.status(409).send({ message: 'Cannot update a confirmed billing item' });
        }
        return reply.send(result.billingItem);
    });
    // Delete a billing item
    app.delete('/:encounterId/billing-items/:id', {
        preHandler: requirePermission('financeiro.comandas.update')
    }, async (request, reply) => {
        const params = billingItemIdParamSchema.parse(request.params);
        const service = createBillingItemsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.delete(params.id);
        if (result.kind === 'billing_item_not_found') {
            return reply.status(404).send({ message: 'Billing item not found' });
        }
        if (result.kind === 'already_confirmed') {
            return reply.status(409).send({ message: 'Cannot delete a confirmed billing item' });
        }
        return reply.status(204).send();
    });
    // Confirm all billing items for an encounter
    app.post('/:encounterId/billing-items/confirm-all', {
        preHandler: requirePermission('financeiro.comandas.update')
    }, async (request, reply) => {
        const params = encounterIdParamSchema.parse(request.params);
        const service = createBillingItemsService({ db: app.db, requestContext: request.requestContext });
        const count = await service.confirmAll(params.encounterId);
        return reply.send({ confirmedCount: count });
    });
};
//# sourceMappingURL=routes.js.map