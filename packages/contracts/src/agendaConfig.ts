import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Professional Availability
// =====================

const dayOfWeekSchema = z.coerce.number().int().min(0).max(6);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format');

export const createAvailabilityBodySchema = z.object({
  professionalUserId: uuidSchema,
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  slotDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  notes: z
    .string()
    .transform(trim)
    .pipe(z.string().min(1).max(500))
    .optional()
    .nullable()
});

export const updateAvailabilityBodySchema = z
  .object({
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    slotDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
    notes: z
      .string()
      .transform(trim)
      .pipe(z.string().min(1).max(500))
      .optional()
      .nullable()
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    'At least one field is required for PATCH'
  );

export const availabilityIdParamSchema = idParamSchema;

export const listAvailabilityQuerySchema = paginationQuerySchema.merge(
  z.object({
    professionalUserId: uuidSchema.optional()
  })
);

export const availabilityResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  professionalUserId: uuidSchema,
  dayOfWeek: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number(),
  notes: z.string().nullable().optional()
});

export const listAvailabilityResponseSchema = createPaginatedResponseSchema(availabilityResponseSchema);

export type CreateAvailabilityBody = z.infer<typeof createAvailabilityBodySchema>;
export type UpdateAvailabilityBody = z.infer<typeof updateAvailabilityBodySchema>;
export type AvailabilityIdParam = z.infer<typeof availabilityIdParamSchema>;
export type ListAvailabilityQuery = z.infer<typeof listAvailabilityQuerySchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
export type ListAvailabilityResponse = z.infer<typeof listAvailabilityResponseSchema>;

// =====================
// Appointment Type Configs
// =====================

const codeSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1).max(64));
const nameSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1).max(255));
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be hex format #RRGGBB')
  .optional()
  .nullable();

export const createTypeConfigBodySchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z
    .string()
    .transform(trim)
    .pipe(z.string().min(1).max(2000))
    .optional()
    .nullable(),
  defaultDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  color: colorSchema,
  active: z.boolean().optional()
});

export const updateTypeConfigBodySchema = z
  .object({
    name: nameSchema.optional(),
    description: z
      .string()
      .transform(trim)
      .pipe(z.string().min(1).max(2000))
      .optional()
      .nullable(),
    defaultDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
    color: colorSchema,
    active: z.boolean().optional()
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    'At least one field is required for PATCH'
  );

export const typeConfigIdParamSchema = idParamSchema;

export const listTypeConfigsQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(
  z.object({
    active: z.coerce.boolean().optional()
  })
);

export const typeConfigResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  defaultDurationMinutes: z.number(),
  color: z.string().nullable().optional(),
  active: z.boolean()
});

export const listTypeConfigsResponseSchema = createPaginatedResponseSchema(typeConfigResponseSchema);

export type CreateTypeConfigBody = z.infer<typeof createTypeConfigBodySchema>;
export type UpdateTypeConfigBody = z.infer<typeof updateTypeConfigBodySchema>;
export type TypeConfigIdParam = z.infer<typeof typeConfigIdParamSchema>;
export type ListTypeConfigsQuery = z.infer<typeof listTypeConfigsQuerySchema>;
export type TypeConfigResponse = z.infer<typeof typeConfigResponseSchema>;
export type ListTypeConfigsResponse = z.infer<typeof listTypeConfigsResponseSchema>;

// =====================
// Contracts
// =====================

export const availabilityContract = {
  create: {
    method: 'POST' as const,
    path: '/availability',
    body: createAvailabilityBodySchema,
    responses: { 201: availabilityResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/availability/:id',
    params: availabilityIdParamSchema,
    responses: { 200: availabilityResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/availability',
    query: listAvailabilityQuerySchema,
    responses: { 200: listAvailabilityResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/availability/:id',
    params: availabilityIdParamSchema,
    body: updateAvailabilityBodySchema,
    responses: { 200: availabilityResponseSchema }
  },
  delete: {
    method: 'DELETE' as const,
    path: '/availability/:id',
    params: availabilityIdParamSchema,
    responses: { 204: z.void() }
  }
} as const;

export const typeConfigContract = {
  create: {
    method: 'POST' as const,
    path: '/appointment-types',
    body: createTypeConfigBodySchema,
    responses: { 201: typeConfigResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/appointment-types/:id',
    params: typeConfigIdParamSchema,
    responses: { 200: typeConfigResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/appointment-types',
    query: listTypeConfigsQuerySchema,
    responses: { 200: listTypeConfigsResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/appointment-types/:id',
    params: typeConfigIdParamSchema,
    body: updateTypeConfigBodySchema,
    responses: { 200: typeConfigResponseSchema }
  },
  delete: {
    method: 'DELETE' as const,
    path: '/appointment-types/:id',
    params: typeConfigIdParamSchema,
    responses: { 204: z.void() }
  }
} as const;

export type AvailabilityContract = typeof availabilityContract;
export type TypeConfigContract = typeof typeConfigContract;
