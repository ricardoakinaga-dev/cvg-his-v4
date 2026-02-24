import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { and, eq, gte, lte, inArray, or, not, isNull, desc } from 'drizzle-orm';
import {
    appointments,
    appointmentTypes,
    appointmentTeam,
    collaborators,
    resources,
    owners,
    patients,
    services,
    auditEvents
} from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { can } from '@cvg-his/rbac';

// Valid status values
const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'arrived', 'in_progress', 'done', 'canceled', 'no_show'] as const;
const CANCELLABLE_STATUSES = ['scheduled', 'confirmed', 'arrived'];
const CONFIRMABLE_STATUSES = ['scheduled'];

// Zod Schemas
const getAppointmentQuerySchema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    collaboratorId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    typeId: z.string().uuid().optional(),
    sector: z.string().optional(),
    ownerId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50)
});

const createAppointmentSchema = z.object({
    typeId: z.string().uuid(),
    serviceId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    primaryCollaboratorId: z.string().uuid(),
    resourceId: z.string().uuid().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    notes: z.string().optional(),
    team: z.array(z.object({
        collaboratorId: z.string().uuid(),
        role: z.enum(['surgeon', 'anesthetist', 'assistant', 'nurse', 'other'])
    })).optional(),
    forceOverbook: z.boolean().default(false)
});

const updateAppointmentSchema = z.object({
    typeId: z.string().uuid().optional(),
    serviceId: z.string().uuid().nullable().optional(),
    ownerId: z.string().uuid().nullable().optional(),
    patientId: z.string().uuid().nullable().optional(),
    primaryCollaboratorId: z.string().uuid().optional(),
    resourceId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    notes: z.string().nullable().optional(),
    team: z.array(z.object({
        collaboratorId: z.string().uuid(),
        role: z.enum(['surgeon', 'anesthetist', 'assistant', 'nurse', 'other'])
    })).optional(),
    forceOverbook: z.boolean().default(false)
});

const cancelAppointmentSchema = z.object({
    reason: z.string().optional()
});

// Helper: Check for conflicts
async function hasConflict(
    db: any,
    accountId: string,
    collaboratorId: string,
    startAt: Date,
    endAt: Date,
    resourceId?: string | null,
    ignoreAppointmentId?: string
): Promise<{ hasConflict: boolean; conflicts: any[] }> {
    const conditions = [
        eq(appointments.accountId, accountId),
        not(inArray(appointments.status, ['canceled', 'no_show'])),
        lte(appointments.startAt, endAt),
        gte(appointments.endAt, startAt)
    ];

    // Check collaborator conflict
    const collaboratorConditions = [...conditions, eq(appointments.primaryCollaboratorId, collaboratorId)];
    
    if (ignoreAppointmentId) {
        collaboratorConditions.push(not(eq(appointments.id, ignoreAppointmentId)));
    }

    const collaboratorConflicts = await db
        .select({
            id: appointments.id,
            startAt: appointments.startAt,
            endAt: appointments.endAt,
            primaryCollaboratorId: appointments.primaryCollaboratorId
        })
        .from(appointments)
        .where(and(...collaboratorConditions));

    let resourceConflicts: any[] = [];
    if (resourceId) {
        const resourceConditions = [...conditions, eq(appointments.resourceId, resourceId)];
        if (ignoreAppointmentId) {
            resourceConditions.push(not(eq(appointments.id, ignoreAppointmentId)));
        }
        resourceConflicts = await db
            .select({
                id: appointments.id,
                startAt: appointments.startAt,
                endAt: appointments.endAt,
                resourceId: appointments.resourceId
            })
            .from(appointments)
            .where(and(...resourceConditions));
    }

    const allConflicts = [...collaboratorConflicts, ...resourceConflicts];
    return {
        hasConflict: allConflicts.length > 0,
        conflicts: allConflicts
    };
}

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

export const appointmentsRoutes: FastifyPluginAsync = async (app) => {
    // GET /agenda/appointments - List with filters
    app.get(
        '/',
        { preHandler: requirePermission('agenda.agendamentos.read') },
        async (request, reply) => {
            const query = getAppointmentQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const conditions = [eq(appointments.accountId, accountId)];

            if (query.from) {
                conditions.push(gte(appointments.startAt, new Date(query.from)));
            }
            if (query.to) {
                conditions.push(lte(appointments.endAt, new Date(query.to)));
            }
            if (query.collaboratorId) {
                conditions.push(eq(appointments.primaryCollaboratorId, query.collaboratorId));
            }
            if (query.resourceId) {
                conditions.push(eq(appointments.resourceId, query.resourceId));
            }
            if (query.typeId) {
                conditions.push(eq(appointments.typeId, query.typeId));
            }
            if (query.ownerId) {
                conditions.push(eq(appointments.ownerId, query.ownerId));
            }
            if (query.patientId) {
                conditions.push(eq(appointments.patientId, query.patientId));
            }
            if (query.status) {
                conditions.push(eq(appointments.status, query.status));
            }

            const offset = (query.page - 1) * query.pageSize;

            const results = await db
                .select({
                    id: appointments.id,
                    typeId: appointments.typeId,
                    typeName: appointmentTypes.name,
                    typeCode: appointmentTypes.code,
                    serviceId: appointments.serviceId,
                    serviceName: services.name,
                    ownerId: appointments.ownerId,
                    ownerName: owners.name,
                    patientId: appointments.patientId,
                    patientName: patients.name,
                    primaryCollaboratorId: appointments.primaryCollaboratorId,
                    collaboratorName: collaborators.name,
                    resourceId: appointments.resourceId,
                    resourceName: resources.name,
                    startAt: appointments.startAt,
                    endAt: appointments.endAt,
                    status: appointments.status,
                    notes: appointments.notes,
                    createdAt: appointments.createdAt,
                    updatedAt: appointments.updatedAt
                })
                .from(appointments)
                .leftJoin(appointmentTypes, eq(appointments.typeId, appointmentTypes.id))
                .leftJoin(services, eq(appointments.serviceId, services.id))
                .leftJoin(owners, eq(appointments.ownerId, owners.id))
                .leftJoin(patients, eq(appointments.patientId, patients.id))
                .leftJoin(collaborators, eq(appointments.primaryCollaboratorId, collaborators.id))
                .leftJoin(resources, eq(appointments.resourceId, resources.id))
                .where(and(...conditions))
                .orderBy(desc(appointments.startAt))
                .limit(query.pageSize)
                .offset(offset);

            // Get total count for pagination
            const countResult = await db
                .select({ count: appointments.id })
                .from(appointments)
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

    // GET /agenda/appointments/:id - Get by ID
    app.get(
        '/:id',
        { preHandler: requirePermission('agenda.agendamentos.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [result] = await db
                .select({
                    id: appointments.id,
                    typeId: appointments.typeId,
                    typeName: appointmentTypes.name,
                    typeCode: appointmentTypes.code,
                    typeSector: appointmentTypes.sector,
                    typeRequiresTeam: appointmentTypes.requiresTeam,
                    typeRequiresResource: appointmentTypes.requiresResource,
                    serviceId: appointments.serviceId,
                    serviceName: services.name,
                    ownerId: appointments.ownerId,
                    ownerName: owners.name,
                    ownerPhone: owners.phoneMain,
                    patientId: appointments.patientId,
                    patientName: patients.name,
                    patientSpecies: patients.species,
                    primaryCollaboratorId: appointments.primaryCollaboratorId,
                    collaboratorName: collaborators.name,
                    collaboratorRoleTitle: collaborators.roleTitle,
                    resourceId: appointments.resourceId,
                    resourceName: resources.name,
                    resourceType: resources.type,
                    startAt: appointments.startAt,
                    endAt: appointments.endAt,
                    status: appointments.status,
                    notes: appointments.notes,
                    createdBy: appointments.createdBy,
                    updatedBy: appointments.updatedBy,
                    createdAt: appointments.createdAt,
                    updatedAt: appointments.updatedAt
                })
                .from(appointments)
                .leftJoin(appointmentTypes, eq(appointments.typeId, appointmentTypes.id))
                .leftJoin(services, eq(appointments.serviceId, services.id))
                .leftJoin(owners, eq(appointments.ownerId, owners.id))
                .leftJoin(patients, eq(appointments.patientId, patients.id))
                .leftJoin(collaborators, eq(appointments.primaryCollaboratorId, collaborators.id))
                .leftJoin(resources, eq(appointments.resourceId, resources.id))
                .where(and(eq(appointments.id, params.id), eq(appointments.accountId, accountId)))
                .limit(1);

            if (!result) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
            }

            // Get team members if any
            const team = await db
                .select({
                    id: appointmentTeam.id,
                    collaboratorId: appointmentTeam.collaboratorId,
                    collaboratorName: collaborators.name,
                    teamRole: appointmentTeam.teamRole
                })
                .from(appointmentTeam)
                .leftJoin(collaborators, eq(appointmentTeam.collaboratorId, collaborators.id))
                .where(eq(appointmentTeam.appointmentId, params.id));

            return reply.send({ ...result, team });
        }
    );

    // POST /agenda/appointments - Create
    app.post(
        '/',
        { preHandler: requirePermission('agenda.agendamentos.create') },
        async (request, reply) => {
            const body = createAppointmentSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            const newStart = new Date(body.startAt);
            const newEnd = new Date(body.endAt);

            // Validate end > start
            if (newEnd <= newStart) {
                return reply.status(400).send({ code: 'INVALID_TIME', message: 'End time must be after start time' });
            }

            // Validate appointment type exists
            const [apptType] = await db
                .select()
                .from(appointmentTypes)
                .where(and(eq(appointmentTypes.id, body.typeId), eq(appointmentTypes.accountId, accountId)))
                .limit(1);

            if (!apptType) {
                return reply.status(400).send({ code: 'INVALID_TYPE', message: 'Tipo de agendamento não encontrado' });
            }

            // Validate collaborator exists
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(eq(collaborators.id, body.primaryCollaboratorId), eq(collaborators.accountId, accountId)))
                .limit(1);

            if (!collab) {
                return reply.status(400).send({ code: 'INVALID_COLLABORATOR', message: 'Colaborador não encontrado' });
            }

            // Validate patient belongs to owner if both provided
            if (body.ownerId && body.patientId) {
                const [patient] = await db
                    .select()
                    .from(patients)
                    .where(and(eq(patients.id, body.patientId), eq(patients.ownerId, body.ownerId)))
                    .limit(1);

                if (!patient) {
                    return reply.status(400).send({ code: 'INVALID_PATIENT_OWNER', message: 'Paciente não pertence ao tutor informado' });
                }
            }

            // Check for conflicts
            const { hasConflict: hasConf, conflicts } = await hasConflict(
                db,
                accountId,
                body.primaryCollaboratorId,
                newStart,
                newEnd,
                body.resourceId
            );

            if (hasConf) {
                if (!body.forceOverbook) {
                    return reply.status(409).send({
                        code: 'CONFLICT',
                        message: 'Conflito de horário detectado',
                        conflicts
                    });
                }

                // Check overbook permission
                const principal = request.requestContext.actor
                    ? {
                        role: request.requestContext.actor.role || '',
                        roles: request.requestContext.actor.roles,
                        permissions: request.requestContext.actor.permissions
                    }
                    : { roles: [] };

                if (!can(principal, 'agenda.agendamentos.overbook')) {
                    return reply.status(403).send({
                        code: 'FORBIDDEN',
                        message: 'Permissão de overbook necessária'
                    });
                }
            }

            // Create appointment
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

            // Create team members if provided
            if (body.team && body.team.length > 0) {
                const teamValues = body.team.map((t) => ({
                    accountId,
                    appointmentId: newAppt.id,
                    collaboratorId: t.collaboratorId,
                    teamRole: t.role
                }));

                await db.insert(appointmentTeam).values(teamValues);
            }

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment',
                entityId: newAppt.id,
                action: 'create',
                after: newAppt
            });

            return reply.status(201).send(newAppt);
        }
    );

    // PUT /agenda/appointments/:id - Update
    app.put(
        '/:id',
        { preHandler: requirePermission('agenda.agendamentos.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = updateAppointmentSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing appointment
            const [existing] = await db
                .select()
                .from(appointments)
                .where(and(eq(appointments.id, params.id), eq(appointments.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
            }

            // Cannot update canceled or done appointments
            if (['canceled', 'done'].includes(existing.status)) {
                return reply.status(400).send({
                    code: 'INVALID_STATUS',
                    message: 'Não é possível alterar agendamento cancelado ou finalizado'
                });
            }

            const newStart = body.startAt ? new Date(body.startAt) : existing.startAt;
            const newEnd = body.endAt ? new Date(body.endAt) : existing.endAt;
            const newCollaboratorId = body.primaryCollaboratorId || existing.primaryCollaboratorId;
            const newResourceId = body.resourceId !== undefined ? body.resourceId : existing.resourceId;

            // Validate end > start
            if (newEnd <= newStart) {
                return reply.status(400).send({ code: 'INVALID_TIME', message: 'End time must be after start time' });
            }

            // Check for conflicts if time or collaborator changed
            if (body.startAt || body.endAt || body.primaryCollaboratorId || body.resourceId !== undefined) {
                const { hasConflict: hasConf, conflicts } = await hasConflict(
                    db,
                    accountId,
                    newCollaboratorId,
                    newStart,
                    newEnd,
                    newResourceId,
                    params.id
                );

                if (hasConf) {
                    if (!body.forceOverbook) {
                        return reply.status(409).send({
                            code: 'CONFLICT',
                            message: 'Conflito de horário detectado',
                            conflicts
                        });
                    }

                    const principal = request.requestContext.actor
                        ? {
                            role: request.requestContext.actor.role || '',
                            roles: request.requestContext.actor.roles,
                            permissions: request.requestContext.actor.permissions
                        }
                        : { roles: [] };

                    if (!can(principal, 'agenda.agendamentos.overbook')) {
                        return reply.status(403).send({
                            code: 'FORBIDDEN',
                            message: 'Permissão de overbook necessária'
                        });
                    }
                }
            }

            // Update appointment
            const updateData: any = {
                updatedAt: new Date(),
                updatedBy: userId
            };

            if (body.typeId) updateData.typeId = body.typeId;
            if (body.serviceId !== undefined) updateData.serviceId = body.serviceId;
            if (body.ownerId !== undefined) updateData.ownerId = body.ownerId;
            if (body.patientId !== undefined) updateData.patientId = body.patientId;
            if (body.primaryCollaboratorId) updateData.primaryCollaboratorId = body.primaryCollaboratorId;
            if (body.resourceId !== undefined) updateData.resourceId = body.resourceId;
            if (body.startAt) updateData.startAt = newStart;
            if (body.endAt) updateData.endAt = newEnd;
            if (body.notes !== undefined) updateData.notes = body.notes;

            const [updated] = await db
                .update(appointments)
                .set(updateData)
                .where(eq(appointments.id, params.id))
                .returning();

            // Update team if provided
            if (body.team) {
                // Delete existing team
                await db.delete(appointmentTeam).where(eq(appointmentTeam.appointmentId, params.id));

                // Insert new team
                if (body.team.length > 0) {
                    const teamValues = body.team.map((t) => ({
                        accountId,
                        appointmentId: params.id,
                        collaboratorId: t.collaboratorId,
                        teamRole: t.role
                    }));
                    await db.insert(appointmentTeam).values(teamValues);
                }
            }

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment',
                entityId: params.id,
                action: 'update',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );

    // POST /agenda/appointments/:id/cancel - Cancel appointment
    app.post(
        '/:id/cancel',
        { preHandler: requirePermission('agenda.agendamentos.cancel') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = cancelAppointmentSchema.parse(request.body || {});
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing appointment
            const [existing] = await db
                .select()
                .from(appointments)
                .where(and(eq(appointments.id, params.id), eq(appointments.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
            }

            // Check if can be canceled
            if (!CANCELLABLE_STATUSES.includes(existing.status as any)) {
                return reply.status(400).send({
                    code: 'INVALID_STATUS',
                    message: `Agendamento com status '${existing.status}' não pode ser cancelado`
                });
            }

            // Update status
            const [updated] = await db
                .update(appointments)
                .set({
                    status: 'canceled',
                    notes: body.reason
                        ? `${existing.notes || ''}\n[Motivo cancelamento: ${body.reason}]`.trim()
                        : existing.notes,
                    updatedAt: new Date(),
                    updatedBy: userId
                })
                .where(eq(appointments.id, params.id))
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment',
                entityId: params.id,
                action: 'cancel',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );

    // POST /agenda/appointments/:id/confirm - Confirm appointment
    app.post(
        '/:id/confirm',
        { preHandler: requirePermission('agenda.agendamentos.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing appointment
            const [existing] = await db
                .select()
                .from(appointments)
                .where(and(eq(appointments.id, params.id), eq(appointments.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' });
            }

            // Check if can be confirmed
            if (!CONFIRMABLE_STATUSES.includes(existing.status as any)) {
                return reply.status(400).send({
                    code: 'INVALID_STATUS',
                    message: `Agendamento com status '${existing.status}' não pode ser confirmado`
                });
            }

            // Update status
            const [updated] = await db
                .update(appointments)
                .set({
                    status: 'confirmed',
                    updatedAt: new Date(),
                    updatedBy: userId
                })
                .where(eq(appointments.id, params.id))
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment',
                entityId: params.id,
                action: 'confirm',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );
};
