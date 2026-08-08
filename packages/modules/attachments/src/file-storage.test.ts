import assert from 'node:assert/strict';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { S3CompatibleFileStorage } from './file-storage.js';

describe('S3CompatibleFileStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses private tenant-scoped objects and SigV4 headers for compatible storage', async () => {
    const calls: Array<{ url: string; method: string; headers: Headers }> = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        headers: new Headers(init?.headers)
      });
      const method = init?.method ?? 'GET';
      if (method === 'GET') return new Response(Buffer.from('clinical file'), { status: 200 });
      return new Response(null, { status: method === 'HEAD' ? 200 : 204 });
    });

    const storage = new S3CompatibleFileStorage({
      endpoint: 'https://minio.example.test/storage',
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      region: 'sa-east-1',
      pathStyle: true
    });
    const content = Buffer.from('clinical file');

    const stored = await storage.store('account-a', 'encounter-a', 'laudo final.pdf', content);
    expect(stored.storageKey).toContain('account-a/encounter-a/');
    expect(stored.storageKey).not.toContain('laudo final');
    expect(calls[0].url).toContain('/storage/private-cvg/account-a/encounter-a/');
    expect(calls[0].headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
    expect(calls[0].headers.get('x-amz-content-sha256')).toBeTruthy();

    const downloaded = await storage.retrieve(stored.storageKey);
    assert.deepEqual(downloaded, content);
    expect(await storage.exists(stored.storageKey)).toBe(true);
    expect(await storage.delete(stored.storageKey)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
