import type { IncomingMessage } from 'node:http';
import { getTenantContext, type TenantContext } from './context.js';

export interface TenantMiddlewareOptions {
  readonly defaultTenantId?: string;
  readonly fallbackAccountId?: string;
  readonly fallbackUserId?: string;
  /**
   * Allows `x-tenant-id`, `x-account-id` and `x-user-id` request headers to
   * establish the tenant scope when no authenticated identity was resolved.
   *
   * Defaults to `false`: the tenant scope drives PostgreSQL RLS
   * (`app.current_account_id`), so trusting client headers would let an
   * unauthenticated caller pick which tenant's rows the connection can read.
   * Enable only for trusted, non-public callers (tooling and tests).
   */
  readonly allowHeaderIdentity?: boolean;
}

export function resolveTenantFromRequest(
  request: IncomingMessage,
  options: TenantMiddlewareOptions = {}
): TenantContext {
  const correlationId = (request.headers['x-correlation-id'] as string) ?? 'unknown';
  const allowHeaderIdentity = options.allowHeaderIdentity === true;

  const headerTenantId = allowHeaderIdentity
    ? (request.headers['x-tenant-id'] as string | undefined)
    : undefined;
  const headerAccountId = allowHeaderIdentity
    ? (request.headers['x-account-id'] as string | undefined)
    : undefined;
  const headerUserId = allowHeaderIdentity
    ? (request.headers['x-user-id'] as string | undefined)
    : undefined;

  const tenantId = options.defaultTenantId ?? headerTenantId;
  const accountId = options.fallbackAccountId ?? headerAccountId;

  if (!tenantId) {
    throw new Error(
      'Tenant ID is required. Provide x-tenant-id header or configure a default tenant.'
    );
  }

  if (!accountId) {
    throw new Error(
      'Account ID is required. Provide x-account-id header or a valid authorization token.'
    );
  }

  return {
    tenantId,
    accountId,
    branchId: request.headers['x-branch-id'] as string | undefined,
    userId: options.fallbackUserId ?? headerUserId,
    correlationId
  };
}

export function getOrResolveTenantContext(
  request: IncomingMessage,
  options: TenantMiddlewareOptions = {}
): TenantContext {
  const existing = getTenantContext();
  if (existing) {
    return existing;
  }
  return resolveTenantFromRequest(request, options);
}
