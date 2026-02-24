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
export const BedCreateSchema = z.object({
    wardId: z.string().uuid('wardId must be a valid UUID'),
    name: requiredNameSchema,
    code: optionalCodeSchema,
    isActive: z.boolean().optional()
});
export const BedUpdateSchema = z
    .object({
    wardId: z.string().uuid('wardId must be a valid UUID').optional(),
    name: requiredNameSchema.optional(),
    code: optionalNullableCodeSchema,
    isActive: z.boolean().optional()
})
    .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for Bed update'
});
export const BedReadSchema = z.object({
    id: z.string().uuid(),
    accountId: z.string().uuid(),
    wardId: z.string().uuid(),
    name: z.string(),
    code: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
});
//# sourceMappingURL=bed.js.map