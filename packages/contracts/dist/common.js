import { z } from 'zod';
/**
 * ==========================================
 * COMMON UTILITIES FOR SCHEMA DEFINITIONS
 * ==========================================
 */
/**
 * Trim string values
 */
export const trim = (val) => typeof val === 'string' ? val.trim() : val;
/**
 * Normalize email to lowercase
 */
export const normalizeEmail = (val) => typeof val === 'string' ? val.toLowerCase().trim() : val;
/**
 * Normalize phone number (remove non-digits)
 */
export const normalizePhone = (val) => typeof val === 'string' ? val.replace(/\D/g, '') : val;
/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();
/**
 * Required string with trim
 */
export const requiredString = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'Field is required'));
/**
 * Optional string with trim
 */
export const optionalString = z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'Field cannot be empty'))
    .optional();
/**
 * Nullable trimmed text (can be null, undefined, or empty)
 */
export const nullableTrimmedText = z
    .string()
    .trim()
    .min(1)
    .transform((value) => value)
    .optional()
    .nullable();
/**
 * Pagination query schema (common across list endpoints)
 */
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
});
/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
    id: z.string().uuid()
});
/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
    q: z.string().trim().max(120).optional()
});
/**
 * Paginated response wrapper
 */
export function createPaginatedResponseSchema(itemSchema) {
    return z.object({
        data: z.array(itemSchema),
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        total: z.number().int().nonnegative()
    });
}
/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional()
});
/**
 * Validation error response schema
 */
export const validationErrorResponseSchema = z.object({
    message: z.string(),
    errors: z.array(z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string()
    }))
});
//# sourceMappingURL=common.js.map