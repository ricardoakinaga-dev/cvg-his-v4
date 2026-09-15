import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

import * as schema from '../../../packages/db/src/schema/index.ts';
import { can, canonicalPermissions, permissionsForRole } from '../../../packages/rbac/src/index.ts';
import {
  getTenantAccountId,
  getTenantId,
  requireTenantContextOrThrow,
  runWithTenantContext,
  tenantFilter
} from '../../../packages/tenant-context/src/index.ts';

type TableExport = [string, unknown];
type TableRecord = {
  exportName: string;
  table: Parameters<typeof getTableConfig>[0];
  config: ReturnType<typeof getTableConfig>;
};

function tableExports(): TableRecord[] {
  const tables: TableRecord[] = [];

  for (const [exportName, value] of Object.entries(schema) as TableExport[]) {
    try {
      const table = value as Parameters<typeof getTableConfig>[0];
      tables.push({ exportName, table, config: getTableConfig(table) });
    } catch {
      // Schema enums are intentionally exported beside tables; they are not table configs.
    }
  }

  return tables;
}

describe('canonical PostgreSQL schema catalog', () => {
  it('exports every canonical table exactly once with executable columns and stable names', () => {
    const tables = tableExports();
    const tableNames = tables.map(({ config }) => config.name);

    expect(tables.length).toBeGreaterThan(100);
    expect(new Set(tableNames).size).toBe(tableNames.length);
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('clinical_handoffs');
    expect(tableNames).toContain('financial_journal_entries');
    expect(tableNames).toContain('pix_transactions');
    expect(tableNames).toContain('outbox_events');

    for (const { config } of tables) {
      expect(config.columns.length).toBeGreaterThan(0);
      expect(config.name).toMatch(/^[a-z][a-z0-9_]*$/);
      for (const foreignKey of config.foreignKeys) {
        const reference = foreignKey.reference();
        expect(reference.columns.length).toBeGreaterThan(0);
        expect(reference.foreignColumns.length).toBe(reference.columns.length);
      }
    }
  });

  it('keeps tenant-owned clinical and financial tables scoped by account_id', () => {
    const tables = new Map(tableExports().map(({ config }) => [config.name, config]));
    const tenantTables = [
      'owners',
      'patients',
      'encounters',
      'clinical_handoffs',
      'inpatient_stays',
      'billing_records',
      'financial_journal_entries',
      'pix_transactions',
      'outbox_events'
    ];

    for (const tableName of tenantTables) {
      const config = tables.get(tableName);
      expect(config, `missing schema table ${tableName}`).toBeDefined();
      expect(config?.columns.some((column) => column.name === 'account_id')).toBe(true);
    }
  });

  it('does not confuse exported enums with executable table definitions', () => {
    const tables = tableExports();
    const exportedNames = new Set(tables.map(({ exportName }) => exportName));

    expect(exportedNames.has('appointmentStatusEnum')).toBe(false);
    expect(exportedNames.has('encounterStatusEnum')).toBe(false);
    expect(tables.every(({ table, config }) => getTableName(table) === config.name)).toBe(true);
  });

  it('keeps RBAC role inheritance, direct grants, and wildcard grants fail-closed', () => {
    const canonical = canonicalPermissions();

    expect(canonical.length).toBeGreaterThan(20);
    expect(permissionsForRole('admin')).toEqual(canonical);
    expect(permissionsForRole('role-that-does-not-exist')).toEqual([]);
    expect(can({ permissions: ['owner.read'] }, 'owner.read')).toBe(true);
    expect(can({ permissions: ['*'] }, 'billing.read')).toBe(true);
    expect(can({ roles: ['admin'] }, 'billing_item.read')).toBe(true);
    expect(can({ role: 'not-a-role' }, 'billing_item.read')).toBe(false);
    expect(can({}, 'billing_item.read')).toBe(false);
  });

  it('requires both account and tenant context when composing tenant predicates', () => {
    const accountId = 'account-catalog-test';
    const tenantId = 'tenant-catalog-test';

    expect(() => getTenantAccountId()).toThrow(/tenant context/i);
    expect(() => tenantFilter(schema.accounts, { accountIdColumn: schema.accounts.tenantId })).toThrow(
      /tenant context/i
    );

    runWithTenantContext({ tenantId, accountId, correlationId: 'catalog-correlation' }, () => {
      expect(getTenantAccountId()).toBe(accountId);
      expect(getTenantId()).toBe(tenantId);
      expect(requireTenantContextOrThrow()).toEqual({
        tenantId,
        accountId,
        correlationId: 'unknown'
      });

      const accountOnly = tenantFilter(schema.accounts, { accountIdColumn: schema.accounts.tenantId });
      const accountAndTenant = tenantFilter(schema.accounts, {
        accountIdColumn: schema.accounts.tenantId,
        tenantIdColumn: schema.accounts.id
      });
      expect(accountOnly).toBeTruthy();
      expect(accountAndTenant).toBeTruthy();
    });
  });
});
