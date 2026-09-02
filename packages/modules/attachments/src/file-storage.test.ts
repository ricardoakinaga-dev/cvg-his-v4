import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LocalFileStorage,
  S3CompatibleFileStorage,
  createMemoryFileStorage
} from './file-storage.js';

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

    const downloaded = await storage.retrieve('account-a', stored.storageKey);
    assert.deepEqual(downloaded, content);
    expect(await storage.retrieve('account-b', stored.storageKey)).toBeNull();
    expect(await storage.exists('account-a', stored.storageKey)).toBe(true);
    expect(await storage.exists('account-b', stored.storageKey)).toBe(false);
    expect(await storage.delete('account-a', stored.storageKey)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('keeps in-memory objects inaccessible through a foreign tenant key scope', async () => {
    const storage = createMemoryFileStorage();
    const content = Buffer.from('private tenant content');
    const stored = await storage.store('account-a', 'encounter-a', 'private.txt', content);

    expect(await storage.retrieve('account-a', stored.storageKey)).toEqual(content);
    expect(await storage.retrieve('account-b', stored.storageKey)).toBeNull();
    expect(await storage.exists('account-b', stored.storageKey)).toBe(false);
    expect(await storage.delete('account-b', stored.storageKey)).toBe(false);
    expect(await storage.exists('account-a', stored.storageKey)).toBe(true);
  });

  it('keeps local files inaccessible through a foreign tenant key scope', async () => {
    const basePath = await mkdtemp(join(tmpdir(), 'cvg-attachments-'));
    try {
      const storage = new LocalFileStorage({ basePath });
      const content = Buffer.from('private local content');
      const stored = await storage.store('account-a', 'encounter-a', 'private.txt', content);

      expect(await storage.retrieve('account-a', stored.storageKey)).toEqual(content);
      expect(await storage.retrieve('account-b', stored.storageKey)).toBeNull();
      expect(await storage.retrieve('account-a', '../account-b/escape.txt')).toBeNull();
      expect(await storage.exists('account-b', stored.storageKey)).toBe(false);
      expect(await storage.delete('account-b', stored.storageKey)).toBe(false);
      expect(await storage.exists('account-a', stored.storageKey)).toBe(true);
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });
});
