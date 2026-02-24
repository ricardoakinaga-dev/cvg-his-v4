import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { appointmentTypes } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
const createTypeSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    sector: z.string().min(1),
    defaultDurationMinutes: z.number().int().positive().default(30),
    requiresResource: z.boolean().default(false),
    requiresTeam: z.boolean().default(false),
});
export const appointmentTypesRoutes = async (app) => {
    app.get('/', { preHandler: requirePermission('agenda.config.read') }, async (request) => {
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        return db.select().from(appointmentTypes).where(eq(appointmentTypes.accountId, accountId));
    });
    app.post('/', { preHandler: requirePermission('agenda.config.update') }, async (request, reply) => {
        const body = createTypeSchema.parse(request.body);
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        const [newType] = await db
            .insert(appointmentTypes)
            .values({
            accountId,
            code: body.code,
            name: body.name,
            sector: body.sector,
            defaultDurationMinutes: body.defaultDurationMinutes,
            requiresResource: body.requiresResource,
            requiresTeam: body.requiresTeam,
            active: true
        })
            .returning();
        return reply.status(201).send(newType);
    });
};
//# sourceMappingURL=appointmentTypes.routes.js.map