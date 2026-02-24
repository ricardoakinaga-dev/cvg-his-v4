import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { collaboratorAvailability } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
const getSlotsQuerySchema = z.object({
    collaboratorId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
});
export const availabilityRoutes = async (app) => {
    app.get('/slots', { preHandler: requirePermission('agenda.agendamentos.read') }, async (request) => {
        const query = getSlotsQuerySchema.parse(request.query);
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        // Simplistic slot logic for MVP: just get the collaborator's weekly availability
        // A more robust implementation would subtract conflicts (existing appointments).
        const d = new Date(query.date);
        const weekday = d.getUTCDay(); // 0 is Sunday
        const avails = await db
            .select()
            .from(collaboratorAvailability)
            .where(and(eq(collaboratorAvailability.accountId, accountId), eq(collaboratorAvailability.collaboratorId, query.collaboratorId), eq(collaboratorAvailability.weekday, weekday), eq(collaboratorAvailability.active, true)));
        if (avails.length === 0) {
            return [];
        }
        // Return raw windows for MVP
        return avails.map((a) => ({
            startTime: a.startTime,
            endTime: a.endTime,
            breaks: a.breaksJson,
        }));
    });
};
//# sourceMappingURL=availability.routes.js.map