import { and, type AnyColumn, eq, type SQL, type Table } from 'drizzle-orm';
import { requireAccountId, requireTenantId, type TenantContext } from './context.js';

export interface TenantQueryOptions {
  readonly accountIdColumn: AnyColumn;
  readonly tenantIdColumn?: AnyColumn;
}

export function tenantFilter(table: Table, options: TenantQueryOptions): SQL {
  const accountId = requireAccountId();
  const conditions: SQL[] = [eq(options.accountIdColumn as AnyColumn, accountId)];

  if (options.tenantIdColumn) {
    const tenantId = requireTenantId();
    conditions.push(eq(options.tenantIdColumn as AnyColumn, tenantId));
  }

  const predicate = and(...conditions);
  if (!predicate) throw new Error('Tenant filter must contain an account condition');
  return predicate;
}

export function getTenantAccountId(): string {
  return requireAccountId();
}

export function getTenantId(): string {
  return requireTenantId();
}

export function requireTenantContextOrThrow(): TenantContext {
  const ctx = requireAccountId();
  const tenantId = requireTenantId();
  return {
    tenantId,
    accountId: ctx,
    correlationId: 'unknown'
  };
}
