import { z } from 'zod';
import {
  errorResponseSchema,
  idParamSchema,
  requiredString,
  trim,
  uuidSchema
} from './common.js';

/**
 * ==========================================
 * ALERT SCHEMA (embedded in patient)
 * ==========================================
 */

export const alertSchema = z.object({
  aggressive: z.boolean().optional(),
  allergies: z.array(z.string()).optional(),
  anesthesia_risk: z.enum(['low', 'medium', 'high']).nullable().optional(),
  chronic_conditions: z.array(z.string()).optional(),
  notes: z.string().nullable().optional()
});

/**
 * ==========================================
 * PATIENT SCHEMAS
 * ==========================================
 */

/**
 * Birth date schema - YYYY-MM-DD format
 */
const birthDateSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD'))
  .optional();

/**
 * Weight schema - positive number
 */
const weightSchema = z.coerce.number().positive('weightKg must be a positive number').optional();

/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */

/**
 * POST /patients - Create patient request body
 */
export const createPatientBodySchema = z.object({
  ownerId: uuidSchema,
  name: requiredString,
  species: requiredString,
  breed: z.string().transform(trim).pipe(z.string().min(1)).optional(),
  sex: z.string().transform(trim).pipe(z.string().min(1)).optional(),
  birthDate: birthDateSchema,
  weightKg: weightSchema,
  microchip: z.string().transform(trim).pipe(z.string().min(1)).optional(),
  alerts: alertSchema.optional()
});

/**
 * PATCH /patients/:id - Update patient request body
 */
export const updatePatientBodySchema = createPatientBodySchema
  .partial()
  .refine(
    (value) => Object.values(value).some((fieldValue) => fieldValue !== undefined),
    'At least one field is required for PATCH'
  );

/**
 * GET /patients/:id - Get patient by ID params
 */
export const patientIdParamSchema = idParamSchema;

/**
 * GET /patients - List patients query
 */
const patientListPageSizeSchema = z.coerce.number().int().min(1).max(200);

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
  pageSize: patientListPageSizeSchema.optional(),
  limit: z.unknown().optional(),
  ownerId: z.string().optional(),
  species: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(['active', 'inactive', 'deceased']).optional()
}).superRefine((query, context) => {
  if (query.pageSize === undefined && query.limit !== undefined &&
    !patientListPageSizeSchema.safeParse(query.limit).success
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['limit'],
      message: 'limit must be an integer between 1 and 200'
    });
  }
}).transform(({ limit, pageSize, ...query }) => {
  if (pageSize !== undefined) return { ...query, pageSize };
  if (limit === undefined) return query;
  return { ...query, limit: patientListPageSizeSchema.parse(limit) };
});

/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */

/**
 * Patient response schema (single patient)
 */
export const patientResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  unitId: uuidSchema.nullable().optional(),
  ownerId: uuidSchema,
  name: z.string(),
  species: z.string(),
  breed: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  weightKg: z.union([z.string(), z.number()]).nullable().optional(),
  microchip: z.string().nullable().optional(),
  alerts: alertSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

/**
 * Patient list item returned by the live registry route.
 */
export const patientListItemSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  name: z.string(),
  species: z.string(),
  breed: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  size: z.enum(['small', 'medium', 'large']).optional(),
  baseWeightKg: z.number().nonnegative().optional(),
  birthDateApproximate: z.string().optional(),
  isNeutered: z.boolean().optional(),
  microchip: z.string().optional(),
  pedigreeNumber: z.string().optional(),
  color: z.string().optional(),
  chronicDisease: z.string().optional(),
  allergy: z.string().optional(),
  temperament: z.string().optional(),
  generalNotes: z.string().optional(),
  legacyVetusId: z.string().optional(),
  originalCreatedAt: z.string().optional(),
  primaryOwnerId: z.string().min(1),
  status: z.enum(['active', 'inactive', 'deceased']),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();

const unpaginatedPatientsResponseSchema = z.object({
  items: z.array(patientListItemSchema)
}).strict();

const paginatedPatientsResponseSchema = z.object({
  items: z.array(patientListItemSchema),
  page: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  pageSize: z.number().int().positive().max(200),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
}).strict().refine(
  ({ pageSize, total, totalPages }) => totalPages === Math.max(1, Math.ceil(total / pageSize)),
  { path: ['totalPages'], message: 'totalPages must match total and pageSize' }
);

/**
 * The route keeps its legacy `{ items }` form unless a paging parameter is supplied.
 */
export const listPatientsResponseSchema = z.union([
  paginatedPatientsResponseSchema,
  unpaginatedPatientsResponseSchema
]);

/**
 * Patient summary response (for /patients/:id/summary)
 */
export const patientSummaryResponseSchema = z.object({
  patient: patientResponseSchema,
  owner: z.object({
    id: uuidSchema,
    fullName: z.string(),
    phoneMain: z.string().nullable().optional(),
    email: z.string().nullable().optional()
  }),
  stats: z.object({
    totalEncounters: z.number().int().nonnegative(),
    openEncounters: z.number().int().nonnegative()
  }),
  recentEncounters: z.array(
    z.object({
      id: uuidSchema,
      openedAt: z.coerce.date(),
      status: z.enum(['open', 'closed'])
    })
  )
});

/**
 * ==========================================
 * TYPES
 * ==========================================
 */

export type AlertDto = z.infer<typeof alertSchema>;
export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;
export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>;
export type PatientIdParam = z.infer<typeof patientIdParamSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
export type PatientResponse = z.infer<typeof patientResponseSchema>;
export type ListPatientsResponse = z.infer<typeof listPatientsResponseSchema>;
export type PatientSummaryResponse = z.infer<typeof patientSummaryResponseSchema>;

/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */

export const patientsContract = {
  create: {
    method: 'POST' as const,
    path: '/patients',
    body: createPatientBodySchema,
    responses: {
      201: patientResponseSchema
    }
  },
  getById: {
    method: 'GET' as const,
    path: '/patients/:id',
    params: patientIdParamSchema,
    responses: {
      200: patientResponseSchema
    }
  },
  list: {
    method: 'GET' as const,
    path: '/patients',
    query: listPatientsQuerySchema,
    responses: {
      200: listPatientsResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema
    }
  },
  update: {
    method: 'PATCH' as const,
    path: '/patients/:id',
    params: patientIdParamSchema,
    body: updatePatientBodySchema,
    responses: {
      200: patientResponseSchema
    }
  },
  getSummary: {
    method: 'GET' as const,
    path: '/patients/:id/summary',
    params: patientIdParamSchema,
    responses: {
      200: patientSummaryResponseSchema
    }
  }
} as const;

export type PatientsContract = typeof patientsContract;
