import { z } from 'zod';
import { AlertSchema } from './alerts.js';
import { trim } from './common.js';
const requiredNameSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'Field is required'));
const optionalTextSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'Field cannot be empty'))
    .optional();
const optionalBirthDateSchema = z
    .string()
    .transform(trim)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD'))
    .optional();
export const PatientCreateSchema = z.object({
    ownerId: z.string().uuid('ownerId must be a valid UUID'),
    name: requiredNameSchema,
    species: requiredNameSchema,
    breed: optionalTextSchema,
    sex: optionalTextSchema,
    birthDate: optionalBirthDateSchema,
    weightKg: z.coerce.number().positive('weightKg must be a positive number').optional(),
    microchip: optionalTextSchema,
    alerts: AlertSchema.optional()
});
export const PatientUpdateSchema = PatientCreateSchema.partial().refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for Patient update'
});
export const PatientReadSchema = z.object({
    id: z.string().uuid(),
    accountId: z.string().uuid(),
    unitId: z.string().uuid().nullable().optional(),
    ownerId: z.string().uuid(),
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable().optional(),
    sex: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    weightKg: z.union([z.string(), z.number()]).nullable().optional(),
    microchip: z.string().nullable().optional(),
    alerts: AlertSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
});
//# sourceMappingURL=patient.js.map