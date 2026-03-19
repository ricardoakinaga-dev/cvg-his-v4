import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// Enums
const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
]);

const appointmentTypeSchema = z.enum([
  'consultation',
  'vaccination',
  'surgery',
  'exam',
  'return',
  'other'
]);

// Schemas
const notesSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'notes cannot be empty').max(5000))
  .optional()
  .nullable();

export const createAppointmentBodySchema = z.object({
  patientId: uuidSchema,
  ownerId: uuidSchema,
  professionalUserId: uuidSchema,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  type: appointmentTypeSchema.optional(),
  notes: notesSchema
});

export const updateAppointmentBodySchema = z
  .object({
    professionalUserId: uuidSchema.optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    status: appointmentStatusSchema.optional(),
    type: appointmentTypeSchema.optional(),
    notes: notesSchema
  })
  .refine(
    (value) => Object.values(value).some((fieldValue) => fieldValue !== undefined),
    'At least one field is required for PATCH'
  );

export const appointmentIdParamSchema = idParamSchema;

export const listAppointmentsQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(
  z.object({
    professionalUserId: uuidSchema.optional(),
    patientId: uuidSchema.optional(),
    status: appointmentStatusSchema.optional(),
    type: appointmentTypeSchema.optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional()
  })
);

export const appointmentResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  patientId: uuidSchema,
  ownerId: uuidSchema,
  professionalUserId: uuidSchema,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listAppointmentsResponseSchema = createPaginatedResponseSchema(appointmentResponseSchema);

// Types
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;
export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentBodySchema>;
export type AppointmentIdParam = z.infer<typeof appointmentIdParamSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;
export type ListAppointmentsResponse = z.infer<typeof listAppointmentsResponseSchema>;

// Contract
export const appointmentsContract = {
  create: {
    method: 'POST' as const,
    path: '/appointments',
    body: createAppointmentBodySchema,
    responses: { 201: appointmentResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/appointments/:id',
    params: appointmentIdParamSchema,
    responses: { 200: appointmentResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/appointments',
    query: listAppointmentsQuerySchema,
    responses: { 200: listAppointmentsResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/appointments/:id',
    params: appointmentIdParamSchema,
    body: updateAppointmentBodySchema,
    responses: { 200: appointmentResponseSchema }
  },
  cancel: {
    method: 'POST' as const,
    path: '/appointments/:id/cancel',
    params: appointmentIdParamSchema,
    responses: { 200: appointmentResponseSchema }
  }
} as const;

export type AppointmentsContract = typeof appointmentsContract;
