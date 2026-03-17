import { requirePermission } from '../../middlewares/requirePermission.js';
import { createOwnersService } from './service.js';
import { getOwnerSummary } from './summary.js';
import { createOwnerBodySchema, listOwnersQuerySchema, ownerIdParamSchema, updateOwnerBodySchema } from './types.js';
export const ownersRoutes = async (app) => {
    app.post('/', {
        preHandler: requirePermission('owner.write')
    }, async (request, reply) => {
        const body = createOwnerBodySchema.parse(request.body);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        const created = await service.create(body);
        return reply.status(201).send(created);
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
        return reply.send(owner);
    });
    app.get('/:id/summary', {
        preHandler: requirePermission('owner.read')
    }, async (request, reply) => {
        const params = ownerIdParamSchema.parse(request.params);
        const summary = await getOwnerSummary(app.db, request.requestContext, params.id);
        if (!summary) {
            return reply.status(404).send({ message: 'Owner not found' });
        }
        return reply.send(summary);
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
        return reply.send(updated);
    });
    app.get('/', {
        preHandler: requirePermission('owner.read')
    }, async (request) => {
        const query = listOwnersQuerySchema.parse(request.query);
        const service = createOwnersService({ db: app.db, requestContext: request.requestContext });
        return service.list(query);
    });
};
//# sourceMappingURL=routes.js.map