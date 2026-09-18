import { Readable, Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { handleBillingRoutes } from '../../../apps/api/src/routes/billing-routes.ts';

class MockResponse extends Writable {
  statusCode = 200;

  _write(
    _chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    callback();
  }
}

function createJsonRequest(body: unknown): Readable {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'PATCH',
    url: '/billing/encounter-1/status'
  });
}

function createHandlers() {
  return {
    billing: {} as never,
    audit: {} as never,
    requirePrincipal: () => ({
      user: { id: 'user-1', accountId: 'account-1' }
    }) as never,
    enforceAbac: () => {}
  };
}

describe('billing status route validation', () => {
  it('rejects array payloads instead of treating them as status objects', async () => {
    await expect(
      handleBillingRoutes(
        '/billing/encounter-1/status',
        createJsonRequest([]) as never,
        new MockResponse() as never,
        'corr-billing-array-payload',
        createHandlers()
      )
    ).rejects.toThrow('Billing status request must be a JSON object');
  });

  it('rejects fields outside the billing status contract', async () => {
    await expect(
      handleBillingRoutes(
        '/billing/encounter-1/status',
        createJsonRequest({ status: 'open', unexpected: true }) as never,
        new MockResponse() as never,
        'corr-billing-unknown-field',
        createHandlers()
      )
    ).rejects.toThrow("Unknown field 'unexpected'");
  });
});
