import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  readonly tenantId: string;
  readonly accountId: string;
  readonly branchId?: string;
  readonly userId?: string;
  readonly correlationId: string;
}

const als = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return als.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error(
      'Tenant context is not available. All database operations require a tenant context.'
    );
  }
  return ctx;
}

export function requireTenantId(): string {
  return requireTenantContext().tenantId;
}

export function requireAccountId(): string {
  return requireTenantContext().accountId;
}
