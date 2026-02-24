import { z } from 'zod';
import {
  createPaginatedResponseSchema,
  idParamSchema,
  normalizeEmail,
  normalizePhone,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

/**
 * ==========================================
 * OWNER SCHEMAS
 * ==========================================
 */

/**
 * Full name schema - required, min 2 chars, max 255 chars
 */
const fullNameSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(2, 'fullName must have at least 2 characters').max(255));

/**
 * Document schema - optional, nullable
 */
const documentSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'Document cannot be empty'))
  .optional()
  .nullable();

/**
 * Email schema - optional, nullable, must be valid email
 */
const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.string().email('email must be valid').max(320))
  .optional()
  .nullable();

/**
 * Phone schema - optional, nullable, min 6 chars, max 32 chars
 */
const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(6, 'phone must have at least 6 characters').max(32))
  .optional()
  .nullable();

/**
 * Address schema - JSON object, optional, nullable
 */
const addressSchema = z.record(z.string(), z.unknown()).optional().nullable();

/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */

/**
 * POST /owners - Create owner request body
 */
export const createOwnerBodySchema = z.object({
  fullName: fullNameSchema,
  document: documentSchema,
  email: emailSchema,
  phoneMain: phoneSchema,
  phoneAlt: phoneSchema,
  addressJson: addressSchema
});

/**
 * PATCH /owners/:id - Update owner request body
 */
export const updateOwnerBodySchema = createOwnerBodySchema
  .partial()
  .refine(
    (value) => Object.values(value).some((fieldValue) => fieldValue !== undefined),
    'At least one field is required for PATCH'
  );

/**
 * GET /owners/:id - Get owner by ID params
 */
export const ownerIdParamSchema = idParamSchema;

/**
 * GET /owners - List owners query
 */
export const listOwnersQuerySchema = paginationQuerySchema.merge(searchQuerySchema);

/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */

/**
 * Owner response schema (single owner)
 */
export const ownerResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  unitId: uuidSchema.nullable().optional(),
  fullName: z.string(),
  document: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phoneMain: z.string().nullable().optional(),
  phoneAlt: z.string().nullable().optional(),
  addressJson: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

/**
 * Paginated owners response
 */
export const listOwnersResponseSchema = createPaginatedResponseSchema(ownerResponseSchema);

/**
 * Owner summary response (for /owners/:id/summary)
 */
const ownerSummaryOwnerSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  document: z.string().nullable(),
  email: z.string().nullable(),
  phoneMain: z.string().nullable(),
  phoneAlt: z.string().nullable(),
  updatedAt: z.string().datetime()
});

const ownerSummaryAuditEventSchema = z.object({
  id: uuidSchema,
  createdAt: z.string().datetime(),
  action: z.string(),
  actorRole: z.string().nullable(),
  reason: z.string().nullable(),
  requestId: z.string().nullable()
});

export const ownerSummaryResponseSchema = z.object({
  owner: ownerSummaryOwnerSchema,
  auditTrail: z.array(ownerSummaryAuditEventSchema),
  encounters: z.array(z.unknown()),
  documents: z.array(z.unknown())
});

/**
 * ==========================================
 * TYPES
 * ==========================================
 */

export type CreateOwnerBody = z.infer<typeof createOwnerBodySchema>;
export type UpdateOwnerBody = z.infer<typeof updateOwnerBodySchema>;
export type OwnerIdParam = z.infer<typeof ownerIdParamSchema>;
export type ListOwnersQuery = z.infer<typeof listOwnersQuerySchema>;
export type OwnerResponse = z.infer<typeof ownerResponseSchema>;
export type ListOwnersResponse = z.infer<typeof listOwnersResponseSchema>;
export type OwnerSummaryResponse = z.infer<typeof ownerSummaryResponseSchema>;

/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */

export const ownersContract = {
  create: {
    method: 'POST' as const,
    path: '/owners',
    body: createOwnerBodySchema,
    responses: {
      201: ownerResponseSchema
    }
  },
  getById: {
    method: 'GET' as const,
    path: '/owners/:id',
    params: ownerIdParamSchema,
    responses: {
      200: ownerResponseSchema
    }
  },
  list: {
    method: 'GET' as const,
    path: '/owners',
    query: listOwnersQuerySchema,
    responses: {
      200: listOwnersResponseSchema
    }
  },
  update: {
    method: 'PATCH' as const,
    path: '/owners/:id',
    params: ownerIdParamSchema,
    body: updateOwnerBodySchema,
    responses: {
      200: ownerResponseSchema
    }
  },
  getSummary: {
    method: 'GET' as const,
    path: '/owners/:id/summary',
    params: ownerIdParamSchema,
    responses: {
      200: ownerSummaryResponseSchema
    }
  }
} as const;

export type OwnersContract = typeof ownersContract;
