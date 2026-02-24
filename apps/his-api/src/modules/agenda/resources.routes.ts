import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { and, eq, or, like, desc } from 'drizzle-orm';
import { resources, auditEvents } from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';

// Zod Schemas
const getResourcesQuerySchema = z.object({
    query: z.string().optional(),
    type: z.enum(['room', 'surgery_room', 'equipment']).optional(),
    active: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50)
});

const createResourceSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['room', 'surgery_room', 'equipment']),
    active: z.boolean().default(true)
});

const updateResourceSchema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['room', 'surgery_room', 'equipment']).optional(),
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

export const resourcesRoutes: FastifyPluginAsync = async (app) => {
    // GET /agenda/resources - List with filters
    app.get(
        '/',
        { preHandler: requirePermission('agenda.recursos.read') },
        async (request, reply) => {
            const query = getResourcesQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const conditions = [eq(resources.accountId, accountId)];

            if (query.type) {
                conditions.push(eq(resources.type, query.type));
            }

            if (query.active !== undefined) {
                conditions.push(eq(resources.active, query.active));
            }

            if (query.query) {
                const searchTerm = `%${query.query}%`;
                conditions.push(like(resources.name, searchTerm)!);
            }

            const offset = (query.page - 1) * query.pageSize;

            const results = await db
                .select()
                .from(resources)
                .where(and(...conditions))
                .orderBy(desc(resources.createdAt))
                .limit(query.pageSize)
                .offset(offset);

            // Get total count
            const countResult = await db
                .select({ id: resources.id })
                .from(resources)
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

    // GET /agenda/resources/:id - Get by ID
    app.get(
        '/:id',
        { preHandler: requirePermission('agenda.recursos.read') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [result] = await db
                .select()
                .from(resources)
                .where(and(eq(resources.id, params.id), eq(resources.accountId, accountId)))
                .limit(1);

            if (!result) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Recurso não encontrado' });
            }

            return reply.send(result);
        }
    );

    // POST /agenda/resources - Create
    app.post(
        '/',
        { preHandler: requirePermission('agenda.recursos.update') },
        async (request, reply) => {
            const body = createResourceSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            const [newRes] = await db
                .insert(resources)
                .values({
                    accountId,
                    name: body.name,
                    type: body.type,
                    active: body.active
                })
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'resource',
                entityId: newRes.id,
                action: 'create',
                after: newRes
            });

            return reply.status(201).send(newRes);
        }
    );

    // PUT /agenda/resources/:id - Update
    app.put(
        '/:id',
        { preHandler: requirePermission('agenda.recursos.update') },
        async (request, reply) => {
            const params = z.object({ id: z.string().uuid() }).parse(request.params);
            const body = updateResourceSchema.parse(request.body);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;
            const userId = request.requestContext.actor!.userId;

            // Get existing
            const [existing] = await db
                .select()
                .from(resources)
                .where(and(eq(resources.id, params.id), eq(resources.accountId, accountId)))
                .limit(1);

            if (!existing) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Recurso não encontrado' });
            }

            // Build update object
            const updateData: any = { updatedAt: new Date() };
            if (body.name) updateData.name = body.name;
            if (body.type) updateData.type = body.type;
            if (body.active !== undefined) updateData.active = body.active;

            const [updated] = await db
                .update(resources)
                .set(updateData)
                .where(eq(resources.id, params.id))
                .returning();

            // Create audit event
            await createAuditEvent(db, {
                accountId,
                actorUserId: userId,
                entityType: 'resource',
                entityId: params.id,
                action: 'update',
                before: existing,
                after: updated
            });

            return reply.send(updated);
        }
    );
};
