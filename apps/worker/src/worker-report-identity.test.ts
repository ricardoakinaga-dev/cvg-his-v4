import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { Pool } from 'pg';

import type { UserId } from '@cvg-his-v2/shared-types';
import {
  resolveWorkerReportsUserId,
  resolveWorkerReportServicePrincipal
} from './worker-report-identity.js';

const VALID_USER_ID = '11111111-1111-4111-8111-111111111111' as UserId;

test('resolveWorkerReportsUserId accepts the explicit UUID actor', () => {
  assert.equal(resolveWorkerReportsUserId(VALID_USER_ID), VALID_USER_ID);
});

test('resolveWorkerReportsUserId trims the configured actor', () => {
  assert.equal(resolveWorkerReportsUserId(`  ${VALID_USER_ID}  `), VALID_USER_ID);
});

test('resolveWorkerReportsUserId rejects a missing actor', () => {
  assert.throws(
    () => resolveWorkerReportsUserId(undefined),
    /WORKER_REPORTS_USER_ID is required/
  );
  assert.throws(() => resolveWorkerReportsUserId(''), /WORKER_REPORTS_USER_ID is required/);
});

test('resolveWorkerReportsUserId rejects malformed values', () => {
  assert.throws(
    () => resolveWorkerReportsUserId('not-a-uuid'),
    /WORKER_REPORTS_USER_ID must be a canonical UUID/
  );
  assert.throws(
    () => resolveWorkerReportsUserId('00000000-0000-0000-0000-000000000000'),
    /WORKER_REPORTS_USER_ID must be a canonical UUID/
  );
});

test('continuous and one-shot entrypoints share the explicit report actor boundary', () => {
  for (const entrypoint of ['index.js', 'run-once.js']) {
    const source = readFileSync(new URL(`./${entrypoint}`, import.meta.url), 'utf8');
    assert.match(source, /resolveWorkerReportsUserId\(config\.workerReportsUserId\)/);
    assert.match(
      source,
      /resolveWorkerReportServicePrincipal\(accountId, configuredWorkerReportsUserId\)/
    );
    assert.match(source, /runAsUserId: workerReportsUserId/);
    assert.doesNotMatch(source, /WORKER_REPORTS_USER_ID.*accountId/);
  }
});

test('the one-shot entrypoint always closes its database pool after failures', () => {
  const source = readFileSync(new URL('./run-once.js', import.meta.url), 'utf8');
  assert.match(source, /main\(\)[\s\S]*\.finally\(async \(\) => \{[\s\S]*shutdownWorkerServices\(\)/);
});

function createPool(rows: readonly Record<string, unknown>[]): Pool {
  const client = {
    query: async (text: string, values?: readonly unknown[]) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("set_config('app.current_account_id'")) {
        return { rows: [], rowCount: 1 };
      }
      assert.deepEqual(values, [
        '22222222-2222-4222-8222-222222222222',
        'report-execution',
        VALID_USER_ID
      ]);
      return { rows, rowCount: rows.length };
    },
    release: () => undefined
  };
  return {
    connect: async () => client
  } as unknown as Pool;
}

test('resolveWorkerReportServicePrincipal returns only an active mapped service actor', async () => {
  const actor = await resolveWorkerReportServicePrincipal(
    '22222222-2222-4222-8222-222222222222',
    VALID_USER_ID,
    createPool([
      {
        user_id: VALID_USER_ID,
        is_active: true,
        user_active: true,
        principal_kind: 'service',
        interactive_login_enabled: false
      }
    ])
  );

  assert.equal(actor, VALID_USER_ID);
});

test('resolveWorkerReportServicePrincipal rejects an unmapped or foreign actor', async () => {
  await assert.rejects(
    resolveWorkerReportServicePrincipal(
      '22222222-2222-4222-8222-222222222222',
      VALID_USER_ID,
      createPool([])
    ),
    /not mapped as an active report service principal/
  );
});
