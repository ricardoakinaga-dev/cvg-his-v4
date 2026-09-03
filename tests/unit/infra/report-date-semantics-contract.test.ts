import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('canonical report date semantics', () => {
  it('validates ISO calendar dates and inclusive periods at the API boundary', () => {
    const routes = read('apps/api/src/routes/reports-routes.ts');
    expect(routes).toContain('!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)');
    expect(routes).toContain('date.toISOString().slice(0, 10) !== value');
    expect(routes).toContain('dateFrom must be before or equal to dateTo');
    expect(routes).toContain('reportDate >= dateFrom');
    expect(routes).toContain('reportDate <= dateTo');
  });

  it('uses half-open UTC intervals for persisted timestamp reports', () => {
    for (const path of [
      'packages/modules/counter-sales/src/repositories/database-counter-sales.repository.ts',
      'packages/modules/inventory/src/repositories/database-inventory.repository.ts',
      'packages/modules/scheduling/src/repositories/database-scheduling.repository.ts'
    ]) {
      const source = read(path);
      expect(source, path).toContain("AT TIME ZONE 'UTC'");
      expect(source, path).toMatch(/created_at|start_at/);
      expect(source, path).toMatch(/>=/);
      expect(source, path).toMatch(/<.*(?:INTERVAL '1 day'|::date \+ 1)/s);
    }
  });

  it('normalizes timestamptz projections to UTC dates and bans truncated day ends', () => {
    for (const path of [
      'packages/modules/financial/src/receivables-report.ts',
      'packages/modules/financial/src/finance-catalog-report.ts',
      'packages/modules/inventory/src/inventory-products-report.ts',
      'packages/modules/owners/src/owners-report.ts',
      'packages/modules/patients/src/patients-report.ts',
      'packages/modules/services/src/services-report.ts'
    ]) {
      expect(read(path), path).toContain("AT TIME ZONE 'UTC'");
    }

    const counterSales = read('packages/modules/counter-sales/src/index.ts');
    expect(counterSales).toContain('isWithinUtcCalendarDateRange');
    expect(counterSales).toContain('timestamp < toExclusive');
    expect(counterSales).not.toContain("dateTo + 'T23:59:59'");
  });
});
