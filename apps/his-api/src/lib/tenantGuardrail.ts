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
export class MissingTenantContextError extends Error {
  public readonly statusCode: number;

  constructor(message: string = 'Missing tenant context (account_id)') {
    super(message);
    this.name = 'MissingTenantContextError';
    this.statusCode = 401;
  }
}

/**
 * Error thrown when there's a tenant mismatch (cross-tenant access attempt)
 */
export class TenantMismatchError extends Error {
  public readonly statusCode: number;

  constructor(message: string = 'Cross-tenant access denied') {
    super(message);
    this.name = 'TenantMismatchError';
    this.statusCode = 403;
  }
}

/**
 * Extract and validate account_id from request context
 * Throws MissingTenantContextError if not present
 */
export function requireAccountId(request: FastifyRequest): string {
  const actor = request.requestContext.actor;
  
  if (!actor?.accountId) {
    throw new MissingTenantContextError('Missing or invalid actor context. Provide a valid Bearer token.');
  }
  
  return actor.accountId;
}

/**
 * Validate that a resource belongs to the current tenant
 * Throws TenantMismatchError if there's a mismatch
 */
export function requireTenantMatch(
  request: FastifyRequest,
  resourceAccountId: string
): void {
  const actorAccountId = requireAccountId(request);
  
  if (actorAccountId !== resourceAccountId) {
    throw new TenantMismatchError('Cross-tenant access denied');
  }
}

/**
 * Fastify preHandler hook to ensure account_id is present
 */
export function tenantGuardrail(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      requireAccountId(request);
    } catch (error) {
      if (error instanceof MissingTenantContextError) {
        void reply.status(error.statusCode).send({
          error: 'Unauthorized',
          message: error.message,
          code: 'MISSING_TENANT_CONTEXT'
        });
        return;
      }
      throw error;
    }
  };
}

/**
 * Helper to add account_id filter to any query
 */
export function withTenantFilter(
  query: string,
  accountId: string,
  existingWhereClause: boolean = false
): { query: string; accountId: string } {
  // This is a helper for documentation purposes
  // Actual query building should be done in the repo layer
  return { query, accountId };
}

/**
 * Type guard to check if an error is a tenant-related error
 */
export function isTenantError(error: unknown): error is MissingTenantContextError | TenantMismatchError {
  return error instanceof MissingTenantContextError || error instanceof TenantMismatchError;
}
