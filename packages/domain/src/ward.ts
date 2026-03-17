import { z } from 'zod';

import { trim } from './common.js';

const requiredNameSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'name is required'));

const optionalCodeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'code cannot be empty').optional());

const optionalNullableCodeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? null : normalized;
}, z.string().min(1, 'code cannot be empty').nullable().optional());

export const WardCreateSchema = z.object({
  name: requiredNameSchema,
  code: optionalCodeSchema,
  isActive: z.boolean().optional()
});

export const WardUpdateSchema = z
  .object({
    name: requiredNameSchema.optional(),
    code: optionalNullableCodeSchema,
    isActive: z.boolean().optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for Ward update'
  });

export const WardReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type WardCreateDto = z.infer<typeof WardCreateSchema>;
export type WardUpdateDto = z.infer<typeof WardUpdateSchema>;
export type WardReadDto = z.infer<typeof WardReadSchema>;
