import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { ReportsService } from '@cvg-his-v2/module-reports';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { handleReportsRoutes } from './reports-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;

  _write(
    _chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    callback();
  }

  setHeader(): this {
    return this;
  }
}

function request(url: string): never {
  return {
    method: 'GET',
    url,
    [Symbol.asyncIterator]: async function* () {}
  } as never;
}

test('handleReportsRoutes hides an export artifact from another account', async () => {
  const reports = new ReportsService();
  const execution = await reports.execute('acc-report-owner' as never, 'user-owner' as never, {
    reportId: 'financial-payables',
    rows: []
  });
  const exported = await reports.exportExecution(
    'acc-report-owner' as never,
    'user-owner' as never,
    execution.id,
    'csv'
  );
  let auditWrites = 0;
  const foreignAccountId = 'acc-report-foreign';
  const foreignPrincipal = {
    user: { id: 'user-foreign', accountId: foreignAccountId },
    session: { accountId: foreignAccountId }
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/exports/${exported.id}`,
        request(`/reports/exports/${exported.id}`),
        new MockResponse() as never,
        'corr-foreign-report-export',
        {
          reports,
          audit: {
            write() {
              auditWrites += 1;
            }
          },
          requirePrincipal: () => foreignPrincipal
        } as never
      ),
    (error: unknown) =>
      error instanceof NotFoundError &&
      error.code === 'NOT_FOUND' &&
      error.statusCode === 404 &&
      error.message === 'Report export not found' &&
      !JSON.stringify(error.details).includes(foreignAccountId)
  );

  assert.equal(auditWrites, 0);
});
