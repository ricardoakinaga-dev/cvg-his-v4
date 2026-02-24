import { z } from 'zod';
import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  trim,
  uuidSchema
} from './common.js';

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
  const normalized = trim(value) as string;
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
  patientId: uuidSchema.optional(),
  q: z.string().trim().min(1).max(120).optional()
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
  currentSoapJson: z.record(z.string(), z.unknown()).nullable().optional()
});

/**
 * Timeline version schema
 */
export const encounterTimelineVersionSchema = z.object({
  id: uuidSchema,
  noteId: uuidSchema,
  encounterId: uuidSchema,
  versionNumber: z.number().int().nonnegative(),
  soapJson: z.record(z.string(), z.unknown()),
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
  data: z.record(z.string(), z.unknown())
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
 * TYPES
 * ==========================================
 */

export type EncounterStatus = z.infer<typeof encounterStatusSchema>;
export type CreateEncounterBody = z.infer<typeof createEncounterBodySchema>;
export type CloseEncounterBody = z.infer<typeof closeEncounterBodySchema>;
export type EncounterIdParam = z.infer<typeof encounterIdParamSchema>;
export type ListEncountersQuery = z.infer<typeof listEncountersQuerySchema>;
export type EncounterResponse = z.infer<typeof encounterResponseSchema>;
export type ListEncountersResponse = z.infer<typeof listEncountersResponseSchema>;
export type EncounterTimelineNote = z.infer<typeof encounterTimelineNoteSchema>;
export type EncounterTimelineVersion = z.infer<typeof encounterTimelineVersionSchema>;
export type EncounterTimelineDocument = z.infer<typeof encounterTimelineDocumentSchema>;
export type EncounterTimelineEvent = z.infer<typeof encounterTimelineEventSchema>;
export type EncounterTimelineResponse = z.infer<typeof encounterTimelineResponseSchema>;

/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */

export const encountersContract = {
  create: {
    method: 'POST' as const,
    path: '/encounters',
    body: createEncounterBodySchema,
    responses: {
      201: encounterResponseSchema
    }
  },
  getById: {
    method: 'GET' as const,
    path: '/encounters/:id',
    params: encounterIdParamSchema,
    responses: {
      200: encounterResponseSchema
    }
  },
  list: {
    method: 'GET' as const,
    path: '/encounters',
    query: listEncountersQuerySchema,
    responses: {
      200: listEncountersResponseSchema
    }
  },
  close: {
    method: 'POST' as const,
    path: '/encounters/:id/close',
    params: encounterIdParamSchema,
    body: closeEncounterBodySchema,
    responses: {
      200: encounterResponseSchema
    }
  },
  getTimeline: {
    method: 'GET' as const,
    path: '/encounters/:id/timeline',
    params: encounterIdParamSchema,
    responses: {
      200: encounterTimelineResponseSchema
    }
  }
} as const;

export type EncountersContract = typeof encountersContract;
