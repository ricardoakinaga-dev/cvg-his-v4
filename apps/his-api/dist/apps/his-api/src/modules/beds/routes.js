import { BedCreateSchema, BedUpdateSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createBedsService } from './service.js';
const bedIdParamSchema = z.object({
    id: z.string().uuid()
});
const listBedsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    wardId: z.string().uuid().optional(),
    q: z.string().trim().max(120).optional()
});
export const bedsRoutes = async (app) => {
    app.get('/', {
        preHandler: requirePermission('bed.read')
    }, async (request) => {
        const query = listBedsQuerySchema.parse(request.query);
        const service = createBedsService({ db: app.db, requestContext: request.requestContext });
        return service.list(query);
    });
    app.post('/', {
        preHandler: requirePermission('bed.write')
    }, async (request, reply) => {
        const body = parseOrThrow422(BedCreateSchema, request.body);
        const service = createBedsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.create(body);
        if (result.kind === 'ward_not_found') {
            return reply.status(404).send({ message: 'Ward not found' });
        }
        return reply.status(201).send(result.bed);
    });
    app.patch('/:id', {
        preHandler: requirePermission('bed.write')
    }, async (request, reply) => {
        const params = bedIdParamSchema.parse(request.params);
        const body = parseOrThrow422(BedUpdateSchema, request.body);
        const service = createBedsService({ db: app.db, requestContext: request.requestContext });
        const result = await service.update(params.id, body);
        if (result.kind === 'bed_not_found') {
            return reply.status(404).send({ message: 'Bed not found' });
        }
        if (result.kind === 'ward_not_found') {
            return reply.status(404).send({ message: 'Ward not found' });
        }
        return reply.send(result.bed);
    });
};
//# sourceMappingURL=routes.js.map