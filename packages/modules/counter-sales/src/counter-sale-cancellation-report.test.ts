import { describe, expect, it, vi } from 'vitest';

import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { CounterSalesService } from './index.js';
import { DatabaseCounterSalesRepository } from './repositories/database-counter-sales.repository.js';

const database = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@cvg-his-v2/shared-database', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  getPool: () => ({})
}));
vi.mock('@cvg-his-v2/tenant-context', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  withTenantQuery: async (_pool: unknown, operation: (client: unknown) => unknown) =>
    operation({ query: database.query })
}));

const accountId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as AccountId;
const otherAccount = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as AccountId;
const row = {
  eventId: 'event-1',
  accountId,
  counterSaleId: 'sale-1',
  number: 'CS-000001',
  ownerId: null,
  cancelledAt: '2026-09-04T23:59:59.999Z',
  cancelledByUserId: 'operator-1',
  reason: 'Cliente desistiu',
  correlationId: 'corr-1',
  total: 100,
  discountAmount: 10,
  paidAmount: 20,
  balanceDue: 80
};

function auditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: row.eventId,
    account_id: accountId,
    entity_id: row.counterSaleId,
    actor_user_id: row.cancelledByUserId,
    occurred_at: new Date(row.cancelledAt),
    reason: row.reason,
    correlation_id: row.correlationId,
    after_json: {
      id: row.counterSaleId,
      accountId,
      number: row.number,
      ownerId: null,
      status: 'cancelled',
      total: row.total,
      discountAmount: row.discountAmount,
      paidAmount: row.paidAmount,
      balanceDue: row.balanceDue
    },
    ...overrides
  };
}

function readRepository(filters = {}) {
  return runWithTenantContext(
    { tenantId: 'tenant-1', accountId, correlationId: 'report-test' },
    () => new DatabaseCounterSalesRepository().listCancellationReportRows(accountId, filters)
  );
}

describe('persisted cancellation report source', () => {
  it('reads event-time facts with one bounded account-scoped UTC query', async () => {
    database.query.mockReset().mockResolvedValue({ rows: [auditRow()] });
    expect(await readRepository({ dateFrom: '2026-09-04', dateTo: '2026-09-04' })).toEqual([row]);
    expect(database.query).toHaveBeenCalledTimes(1);
    const [sql, params] = database.query.mock.calls[0]!;
    expect(sql).toContain('FROM audit_events');
    expect(sql).toContain('account_id = $1');
    expect(sql).toContain("entity_type = 'counter-sale'");
    expect(sql).toContain("action = 'cancelled'");
    expect(sql).toContain('ORDER BY occurred_at DESC, id DESC');
    expect(sql).toContain("AT TIME ZONE 'UTC'");
    expect(sql).not.toContain('FROM counter_sales');
    expect(params).toEqual([accountId, '2026-09-04', '2026-09-04', 10_001]);
  });

  it.each([
    { dateFrom: '2026-02-30' },
    { dateTo: '2026-09-04T00:00:00Z' },
    { dateFrom: '2026-09-05', dateTo: '2026-09-04' },
    { dateFrom: '0000-01-01' },
    { search: 'x'.repeat(201) },
    { search: 'invalid\nsearch' },
    { limit: 0 },
    { limit: 10_001 },
    { limit: 1.5 },
    { limit: null },
    { unknown: 'ignored filter' }
  ])('rejects invalid filters before querying: %j', async (filters) => {
    database.query.mockReset();
    await expect(readRepository(filters)).rejects.toThrow();
    expect(database.query).not.toHaveBeenCalled();
  });

  it('rejects missing account or tenant context and mismatched context before querying', async () => {
    database.query.mockReset();
    const repository = new DatabaseCounterSalesRepository();
    await expect(repository.listCancellationReportRows('' as AccountId)).rejects.toThrow(/account/);
    await expect(repository.listCancellationReportRows(accountId)).rejects.toThrow(/context/);
    await expect(
      runWithTenantContext(
        { tenantId: 'tenant-1', accountId: otherAccount, correlationId: 'report-test' },
        () => repository.listCancellationReportRows(accountId)
      )
    ).rejects.toThrow(/context/);
    expect(database.query).not.toHaveBeenCalled();
  });

  it.each([
    { after_json: null },
    { after_json: [] },
    { after_json: {} },
    { account_id: otherAccount },
    { actor_user_id: null },
    { reason: null },
    { reason: ' ' },
    { correlation_id: '' },
    { occurred_at: null },
    { occurred_at: new Date(Number.NaN) },
    { after_json: { ...auditRow().after_json, status: 'open' } },
    { after_json: { ...auditRow().after_json, id: 'other-sale' } },
    { after_json: { ...auditRow().after_json, accountId: otherAccount } },
    { after_json: { ...auditRow().after_json, number: '' } },
    { after_json: { ...auditRow().after_json, ownerId: undefined } },
    { after_json: { ...auditRow().after_json, total: '100' } },
    { after_json: { ...auditRow().after_json, discountAmount: -1 } },
    { after_json: { ...auditRow().after_json, paidAmount: Number.POSITIVE_INFINITY } },
    { after_json: { ...auditRow().after_json, balanceDue: undefined } }
  ])('fails explicitly for malformed audit facts: %j', async (invalid) => {
    database.query.mockReset().mockResolvedValue({ rows: [auditRow(), auditRow(invalid)] });
    await expect(readRepository()).rejects.toThrow(/Cancellation report/);
  });

  it('rejects a result beyond the requested cap rather than truncate it', async () => {
    database.query
      .mockReset()
      .mockResolvedValue({ rows: [auditRow(), auditRow({ id: 'event-2' })] });
    await expect(readRepository({ limit: 1 })).rejects.toThrow(/maximum supported row count/);
    expect(database.query.mock.calls[0]![1]).toEqual([accountId, 2]);
  });

  it('searches literal text in recorded event facts without SQL wildcards', async () => {
    database.query
      .mockReset()
      .mockResolvedValue({ rows: [auditRow({ reason: 'Cliente: 50%_off' })] });
    expect(await readRepository({ search: '50%_off' })).toHaveLength(1);
    const [sql, params] = database.query.mock.calls[0]!;
    expect(sql).toContain('strpos(lower(concat_ws(');
    expect(params).toEqual([accountId, '50%_off', 10_001]);
  });
});

describe('cancellation report service source boundary', () => {
  function serviceWithRows(rows: unknown) {
    const listCancellationReportRows = vi.fn(async () => rows);
    const service = new CounterSalesService({
      repository: { listCancellationReportRows } as never
    });
    return { service, listCancellationReportRows };
  }

  it('requires a persisted report source even when local cancellation history exists', async () => {
    const service = new CounterSalesService();
    await expect(service.listCancellationReportRows(accountId)).rejects.toThrow(/database-backed/);
  });

  it('normalizes filters and returns immutable event snapshots in deterministic order', async () => {
    const earlier = { ...row, eventId: 'event-0', cancelledAt: '2026-09-04T00:00:00.000Z' };
    const laterId = { ...row, eventId: 'event-2' };
    const source = [earlier, row, laterId];
    const { service, listCancellationReportRows } = serviceWithRows(source);
    const result = await service.listCancellationReportRows(accountId, {
      search: '  CLIENTE  ',
      dateFrom: '2026-09-04',
      dateTo: '2026-09-04'
    });
    expect(result.map((item) => item.eventId)).toEqual(['event-2', 'event-1', 'event-0']);
    expect(listCancellationReportRows).toHaveBeenCalledWith(accountId, {
      search: 'CLIENTE',
      dateFrom: '2026-09-04',
      dateTo: '2026-09-04',
      limit: 10_000
    });
    expect(result[1]).not.toBe(row);
    expect(source[0]).toBe(earlier);
  });

  it.each([
    { rows: [{ ...row, accountId: otherAccount }] },
    { rows: [{ ...row, cancelledAt: '2026-09-05T00:00:00.000Z' }] },
    { rows: [{ ...row, cancelledAt: '2026-09-03T23:59:59.999Z' }] },
    { rows: [{ ...row, cancelledAt: '2026-02-30T00:00:00.000Z' }] },
    { rows: [{ ...row, reason: 'unrelated' }] },
    { rows: [{ ...row, total: null }] },
    { rows: [row, row] },
    { rows: null }
  ])('rejects malformed, duplicate, foreign or out-of-filter source rows: %j', async ({ rows }) => {
    const { service } = serviceWithRows(rows);
    await expect(
      service.listCancellationReportRows(accountId, {
        search: 'Cliente',
        dateFrom: '2026-09-04',
        dateTo: '2026-09-04'
      })
    ).rejects.toThrow(/Cancellation report/);
  });

  it('rejects missing account before calling a repository', async () => {
    const { service, listCancellationReportRows } = serviceWithRows([]);
    await expect(service.listCancellationReportRows('' as AccountId)).rejects.toThrow(/account/);
    expect(listCancellationReportRows).not.toHaveBeenCalled();
  });

  it('rejects more than 10000 rows from an untrusted repository', async () => {
    const { service } = serviceWithRows(
      Array.from({ length: 10_001 }, (_, i) => ({
        ...row,
        eventId: `event-${i}`
      }))
    );
    await expect(service.listCancellationReportRows(accountId)).rejects.toThrow(
      /maximum supported row count/
    );
  });
});
