/**
 * Tenant Guardrail Utilities
 *
 * These utilities ensure that all operations are properly scoped to a tenant (account_id).
 * Missing account_id in context results in 401/403 errors.
 */
import type { FastifyRequest } from 'fastify';
import type { FastifyReply } from 'fastify';
/**
 * Error thrown when account_id is missing from context
 */
export declare class MissingTenantContextError extends Error {
    readonly statusCode: number;
    constructor(message?: string);
}
/**
 * Error thrown when there's a tenant mismatch (cross-tenant access attempt)
 */
export declare class TenantMismatchError extends Error {
    readonly statusCode: number;
    constructor(message?: string);
}
/**
 * Extract and validate account_id from request context
 * Throws MissingTenantContextError if not present
 */
export declare function requireAccountId(request: FastifyRequest): string;
/**
 * Validate that a resource belongs to the current tenant
 * Throws TenantMismatchError if there's a mismatch
 */
export declare function requireTenantMatch(request: FastifyRequest, resourceAccountId: string): void;
/**
 * Fastify preHandler hook to ensure account_id is present
 */
export declare function tenantGuardrail(): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Helper to add account_id filter to any query
 */
export declare function withTenantFilter(query: string, accountId: string, existingWhereClause?: boolean): {
    query: string;
    accountId: string;
};
/**
 * Type guard to check if an error is a tenant-related error
 */
export declare function isTenantError(error: unknown): error is MissingTenantContextError | TenantMismatchError;
//# sourceMappingURL=tenantGuardrail.d.ts.map