import { z } from 'zod';
const nullableTrimmedText = z
    .string()
    .trim()
    .min(1)
    .transform((value) => value)
    .optional()
    .nullable();
const ownerCreateSchema = z.object({
    fullName: z.string().trim().min(2).max(255),
    document: nullableTrimmedText,
    email: z.string().trim().email().max(320).optional().nullable(),
    phoneMain: z.string().trim().min(6).max(32).optional().nullable(),
    phoneAlt: z.string().trim().min(6).max(32).optional().nullable(),
    addressJson: z.record(z.unknown()).optional().nullable()
});
export const createOwnerBodySchema = ownerCreateSchema;
export const updateOwnerBodySchema = ownerCreateSchema
    .partial()
    .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), 'At least one field is required for PATCH');
export const ownerIdParamSchema = z.object({
    id: z.string().uuid()
});
export const listOwnersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    q: z.string().trim().max(120).optional()
});
//# sourceMappingURL=types.js.map