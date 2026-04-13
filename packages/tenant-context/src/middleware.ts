import type { IncomingMessage } from 'node:http';
import { getTenantContext, type TenantContext } from './context.js';

export interface TenantMiddlewareOptions {
  readonly defaultTenantId?: string;
  readonly fallbackAccountId?: string;
  readonly fallbackUserId?: string;
}

export function resolveTenantFromRequest(
  request: IncomingMessage,
  options: TenantMiddlewareOptions = {}
): TenantContext {
  const correlationId = (request.headers['x-correlation-id'] as string) ?? 'unknown';

  const tenantId = (request.headers['x-tenant-id'] as string) ?? options.defaultTenantId;

  const accountId =
    (request.headers['x-account-id'] as string | undefined) ?? options.fallbackAccountId;

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
    userId: (request.headers['x-user-id'] as string | undefined) ?? options.fallbackUserId,
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
