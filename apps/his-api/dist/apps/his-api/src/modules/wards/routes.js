import { WardCreateSchema, WardUpdateSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createWardsService } from './service.js';
const wardIdParamSchema = z.object({
    id: z.string().uuid()
});
const listWardsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    q: z.string().trim().max(120).optional()
});
export const wardsRoutes = async (app) => {
    app.get('/', {
        preHandler: requirePermission('ward.read')
    }, async (request) => {
        const query = listWardsQuerySchema.parse(request.query);
        const service = createWardsService({ db: app.db, requestContext: request.requestContext });
        return service.list(query);
    });
    app.post('/', {
        preHandler: requirePermission('ward.write')
    }, async (request, reply) => {
        const body = parseOrThrow422(WardCreateSchema, request.body);
        const service = createWardsService({ db: app.db, requestContext: request.requestContext });
        const created = await service.create(body);
        return reply.status(201).send(created);
    });
    app.patch('/:id', {
        preHandler: requirePermission('ward.write')
    }, async (request, reply) => {
        const params = wardIdParamSchema.parse(request.params);
        const body = parseOrThrow422(WardUpdateSchema, request.body);
        const service = createWardsService({ db: app.db, requestContext: request.requestContext });
        const updated = await service.update(params.id, body);
        if (!updated) {
            return reply.status(404).send({ message: 'Ward not found' });
        }
        return reply.send(updated);
    });
};
//# sourceMappingURL=routes.js.map