import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { collaborators } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
const createCollabSchema = z.object({
    name: z.string().min(1),
    roleTitle: z.string().optional(),
    specialty: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
});
export const collaboratorsRoutes = async (app) => {
    app.get('/', { preHandler: requirePermission('agenda.colaboradores.read') }, async (request) => {
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        return db.select().from(collaborators).where(eq(collaborators.accountId, accountId));
    });
    app.post('/', { preHandler: requirePermission('agenda.colaboradores.update') }, async (request, reply) => {
        const body = createCollabSchema.parse(request.body);
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        const [newCollab] = await db
            .insert(collaborators)
            .values({
            accountId,
            name: body.name,
            roleTitle: body.roleTitle,
            specialty: body.specialty,
            email: body.email,
            phone: body.phone,
            status: 'active'
        })
            .returning();
        return reply.status(201).send(newCollab);
    });
};
//# sourceMappingURL=collaborators.routes.js.map