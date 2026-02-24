import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { and, eq, gte, lte, not, inArray } from 'drizzle-orm';
import {
    collaboratorAvailability,
    collaboratorTimeOff,
    appointments,
    appointmentTypes,
    collaborators
} from '@cvg-his/db';
import { requirePermission } from '../../middlewares/requirePermission.js';

// Timezone for slot generation (America/Sao_Paulo = UTC-3)
const TIMEZONE_OFFSET_HOURS = -3;

// Zod Schemas
const getSlotsQuerySchema = z.object({
    collaboratorId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    typeId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional()
});

const getAvailabilityQuerySchema = z.object({
    collaboratorId: z.string().uuid()
});

const upsertAvailabilitySchema = z.object({
    availability: z.array(z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
        breaksJson: z.array(z.object({
            start: z.string().regex(/^\d{2}:\d{2}$/),
            end: z.string().regex(/^\d{2}:\d{2}$/)
        })).default([]),
        active: z.boolean().default(true)
    }))
});

const createTimeOffSchema = z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().optional()
});

// Helper: Convert time string (HH:MM) to minutes since midnight
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper: Convert minutes since midnight to time string (HH:MM)
function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper: Generate time slots from working windows
function generateSlots(
    windows: { start: number; end: number }[],
    durationMinutes: number,
    stepMinutes: number = 15
): { start: string; end: string }[] {
    const slots: { start: string; end: string }[] = [];

    for (const window of windows) {
        let current = window.start;
        while (current + durationMinutes <= window.end) {
            slots.push({
                start: minutesToTime(current),
                end: minutesToTime(current + durationMinutes)
            });
            current += stepMinutes;
        }
    }

    return slots;
}

// Helper: Subtract conflicts from windows
function subtractConflicts(
    windows: { start: number; end: number }[],
    conflicts: { startAt: Date; endAt: Date }[],
    dateStr: string
): { start: number; end: number }[] {
    let result = [...windows];

    for (const conflict of conflicts) {
        // Convert conflict times to minutes for the same date
        const conflictStart = new Date(conflict.startAt);
        const conflictEnd = new Date(conflict.endAt);

        // Get date part in YYYY-MM-DD format
        const conflictDate = conflictStart.toISOString().split('T')[0];

        // Only process if conflict is on the same date
        if (conflictDate !== dateStr) continue;

        const conflictStartMinutes = conflictStart.getUTCHours() * 60 + conflictStart.getUTCMinutes();
        const conflictEndMinutes = conflictEnd.getUTCHours() * 60 + conflictEnd.getUTCMinutes();

        const newResult: { start: number; end: number }[] = [];

        for (const window of result) {
            // No overlap
            if (window.end <= conflictStartMinutes || window.start >= conflictEndMinutes) {
                newResult.push(window);
                continue;
            }

            // Split window
            if (window.start < conflictStartMinutes) {
                newResult.push({ start: window.start, end: conflictStartMinutes });
            }
            if (window.end > conflictEndMinutes) {
                newResult.push({ start: conflictEndMinutes, end: window.end });
            }
        }

        result = newResult;
    }

    return result;
}

// Helper: Check if date is within time-off period
function isTimeOff(
    timeOffs: { startAt: Date; endAt: Date }[],
    date: Date
): boolean {
    for (const timeOff of timeOffs) {
        if (date >= timeOff.startAt && date <= timeOff.endAt) {
            return true;
        }
    }
    return false;
}

export const availabilityRoutes: FastifyPluginAsync = async (app) => {
    // GET /agenda/availability/slots - Get available slots for a date
    app.get(
        '/slots',
        { preHandler: requirePermission('agenda.agendamentos.read') },
        async (request, reply) => {
            const query = getSlotsQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Parse date and get weekday (0 = Sunday, 6 = Saturday)
            const dateParts = query.date.split('-').map(Number);
            const targetDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
            const weekday = targetDate.getUTCDay();

            // Get collaborator info
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(
                    eq(collaborators.id, query.collaboratorId),
                    eq(collaborators.accountId, accountId)
                ))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            // Check for time-off
            const timeOffs = await db
                .select()
                .from(collaboratorTimeOff)
                .where(and(
                    eq(collaboratorTimeOff.accountId, accountId),
                    eq(collaboratorTimeOff.collaboratorId, query.collaboratorId)
                ));

            if (isTimeOff(timeOffs, targetDate)) {
                return reply.send({
                    date: query.date,
                    collaboratorId: query.collaboratorId,
                    collaboratorName: collab.name,
                    isTimeOff: true,
                    windows: [],
                    slots: [],
                    conflicts: []
                });
            }

            // Get weekly availability for this weekday
            const weeklyAvail = await db
                .select()
                .from(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, query.collaboratorId),
                    eq(collaboratorAvailability.weekday, weekday),
                    eq(collaboratorAvailability.active, true)
                ));

            if (weeklyAvail.length === 0) {
                return reply.send({
                    date: query.date,
                    collaboratorId: query.collaboratorId,
                    collaboratorName: collab.name,
                    isTimeOff: false,
                    windows: [],
                    slots: [],
                    conflicts: []
                });
            }

            // Determine duration from appointment type or default
            let durationMinutes = collab.defaultAppointmentDurationMinutes || 30;

            if (query.typeId) {
                const [apptType] = await db
                    .select()
                    .from(appointmentTypes)
                    .where(and(
                        eq(appointmentTypes.id, query.typeId),
                        eq(appointmentTypes.accountId, accountId)
                    ))
                    .limit(1);

                if (apptType) {
                    durationMinutes = apptType.defaultDurationMinutes;
                }
            }

            // Build working windows from availability
            const windows: { start: number; end: number }[] = [];

            for (const avail of weeklyAvail) {
                const startMinutes = timeToMinutes(avail.startTime);
                const endMinutes = timeToMinutes(avail.endTime);

                // Start with full window
                let windowStart = startMinutes;
                let windowEnd = endMinutes;

                // Apply breaks
                const breaks = avail.breaksJson as { start: string; end: string }[] || [];
                const breakWindows: { start: number; end: number }[] = [];

                for (const brk of breaks) {
                    const breakStart = timeToMinutes(brk.start);
                    const breakEnd = timeToMinutes(brk.end);

                    // Add window before break
                    if (breakStart > windowStart) {
                        breakWindows.push({ start: windowStart, end: breakStart });
                    }
                    windowStart = breakEnd;
                }

                // Add remaining window after last break
                if (windowStart < windowEnd) {
                    breakWindows.push({ start: windowStart, end: windowEnd });
                }

                windows.push(...breakWindows);
            }

            // Get existing appointments for this date
            const dayStart = new Date(targetDate);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(targetDate);
            dayEnd.setUTCHours(23, 59, 59, 999);

            const existingAppts = await db
                .select({
                    id: appointments.id,
                    startAt: appointments.startAt,
                    endAt: appointments.endAt,
                    status: appointments.status
                })
                .from(appointments)
                .where(and(
                    eq(appointments.accountId, accountId),
                    eq(appointments.primaryCollaboratorId, query.collaboratorId),
                    gte(appointments.startAt, dayStart),
                    lte(appointments.endAt, dayEnd),
                    not(inArray(appointments.status, ['canceled', 'no_show']))
                ));

            // Also check resource conflicts if resourceId provided
            let resourceConflicts: any[] = [];
            if (query.resourceId) {
                resourceConflicts = await db
                    .select({
                        id: appointments.id,
                        startAt: appointments.startAt,
                        endAt: appointments.endAt,
                        status: appointments.status
                    })
                    .from(appointments)
                    .where(and(
                        eq(appointments.accountId, accountId),
                        eq(appointments.resourceId, query.resourceId),
                        gte(appointments.startAt, dayStart),
                        lte(appointments.endAt, dayEnd),
                        not(inArray(appointments.status, ['canceled', 'no_show']))
                    ));
            }

            const allConflicts = [...existingAppts, ...resourceConflicts];

            // Subtract conflicts from windows
            const freeWindows = subtractConflicts(windows, allConflicts, query.date);

            // Generate slots
            const slots = generateSlots(freeWindows, durationMinutes);

            return reply.send({
                date: query.date,
                collaboratorId: query.collaboratorId,
                collaboratorName: collab.name,
                durationMinutes,
                isTimeOff: false,
                windows: windows.map(w => ({
                    start: minutesToTime(w.start),
                    end: minutesToTime(w.end)
                })),
                freeWindows: freeWindows.map(w => ({
                    start: minutesToTime(w.start),
                    end: minutesToTime(w.end)
                })),
                slots,
                conflicts: allConflicts.map(c => ({
                    id: c.id,
                    startAt: c.startAt,
                    endAt: c.endAt,
                    status: c.status
                }))
            });
        }
    );

    // GET /agenda/availability - Get collaborator's weekly availability
    app.get(
        '/',
        { preHandler: requirePermission('agenda.colaboradores.read') },
        async (request, reply) => {
            const query = getAvailabilityQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const availability = await db
                .select()
                .from(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, query.collaboratorId)
                ))
                .orderBy(collaboratorAvailability.weekday);

            const timeOffs = await db
                .select()
                .from(collaboratorTimeOff)
                .where(and(
                    eq(collaboratorTimeOff.accountId, accountId),
                    eq(collaboratorTimeOff.collaboratorId, query.collaboratorId)
                ))
                .orderBy(collaboratorTimeOff.startAt);

            return reply.send({
                collaboratorId: query.collaboratorId,
                availability,
                timeOffs
            });
        }
    );

    // PUT /agenda/availability - Upsert collaborator's weekly availability
    app.put(
        '/',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const body = upsertAvailabilitySchema.parse(request.body);
            const query = getAvailabilityQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists and belongs to account
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(
                    eq(collaborators.id, query.collaboratorId),
                    eq(collaborators.accountId, accountId)
                ))
                .limit(1);

            if (!collab) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
            }

            // Delete existing availability
            await db
                .delete(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, query.collaboratorId)
                ));

            // Insert new availability
            if (body.availability.length > 0) {
                const values = body.availability.map(a => ({
                    accountId,
                    collaboratorId: query.collaboratorId,
                    weekday: a.weekday,
                    startTime: a.startTime,
                    endTime: a.endTime,
                    breaksJson: a.breaksJson,
                    active: a.active
                }));

                await db.insert(collaboratorAvailability).values(values);
            }

            // Fetch and return updated availability
            const updated = await db
                .select()
                .from(collaboratorAvailability)
                .where(and(
                    eq(collaboratorAvailability.accountId, accountId),
                    eq(collaboratorAvailability.collaboratorId, query.collaboratorId)
                ))
                .orderBy(collaboratorAvailability.weekday);

            return reply.send({
                collaboratorId: query.collaboratorId,
                availability: updated
            });
        }
    );

    // POST /agenda/availability/time-off - Create time-off entry
    app.post(
        '/time-off',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const body = createTimeOffSchema.parse(request.body);
            const query = getAvailabilityQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            // Verify collaborator exists and belongs to account
            const [collab] = await db
                .select()
                .from(collaborators)
                .where(and(
                    eq(collaborators.id, query.collaboratorId),
                    eq(collaborators.accountId, accountId)
                ))
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
                    collaboratorId: query.collaboratorId,
                    startAt,
                    endAt,
                    reason: body.reason
                })
                .returning();

            return reply.status(201).send(newTimeOff);
        }
    );

    // DELETE /agenda/availability/time-off/:timeOffId - Delete time-off entry
    app.delete(
        '/time-off/:timeOffId',
        { preHandler: requirePermission('agenda.colaboradores.update') },
        async (request, reply) => {
            const params = z.object({
                timeOffId: z.string().uuid()
            }).parse(request.params);
            const query = getAvailabilityQuerySchema.parse(request.query);
            const db = app.db;
            const accountId = request.requestContext.actor!.accountId;

            const [deleted] = await db
                .delete(collaboratorTimeOff)
                .where(and(
                    eq(collaboratorTimeOff.id, params.timeOffId),
                    eq(collaboratorTimeOff.accountId, accountId),
                    eq(collaboratorTimeOff.collaboratorId, query.collaboratorId)
                ))
                .returning();

            if (!deleted) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Registro de folga não encontrado' });
            }

            return reply.send({ success: true });
        }
    );
};
