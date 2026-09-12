import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { test } from 'vitest';

import {
  DatabaseAdvancePaymentsReportSource
} from './advance-payments-report.js';

test('DatabaseAdvancePaymentsReportSource uses UTC half-open date boundaries', async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const client = {
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      if (text === 'BEGIN' || text === 'COMMIT' || text.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("set_config('app.current_account_id'")) {
        return { rows: [], rowCount: 1 };
      }
      if (text.includes("current_setting('app.current_account_id'")) {
        return { rows: [{ matches: true }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined
  };
  const pool = { connect: async () => client } as unknown as Pool;
  const source = new DatabaseAdvancePaymentsReportSource(pool);

  await source.list('11111111-1111-4111-8111-111111111111' as never, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  const query = calls.find((call) => call.text.includes('FROM report_rows'));
  assert.ok(query);
  assert.match(query.text, /issued_at >= \(\$2::date AT TIME ZONE 'UTC'\)/);
  assert.match(
    query.text,
    /issued_at < \(\(\$3::date \+ INTERVAL '1 day'\) AT TIME ZONE 'UTC'\)/
  );
  assert.deepEqual(query.values, [
    '11111111-1111-4111-8111-111111111111',
    '2026-05-01',
    '2026-05-31'
  ]);
});
