import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { and, eq, or, like, desc } from 'drizzle-orm';
import { appointmentTypes, auditEvents } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';

// Valid sectors
const SECTORS = ['geral', 'clinica', 'internacao', 'imagem', 'laboratorio', 'cirurgia'] as const;

// Zod Schemas
const getTypesQuerySchema = z.object({
    query: z.string().optional(),
    sector: z.enum(SECTORS).optional(),
    active: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50)
});

const createTypeSchema = z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1),
    sector: z.enum(SECTORS),
    defaultDurationMinutes: z.number().int().positive().default(30),
    requiresResource: z.boolean().default(false),
    requiresTeam: z.boolean().default(false),
    active: z.boolean().default(true)
});

const updateTypeSchema = z.object({
    code: z.string().min(1).max(20).optional(),
    name: z.string().min(1).optional(),
    sector: z.enum(SECTORS).optional(),
    defaultDurationMinutes: z.number().int().positive().optional(),
    requiresResource: z.boolean().optional(),
    requiresTeam: z.boolean().optional(),
    active: z.boolean().optional()
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

export const appointmentTypesRoutes: FastifyPluginAsync = async (app) => {
    // GET /agenda/appointment-types - List with filters
    app.get(
        '/',
        { preHandler: requirePermission('agenda.config.read') },
        async (request, reply) => {
            const query = getTypesQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const conditions = [eq(appointmentTypes.accountId, accountId)];

            if (query.sector) {
                conditions.push(eq(appointmentTypes.sector, query.sector));
            }

            if (query.active !== undefined) {
                conditions.push(eq(appointmentTypes.active, query.active));
            }

            if (query.query) {
                const searchTerm = `%${query.query}%`;
                conditions.push(
                    or(
                        like(appointmentTypes.name, searchTerm),
                        like(appointmentTypes.code, searchTerm)
                    )!
                );
            }

            const offset = (query.page - 1) * query.pageSize;

            const results = await db
                .select()
                .from(appointmentTypes)
                .where(and(...conditions))
                .orderBy(desc(appointmentTypes.createdAt))
                .limit(query.pageSize)
                .offset(offset);

            // Get total count
            const countResult = await db
                .select({ id: appointmentTypes.id })
                .from(appointmentTypes)
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

    // GET /agenda/appointment-types/:id - Get by ID
    app.get(
        '/:id',
        { preHandler: requirePermission('agenda.config.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [result] = await db
                .select()
                .from(appointmentTypes)
                .where(and(eq(appointmentTypes.id, params.id), eq(appointmentTypes.accountId, accountId)))
                .limit(1);

            if (!result) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tipo de agendamento não encontrado' });
            }

            return reply.send(result);
        }
    );

    // POST /agenda/appointment-types - Create
    app.post(
        '/',
        { preHandler: requirePermission('agenda.config.update') },
        async (request, reply) => {
            const body = createTypeSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Check for duplicate code
            const [existing] = await db
                .select()
                .from(appointmentTypes)
                .where(and(
                    eq(appointmentTypes.accountId, accountId),
                    eq(appointmentTypes.code, body.code)
                ))
                .limit(1);

            if (existing) {
                return reply.status(409).send({
                    code: 'DUPLICATE_CODE',
                    message: 'Já existe um tipo de agendamento com este código'
                });
            }

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
                    active: body.active
                })
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment_type',
                entityId: newType.id,
                action: 'create',
                after: newType
            });

            return reply.status(201).send(newType);
        }
    );

    // PUT /agenda/appointment-types/:id - Update
    app.put(
        '/:id',
        { preHandler: requirePermission('agenda.config.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = updateTypeSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing
            const [existing] = await db
                .select()
                .from(appointmentTypes)
                .where(and(eq(appointmentTypes.id, params.id), eq(appointmentTypes.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tipo de agendamento não encontrado' });
            }

            // Check for duplicate code if changing
            if (body.code && body.code !== existing.code) {
                const [duplicate] = await db
                    .select()
                    .from(appointmentTypes)
                    .where(and(
                        eq(appointmentTypes.accountId, accountId),
                        eq(appointmentTypes.code, body.code)
                    ))
                    .limit(1);

                if (duplicate) {
                    return reply.status(409).send({
                        code: 'DUPLICATE_CODE',
                        message: 'Já existe um tipo de agendamento com este código'
                    });
                }
            }

            // Build update object
            const updateData: any = {};
            if (body.code) updateData.code = body.code;
            if (body.name) updateData.name = body.name;
            if (body.sector) updateData.sector = body.sector;
            if (body.defaultDurationMinutes) updateData.defaultDurationMinutes = body.defaultDurationMinutes;
            if (body.requiresResource !== undefined) updateData.requiresResource = body.requiresResource;
            if (body.requiresTeam !== undefined) updateData.requiresTeam = body.requiresTeam;
            if (body.active !== undefined) updateData.active = body.active;

            const [updated] = await db
                .update(appointmentTypes)
                .set(updateData)
                .where(eq(appointmentTypes.id, params.id))
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'appointment_type',
                entityId: params.id,
                action: 'update',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );
};
