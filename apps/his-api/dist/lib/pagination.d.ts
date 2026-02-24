/**
 * Pagination Helpers for API Endpoints
 *
 * Provides standardized parsing and validation for pagination and search parameters.
 * All helpers are designed to work with Fastify query strings.
 */
import { z } from 'zod';
/**
 * Default pagination values
 */
export declare const PAGINATION_DEFAULTS: {
    readonly page: 1;
    readonly pageSize: 20;
    readonly maxPageSize: 100;
};
/**
 * Parsed pagination parameters
 */
export type PaginationParams = {
    page: number;
    pageSize: number;
    offset: number;
};
/**
 * Parsed search parameters
 */
export type SearchParams = {
    q: string | null;
};
/**
 * Combined pagination and search parameters
 */
export type PaginationSearchParams = PaginationParams & SearchParams;
/**
 * Schema for validating pagination query parameters
 */
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page?: number | undefined;
    pageSize?: number | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
/**
 * Schema for validating search query parameter
 */
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
}, {
    q?: string | undefined;
}>;
/**
 * Combined schema for pagination and search
 */
export declare const paginationSearchQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
} & {
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}, {
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
/**
 * Parse pagination parameters from query string
 *
 * Validates:
 * - page >= 1 (defaults to 1)
 * - pageSize <= 100 (defaults to 20)
 *
 * @example
 * const { page, pageSize, offset } = parsePagination(request.query);
 * const items = await repo.findMany({ accountId, limit: pageSize, offset });
 */
export declare function parsePagination(query: Record<string, unknown>): PaginationParams;
/**
 * Parse search parameter from query string
 *
 * Validates:
 * - q is trimmed
 * - q max length is 100 characters
 *
 * @example
 * const { q } = parseSearch(request.query);
 * if (q) {
 *   // Apply search filter
 * }
 */
export declare function parseSearch(query: Record<string, unknown>): SearchParams;
/**
 * Parse combined pagination and search parameters
 *
 * @example
 * const { page, pageSize, offset, q } = parsePaginationSearch(request.query);
 */
export declare function parsePaginationSearch(query: Record<string, unknown>): PaginationSearchParams;
/**
 * Calculate total pages based on total count and page size
 */
export declare function calculateTotalPages(total: number, pageSize: number): number;
/**
 * Check if there are more pages
 */
export declare function hasMore(page: number, total: number, pageSize: number): boolean;
//# sourceMappingURL=pagination.d.ts.map