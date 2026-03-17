import { z } from 'zod';

import { normalizeEmail, normalizePhone, trim } from './common.js';

const fullNameSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(2, 'fullName must have at least 2 characters'));

const optionalTextSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'Field cannot be empty'))
  .optional();

const optionalEmailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.string().email('email must be valid'))
  .optional();

const optionalPhoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(8, 'phone must have at least 8 characters'))
  .optional();

export const OwnerCreateSchema = z.object({
  fullName: fullNameSchema,
  document: optionalTextSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema
});

export const OwnerUpdateSchema = OwnerCreateSchema.partial().refine(
  (payload) => Object.values(payload).some((value) => value !== undefined),
  {
    message: 'At least one field must be provided for Owner update'
  }
);

export const OwnerReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  unitId: z.string().uuid().nullable().optional(),
  fullName: z.string(),
  document: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phoneMain: z.string().nullable().optional(),
  phoneAlt: z.string().nullable().optional(),
  addressJson: z.record(z.unknown()).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type OwnerCreateDto = z.infer<typeof OwnerCreateSchema>;
export type OwnerUpdateDto = z.infer<typeof OwnerUpdateSchema>;
export type OwnerReadDto = z.infer<typeof OwnerReadSchema>;
