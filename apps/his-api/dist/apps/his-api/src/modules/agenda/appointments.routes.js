import { z } from 'zod';
import { and, eq, or, lt, gt } from 'drizzle-orm';
import { appointments } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { can } from '@cvg-his/rbac';
const createApptSchema = z.object({
    typeId: z.string().uuid(),
    serviceId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    primaryCollaboratorId: z.string().uuid(),
    resourceId: z.string().uuid().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    notes: z.string().optional(),
    forceOverbook: z.boolean().default(false)
});
export const appointmentsRoutes = async (app) => {
    app.get('/', { preHandler: requirePermission('agenda.agendamentos.read') }, async (request) => {
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        return db.select().from(appointments).where(eq(appointments.accountId, accountId));
    });
    app.post('/', { preHandler: requirePermission('agenda.agendamentos.create') }, async (request, reply) => {
        const body = createApptSchema.parse(request.body);
        const db = app.db;
        const accountId = request.requestContext.actor.accountId;
        const userId = request.requestContext.actor.userId;
        const newStart = new Date(body.startAt);
        const newEnd = new Date(body.endAt);
        if (newEnd <= newStart) {
            return reply.status(400).send({ message: 'End time must be after start time' });
        }
        // Conflict Engine Check
        // Overlap formula: existing_start < new_end AND existing_end > new_start
        const conflicts = await db
            .select({ id: appointments.id })
            .from(appointments)
            .where(and(eq(appointments.accountId, accountId), or(eq(appointments.primaryCollaboratorId, body.primaryCollaboratorId), body.resourceId ? eq(appointments.resourceId, body.resourceId) : undefined), lt(appointments.startAt, newEnd), gt(appointments.endAt, newStart), 
        // Don't flag cancelled ones
        eq(appointments.status, 'scheduled')));
        if (conflicts.length > 0) {
            if (!body.forceOverbook) {
                return reply.status(409).send({ message: 'Conflict detected', conflicts });
            }
            // Checks if user has overbook permission
            const principal = request.requestContext.actor ? { role: request.requestContext.actor.role || '', roles: request.requestContext.actor.roles, permissions: request.requestContext.actor.permissions } : { roles: [] };
            if (!can(principal, 'agenda.agendamentos.overbook')) {
                return reply.status(403).send({ message: 'Missing agenda.agendamentos.overbook permission' });
            }
        }
        const [newAppt] = await db
            .insert(appointments)
            .values({
            accountId,
            typeId: body.typeId,
            serviceId: body.serviceId,
            ownerId: body.ownerId,
            patientId: body.patientId,
            primaryCollaboratorId: body.primaryCollaboratorId,
            resourceId: body.resourceId,
            startAt: newStart,
            endAt: newEnd,
            notes: body.notes,
            status: 'scheduled',
            createdBy: userId,
            updatedBy: userId
        })
            .returning();
        return reply.status(201).send(newAppt);
    });
};
//# sourceMappingURL=appointments.routes.js.map