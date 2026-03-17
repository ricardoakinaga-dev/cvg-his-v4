import { z } from 'zod';
import { createPaginatedResponseSchema, idParamSchema, paginationQuerySchema, trim, uuidSchema } from './common.js';
/**
 * ==========================================
 * ENCOUNTER STATUS
 * ==========================================
 */
export const encounterStatusSchema = z.enum(['open', 'closed']);
/**
 * ==========================================
 * ENCOUNTER SCHEMAS
 * ==========================================
 */
/**
 * Reason schema - optional, trimmed
 */
const reasonSchema = z.preprocess((value) => {
    if (typeof value !== 'string') {
        return value;
    }
    const normalized = trim(value);
    return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'reason cannot be empty').optional());
/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */
/**
 * POST /encounters - Create encounter request body
 */
export const createEncounterBodySchema = z.object({
    patientId: uuidSchema,
    reason: reasonSchema
});
/**
 * POST /encounters/:id/close - Close encounter request body
 */
export const closeEncounterBodySchema = z.object({
    reason: reasonSchema
});
/**
 * GET /encounters/:id - Get encounter by ID params
 */
export const encounterIdParamSchema = idParamSchema;
/**
 * GET /encounters - List encounters query
 */
export const listEncountersQuerySchema = paginationQuerySchema.extend({
    patientId: uuidSchema.optional()
});
/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */
/**
 * Encounter response schema (single encounter)
 */
export const encounterResponseSchema = z.object({
    id: uuidSchema,
    accountId: uuidSchema,
    patientId: uuidSchema,
    ownerId: uuidSchema,
    status: encounterStatusSchema,
    openedByUserId: uuidSchema,
    closedByUserId: uuidSchema.nullable().optional(),
    openedAt: z.coerce.date(),
    closedAt: z.coerce.date().nullable().optional(),
    reason: z.string().nullable().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
});
/**
 * Paginated encounters response
 */
export const listEncountersResponseSchema = createPaginatedResponseSchema(encounterResponseSchema);
/**
 * Timeline note schema
 */
export const encounterTimelineNoteSchema = z.object({
    id: uuidSchema,
    encounterId: uuidSchema,
    type: z.string(),
    status: z.string(),
    versionNumber: z.number().int().nonnegative(),
    signedAt: z.coerce.date().nullable().optional(),
    signedByUserId: uuidSchema.nullable().optional(),
    createdByUserId: uuidSchema,
    updatedByUserId: uuidSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    currentSoapJson: z.record(z.unknown()).nullable().optional()
});
/**
 * Timeline version schema
 */
export const encounterTimelineVersionSchema = z.object({
    id: uuidSchema,
    noteId: uuidSchema,
    encounterId: uuidSchema,
    versionNumber: z.number().int().nonnegative(),
    soapJson: z.record(z.unknown()),
    reason: z.string().nullable().optional(),
    createdByUserId: uuidSchema,
    createdAt: z.coerce.date()
});
/**
 * Timeline document schema
 */
export const encounterTimelineDocumentSchema = z.object({
    encounterDocumentId: uuidSchema,
    encounterId: uuidSchema,
    documentId: uuidSchema,
    attachedByUserId: uuidSchema,
    attachedAt: z.coerce.date(),
    storageKey: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().nonnegative(),
    createdByUserId: uuidSchema,
    createdAt: z.coerce.date()
});
/**
 * Timeline event schema
 */
export const encounterTimelineEventSchema = z.object({
    kind: z.enum([
        'encounter.opened',
        'encounter.closed',
        'note.created',
        'note.signed',
        'note.version.created',
        'document.attached'
    ]),
    entityId: uuidSchema,
    happenedAt: z.coerce.date(),
    data: z.record(z.unknown())
});
/**
 * Encounter timeline response
 */
export const encounterTimelineResponseSchema = z.object({
    encounter: encounterResponseSchema,
    notes: z.array(encounterTimelineNoteSchema),
    versions: z.array(encounterTimelineVersionSchema),
    documents: z.array(encounterTimelineDocumentSchema),
    timeline: z.array(encounterTimelineEventSchema)
});
/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */
export const encountersContract = {
    create: {
        method: 'POST',
        path: '/encounters',
        body: createEncounterBodySchema,
        responses: {
            201: encounterResponseSchema
        }
    },
    getById: {
        method: 'GET',
        path: '/encounters/:id',
        params: encounterIdParamSchema,
        responses: {
            200: encounterResponseSchema
        }
    },
    list: {
        method: 'GET',
        path: '/encounters',
        query: listEncountersQuerySchema,
        responses: {
            200: listEncountersResponseSchema
        }
    },
    close: {
        method: 'POST',
        path: '/encounters/:id/close',
        params: encounterIdParamSchema,
        body: closeEncounterBodySchema,
        responses: {
            200: encounterResponseSchema
        }
    },
    getTimeline: {
        method: 'GET',
        path: '/encounters/:id/timeline',
        params: encounterIdParamSchema,
        responses: {
            200: encounterTimelineResponseSchema
        }
    }
};
//# sourceMappingURL=encounters.js.map