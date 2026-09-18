import { Readable, Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { handleApiKeysRoutes } from '../../../apps/api/src/routes/api-keys-routes.ts';

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
    method: 'POST',
    url: '/api-keys'
  });
}

describe('api keys route validation', () => {
  it('rejects an API key without permissions before calling the service', async () => {
    const apiKeys = { create: async () => { throw new Error('must not create'); } };
    const response = new MockResponse();

    await expect(
      handleApiKeysRoutes(
        '/api-keys',
        createJsonRequest({ name: 'Integration key', permissions: [] }) as never,
        response as never,
        'corr-api-key-empty-permissions',
        {
          apiKeys: apiKeys as never,
          accessControl: { listPermissions: () => [] } as never,
          audit: {} as never,
          enforceAbac: () => {},
          requirePrincipal: () => ({
            user: { id: 'user-1', accountId: 'account-1' }
          }) as never
        }
      )
    ).rejects.toThrow('permissions must contain at least one permission');
  });
});
