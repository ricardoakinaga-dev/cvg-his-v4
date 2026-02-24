import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { and, eq, or, like, desc } from 'drizzle-orm';
import { collaborators, collaboratorAvailability, collaboratorTimeOff, auditEvents } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';

// Zod Schemas
const getCollaboratorsQuerySchema = z.object({
    query: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    roleTitle: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50)
});

const createCollabSchema = z.object({
    name: z.string().min(1),
    roleTitle: z.string().optional(),
    specialty: z.string().optional(),
    licenseType: z.string().optional(),
    licenseNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    defaultAppointmentDurationMinutes: z.number().int().positive().default(30)
});

const updateCollabSchema = z.object({
    name: z.string().min(1).optional(),
    roleTitle: z.string().nullable().optional(),
    specialty: z.string().nullable().optional(),
    licenseType: z.string().nullable().optional(),
    licenseNumber: z.string().nullable().optional(),
    email: z.string().email().nullable().or(z.literal('')).optional(),
    phone: z.string().nullable().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    defaultAppointmentDurationMinutes: z.number().int().positive().optional()
});

// Helper: Create audit event
async function createAuditEvent(
    db: any,
    data: {
        accountId: string;
        actorUserId?: string;
        entityType: string;
        entityId: string;
        action: string;
        before?: any;
        after?: any;
    }
) {
    await db.insert(auditEvents).values({
        accountId: data.accountId,
        actorUserId: data.actorUserId || null,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        beforeJson: data.before || null,
        afterJson: data.after || null
    });
}

export const collaboratorsRoutes: FastifyPluginAsync = async (app) => {
    // GET /agenda/collaborators - List with filters
    app.get(
        '/',
        { preHandler: requirePermission('agenda.colaboradores.read') },
        async (request, reply) => {
            const query = getCollaboratorsQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const conditions = [eq(collaborators.accountId, accountId)];

            if (query.status) {
                conditions.push(eq(collaborators.status, query.status));
            }

            if (query.roleTitle) {
                conditions.push(eq(collaborators.roleTitle, query.roleTitle));
            }

            if (query.query) {
                const searchTerm = `%${query.query}%`;
                conditions.push(
                    or(
                        like(collaborators.name, searchTerm),
                        like(collaborators.email, searchTerm),
                        like(collaborators.phone, searchTerm)
                    )!
                );
            }

            const offset = (query.page - 1) * query.pageSize;

            const results = await db
                .select()
                .from(collaborators)
                .where(and(...conditions))
                .orderBy(desc(collaborators.createdAt))
                .limit(query.pageSize)
                .offset(offset);

            // Get total count
            const countResult = await db
                .select({ id: collaborators.id })
                .from(collaborators)
                .where(and(...conditions));

            const total = countResult.length;

            return reply.send({
                data: results,
                pagination: {
                    page: query.page,
                    pageSize: query.pageSize,
                    total,
                    totalPages: Math.ceil(total / query.pageSize)
                }
            });
        }
    );

    // GET /agenda/collaborators/:id - Get by ID
    app.get(
        '/:id',
        { preHandler: requirePermission('agenda.colaboradores.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [result] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!result) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            return reply.send(result);
        }
    );

    // POST /agenda/collaborators - Create
    app.post(
        '/',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const body = createCollabSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            const [newCollab] = await db
                .insert(collaborators)
                .values({
                    accountId,
                    name: body.name,
                    roleTitle: body.roleTitle,
                    specialty: body.specialty,
                    licenseType: body.licenseType,
                    licenseNumber: body.licenseNumber,
                    email: body.email || null,
                    phone: body.phone,
                    defaultAppointmentDurationMinutes: body.defaultAppointmentDurationMinutes,
                    status: 'active'
                })
                .returning();

            // Create default availability (Mon-Fri 08-18 with lunch break)
            const defaultAvail = [];
            for (let weekday = 1; weekday <= 5; weekday++) {
                defaultAvail.push({
                    accountId,
                    collaboratorId: newCollab.id,
                    weekday,
                    startTime: '08:00',
                    endTime: '18:00',
                    breaksJson: [{ start: '12:00', end: '13:00' }],
                    active: true
                });
            }
            await db.insert(collaboratorAvailability).values(defaultAvail);

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'collaborator',
                entityId: newCollab.id,
                action: 'create',
                after: newCollab
            });

            return reply.status(201).send(newCollab);
        }
    );

    // PUT /agenda/collaborators/:id - Update
    app.put(
        '/:id',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = updateCollabSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing
            const [existing] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            // Build update object
            const updateData: any = { updatedAt: new Date() };
            if (body.name) updateData.name = body.name;
            if (body.roleTitle !== undefined) updateData.roleTitle = body.roleTitle;
            if (body.specialty !== undefined) updateData.specialty = body.specialty;
            if (body.licenseType !== undefined) updateData.licenseType = body.licenseType;
            if (body.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber;
            if (body.email !== undefined) updateData.email = body.email;
            if (body.phone !== undefined) updateData.phone = body.phone;
            if (body.status) updateData.status = body.status;
            if (body.defaultAppointmentDurationMinutes) updateData.defaultAppointmentDurationMinutes = body.defaultAppointmentDurationMinutes;

            const [updated] = await db
                .update(collaborators)
                .set(updateData)
                .where(eq(collaborators.id, params.id))
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'collaborator',
                entityId: params.id,
                action: 'update',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );

    // GET /agenda/collaborators/:id/availability - Get availability
    app.get(
        '/:id/availability',
        { preHandler: requirePermission('agenda.colaboradores.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            const availability = await db
                .select()
                .from(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, params.id)
                ))
                .orderBy(collaboratorAvailability.weekday);

            return reply.send({
                collaboratorId: params.id,
                collaboratorName: collab.name,
                availability
            });
        }
    );

    // PUT /agenda/collaborators/:id/availability - Replace availability
    app.put(
        '/:id/availability',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = z.object({
                availability: z.array(z.object({
                    weekday: z.number().int().min(0).max(6),
                    startTime: z.string().regex(/^\d{2}:\d{2}$/),
                    endTime: z.string().regex(/^\d{2}:\d{2}$/),
                    breaksJson: z.array(z.object({
                        start: z.string().regex(/^\d{2}:\d{2}$/),
                        end: z.string().regex(/^\d{2}:\d{2}$/)
                    })).default([]),
                    active: z.boolean().default(true)
                }))
            }).parse(request.body);

            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            // Delete existing
            await db
                .delete(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, params.id)
                ));

            // Insert new
            if (body.availability.length > 0) {
                const values = body.availability.map(a => ({
                    accountId,
                    collaboratorId: params.id,
                    weekday: a.weekday,
                    startTime: a.startTime,
                    endTime: a.endTime,
                    breaksJson: a.breaksJson,
                    active: a.active
                }));
                await db.insert(collaboratorAvailability).values(values);
            }

            // Fetch updated
            const updated = await db
                .select()
                .from(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, params.id)
                ))
                .orderBy(collaboratorAvailability.weekday);

            return reply.send({
                collaboratorId: params.id,
                availability: updated
            });
        }
    );

    // GET /agenda/collaborators/:id/time-off - Get time-off entries
    app.get(
        '/:id/time-off',
        { preHandler: requirePermission('agenda.colaboradores.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            const timeOffs = await db
                .select()
                .from(collaboratorTimeOff)
                .where(and(
                    eq(collaboratorTimeOff.accountId, accountId),
                    eq(collaboratorTimeOff.collaboratorId, params.id)
                ))
                .orderBy(desc(collaboratorTimeOff.startAt));

            return reply.send({
                collaboratorId: params.id,
                timeOffs
            });
        }
    );

    // POST /agenda/collaborators/:id/time-off - Create time-off
    app.post(
        '/:id/time-off',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = z.object({
                startAt: z.string().datetime(),
                endAt: z.string().datetime(),
                reason: z.string().optional()
            }).parse(request.body);

            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, params.id), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            const startAt = new Date(body.startAt);
            const endAt = new Date(body.endAt);

            if (endAt <= startAt) {
                return reply.status(400).send({ code: 'INVALID_TIME', message: 'End time must be after start time' });
            }

            const [newTimeOff] = await db
                .insert(collaboratorTimeOff)
                .values({
                    accountId,
                    collaboratorId: params.id,
                    startAt,
                    endAt,
                    reason: body.reason
                })
                .returning();

            return reply.status(201).send(newTimeOff);
        }
    );

    // DELETE /agenda/collaborators/:id/time-off/:timeOffId - Delete time-off
    app.delete(
        '/:id/time-off/:timeOffId',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const params = z.object({
                id: z.string().uuid(),
                timeOffId: z.string().uuid()
            }).parse(request.params);

            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [deleted] = await db
                .delete(collaboratorTimeOff)
                .where(and(
                    eq(collaboratorTimeOff.id, params.timeOffId),
                    eq(collaboratorTimeOff.accountId, accountId),
                    eq(collaboratorTimeOff.collaboratorId, params.id)
                ))
                .returning();

            if (!deleted) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Registro de folga não encontrado' });
            }

            return reply.send({ success: true });
        }
    );
};
