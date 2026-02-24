import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { resources } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
const createResourceSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['room', 'surgery_room', 'equipment']),
});
export const resourcesRoutes = async (app) => {
    app.get('/', { preHandler: requirePermission('agenda.recursos.read') }, async (request) => {
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        return db.select().from(resources).where(eq(resources.accountId, accountId));
    });
    app.post('/', { preHandler: requirePermission('agenda.recursos.update') }, async (request, reply) => {
        const body = createResourceSchema.parse(request.body);
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        const [newRes] = await db
            .insert(resources)
            .values({
            accountId,
            name: body.name,
            type: body.type,
            active: true
        })
            .returning();
        return reply.status(201).send(newRes);
    });
};
//# sourceMappingURL=resources.routes.js.map