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
export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100
} as const;

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
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.page).optional(),
  pageSize: z.coerce.number().int().min(1).max(PAGINATION_DEFAULTS.maxPageSize).default(PAGINATION_DEFAULTS.pageSize).optional()
});

/**
 * Schema for validating search query parameter
 */
export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional()
});

/**
 * Combined schema for pagination and search
 */
export const paginationSearchQuerySchema = paginationQuerySchema.merge(searchQuerySchema);

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
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const result = paginationQuerySchema.safeParse(query);
  
  if (!result.success) {
    // Return defaults on parse error
    return {
      page: PAGINATION_DEFAULTS.page,
      pageSize: PAGINATION_DEFAULTS.pageSize,
      offset: 0
    };
  }
  
  const page = result.data.page ?? PAGINATION_DEFAULTS.page;
  const pageSize = result.data.pageSize ?? PAGINATION_DEFAULTS.pageSize;
  
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

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
export function parseSearch(query: Record<string, unknown>): SearchParams {
  const result = searchQuerySchema.safeParse(query);
  
  if (!result.success) {
    return { q: null };
  }
  
  const q = result.data.q?.trim() || null;
  
  return { q };
}

/**
 * Parse combined pagination and search parameters
 * 
 * @example
 * const { page, pageSize, offset, q } = parsePaginationSearch(request.query);
 */
export function parsePaginationSearch(query: Record<string, unknown>): PaginationSearchParams {
  const pagination = parsePagination(query);
  const search = parseSearch(query);
  
  return {
    ...pagination,
    ...search
  };
}

/**
 * Calculate total pages based on total count and page size
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * Check if there are more pages
 */
export function hasMore(page: number, total: number, pageSize: number): boolean {
  const totalPages = calculateTotalPages(total, pageSize);
  return page < totalPages;
}
