import { requirePermission } from '../../middlewares/requirePermission.js';
import { createOwnersService } from './service.js';
import { getOwnerSummary } from './summary.js';
import { createOwnerBodySchema, listOwnersResponseSchema, listOwnersQuerySchema, ownerIdParamSchema, ownerResponseSchema, ownerSummaryResponseSchema, updateOwnerBodySchema } from './types.js';
export const ownersRoutes = async (app) => {
    app.post('/', {
        preHandler: requirePermission('owner.write')
    }, async (request, reply) => {
        const body = createOwnerBodySchema.parse(request.body);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        const created = await service.create(body);
        const response = ownerResponseSchema.parse(created);
        return reply.status(201).send(response);
    });
    app.get('/:id', {
        preHandler: requirePermission('owner.read')
    }, async (request, reply) => {
        const params = ownerIdParamSchema.parse(request.params);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        const owner = await service.getById(params.id);
        if (!owner) {
            return reply.status(404).send({ message: 'Owner not found' });
        }
        const response = ownerResponseSchema.parse(owner);
        return reply.send(response);
    });
    app.get('/:id/summary', {
        preHandler: requirePermission('owner.read')
    }, async (request, reply) => {
        const params = ownerIdParamSchema.parse(request.params);
        const summary = await getOwnerSummary(app.db, request.requestContext, params.id);
        if (!summary) {
            return reply.status(404).send({ message: 'Owner not found' });
        }
        const response = ownerSummaryResponseSchema.parse(summary);
        return reply.send(response);
    });
    app.patch('/:id', {
        preHandler: requirePermission('owner.write')
    }, async (request, reply) => {
        const params = ownerIdParamSchema.parse(request.params);
        const body = updateOwnerBodySchema.parse(request.body);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        const updated = await service.update(params.id, body);
        if (!updated) {
            return reply.status(404).send({ message: 'Owner not found' });
        }
        const response = ownerResponseSchema.parse(updated);
        return reply.send(response);
    });
    app.get('/', {
        preHandler: requirePermission('owner.read')
    }, async (request) => {
        const query = listOwnersQuerySchema.parse(request.query);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        const data = await service.list(query);
        return listOwnersResponseSchema.parse(data);
    });
};
//# sourceMappingURL=routes.js.map