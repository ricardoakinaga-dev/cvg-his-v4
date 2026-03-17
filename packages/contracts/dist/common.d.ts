import { z } from 'zod';
/**
 * ==========================================
 * COMMON UTILITIES FOR SCHEMA DEFINITIONS
 * ==========================================
 */
/**
 * Trim string values
 */
export declare const trim: (val: unknown) => unknown;
/**
 * Normalize email to lowercase
 */
export declare const normalizeEmail: (val: unknown) => unknown;
/**
 * Normalize phone number (remove non-digits)
 */
export declare const normalizePhone: (val: unknown) => unknown;
/**
 * UUID schema
 */
export declare const uuidSchema: z.ZodString;
/**
 * Required string with trim
 */
export declare const requiredString: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
/**
 * Optional string with trim
 */
export declare const optionalString: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
/**
 * Nullable trimmed text (can be null, undefined, or empty)
 */
export declare const nullableTrimmedText: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
/**
 * Pagination query schema (common across list endpoints)
 */
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
/**
 * ID parameter schema
 */
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * Search query schema
 */
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
}, {
    q?: string | undefined;
}>;
/**
 * Paginated response wrapper
 */
export declare function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
    data: z.ZodArray<T, "many">;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    data: T["_output"][];
    total: number;
}, {
    page: number;
    pageSize: number;
    data: T["_input"][];
    total: number;
}>;
/**
 * Error response schema
 */
export declare const errorResponseSchema: z.ZodObject<{
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    code?: string | undefined;
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    code?: string | undefined;
    details?: Record<string, unknown> | undefined;
}>;
/**
 * Validation error response schema
 */
export declare const validationErrorResponseSchema: z.ZodObject<{
    message: z.ZodString;
    errors: z.ZodArray<z.ZodObject<{
        path: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: (string | number)[];
        message: string;
    }, {
        path: (string | number)[];
        message: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    message: string;
    errors: {
        path: (string | number)[];
        message: string;
    }[];
}, {
    message: string;
    errors: {
        path: (string | number)[];
        message: string;
    }[];
}>;
/**
 * Types
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;
//# sourceMappingURL=common.d.ts.map