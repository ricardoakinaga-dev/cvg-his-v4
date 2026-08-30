import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import { DatabaseOwnersReportSource, MAX_OWNERS_REPORT_ROWS } from './owners-report.js';

interface QueryCall {
  readonly text: string;
  readonly values?: readonly unknown[];
}

function createPool(rows: readonly Record<string, unknown>[]) {
  const calls: QueryCall[] = [];
  const client = {
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      if (text === 'BEGIN' || text === 'COMMIT' || text.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes(`set_config('app.current_account_id'`)) {
        return { rows: [], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    },
    release: () => undefined
  };

  return {
    pool: { connect: async () => client } as unknown as Pool,
    calls
  };
}

const accountId = '11111111-1111-4111-8111-111111111111';

const persistedRow = {
  account_id: accountId,
  id: '22222222-2222-4222-8222-222222222222',
  document: '111.111.111-11',
  full_name: 'Maria Silva',
  email: 'maria@example.test',
  phone_main: '+55 11 99999-1111',
  phone_alt: '+55 11 98888-1111',
  contacts_json: [
    {
      label: 'WhatsApp',
      value: '+55 11 99999-1111',
      type: 'whatsapp',
      primary: true
    }
  ],
  city: 'São Paulo',
  financial_responsible: 'true',
  status: 'active',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-02T00:00:00.000Z'
};

test('DatabaseOwnersReportSource returns a bounded tenant-safe exact projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseOwnersReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: '22222222-2222-4222-8222-222222222222',
      documentId: '111.111.111-11',
      fullName: 'Maria Silva',
      primaryContact: 'WhatsApp: +55 11 99999-1111',
      city: 'São Paulo',
      financialResponsible: true,
      status: 'active',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z'
    }
  ]);

  const projection = harness.calls.find((call) => call.text.includes('FROM owners'));
  assert.ok(projection);
  assert.match(projection.text, /owners\.account_id = \$1/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /ORDER BY owners\.full_name ASC, owners\.id ASC/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.doesNotMatch(projection.text, /patients|microchip/i);
  assert.doesNotMatch(projection.text, /administrativeNotes|financialProfile/i);
  assert.deepEqual(projection.values, [accountId, '2026-05-01', '2026-05-31']);
});

test('DatabaseOwnersReportSource applies safe metadata fallbacks', async () => {
  const harness = createPool([
    {
      ...persistedRow,
      email: 'fallback@example.test',
      phone_main: null,
      phone_alt: null,
      contacts_json: null,
      city: null,
      financial_responsible: null,
      status: null
    }
  ]);

  const rows = await new DatabaseOwnersReportSource(harness.pool).list(accountId as never);

  assert.deepEqual(rows[0], {
    accountId,
    id: '22222222-2222-4222-8222-222222222222',
    documentId: '111.111.111-11',
    fullName: 'Maria Silva',
    primaryContact: 'Email: fallback@example.test',
    city: null,
    financialResponsible: true,
    status: 'active',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z'
  });
});

test('DatabaseOwnersReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(Array.from({ length: MAX_OWNERS_REPORT_ROWS + 1 }, () => ({})));
  const source = new DatabaseOwnersReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'OWNERS_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseOwnersReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabaseOwnersReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) => error instanceof AppError && error.code === 'OWNERS_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value, code] of [
    ['full_name', '', 'OWNERS_REPORT_INVALID_TEXT'],
    ['document', 42, 'OWNERS_REPORT_INVALID_TEXT'],
    ['city', 42, 'OWNERS_REPORT_INVALID_TEXT'],
    ['contacts_json', [{}], 'OWNERS_REPORT_INVALID_CONTACTS'],
    ['financial_responsible', 'maybe', 'OWNERS_REPORT_INVALID_FINANCIAL_RESPONSIBLE'],
    ['status', 'deleted', 'OWNERS_REPORT_INVALID_STATUS'],
    ['created_at', 'not-a-date', 'OWNERS_REPORT_INVALID_DATE'],
    ['updated_at', 0, 'OWNERS_REPORT_INVALID_DATE']
  ] as const) {
    await assert.rejects(
      new DatabaseOwnersReportSource(createPool([{ ...persistedRow, [field]: value }]).pool).list(
        accountId as never
      ),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});

test('DatabaseOwnersReportSource rejects invalid scheduled date filters before querying', async () => {
  const harness = createPool([]);
  const source = new DatabaseOwnersReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'OWNERS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-31' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'OWNERS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  assert.equal(harness.calls.length, 0);
});
