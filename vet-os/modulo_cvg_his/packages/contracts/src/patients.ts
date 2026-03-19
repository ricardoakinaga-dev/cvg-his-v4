import { z } from 'zod';
import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
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
export const listPatientsQuerySchema = paginationQuerySchema.extend({
  ownerId: uuidSchema.optional(),
  species: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().max(120).optional()
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
 * Paginated patients response
 */
export const listPatientsResponseSchema = createPaginatedResponseSchema(patientResponseSchema);

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
      200: listPatientsResponseSchema
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
