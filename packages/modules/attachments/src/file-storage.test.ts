import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LocalFileStorage,
  S3CompatibleFileStorage,
  createMemoryFileStorage
} from './file-storage.js';

describe('S3CompatibleFileStorage', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            if (!server.listening) {
              resolve();
              return;
            }
            server.closeAllConnections();
            server.close(() => resolve());
          })
      )
    );
  });

  it('uses private tenant-scoped objects and SigV4 headers for compatible storage', async () => {
    const calls: Array<{ url: string; method: string; headers: Headers }> = [];
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
          calls.push({
            url: String(input),
            method: init?.method ?? 'GET',
            headers: new Headers(init?.headers)
          });
          const method = init?.method ?? 'GET';
          if (method === 'GET') return new Response(Buffer.from('clinical file'), { status: 200 });
          return new Response(null, { status: method === 'HEAD' ? 200 : 204 });
        }
      );

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

  it('checks bucket reachability with signed HEAD and no object mutation', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const storage = new S3CompatibleFileStorage({
      endpoint: 'https://minio.example.test/storage',
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      healthCheckTimeoutMs: 200
    });

    await expect(storage.healthCheck()).resolves.toMatchObject({
      healthy: true,
      provider: 's3'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    expect(String(input)).toBe('https://minio.example.test/storage/private-cvg');
    expect(init?.method).toBe('HEAD');
    expect(new Headers(init?.headers).get('authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
    expect(init?.body).toBeUndefined();
  });

  it('fails bucket health closed for provider errors and timeouts', async () => {
    const storage = new S3CompatibleFileStorage({
      endpoint: 'https://minio.example.test',
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      healthCheckTimeoutMs: 20
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(storage.healthCheck()).resolves.toMatchObject({ healthy: false });

    fetchMock.mockImplementationOnce(
      (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true
          });
        })
    );
    const startedAt = Date.now();
    await expect(storage.healthCheck()).resolves.toMatchObject({ healthy: false });
    expect(Date.now() - startedAt).toBeLessThan(500);
  });

  it('applies the request deadline to store, exists, and delete response headers', async () => {
    const server = createServer((request) => {
      request.resume();
      // Intentionally never send response headers. The client must abort each
      // operation instead of retaining its request and upload buffer.
    });
    servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const storage = new S3CompatibleFileStorage({
      endpoint: `http://127.0.0.1:${address.port}`,
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      requestTimeoutMs: 50
    });
    const storageKey = 'account-a/encounter-a/hash_private.pdf';

    await expect(
      storage.store('account-a', 'encounter-a', 'private.pdf', Buffer.alloc(1024))
    ).rejects.toThrow('S3 request timed out');
    await expect(storage.exists('account-a', storageKey)).rejects.toThrow('S3 request timed out');
    await expect(storage.delete('account-a', storageKey)).rejects.toThrow('S3 request timed out');
  });

  it('keeps the retrieve deadline active while consuming the response body', async () => {
    let peerClosed = false;
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.write('partial');
      response.once('close', () => {
        peerClosed = true;
      });
    });
    servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const storage = new S3CompatibleFileStorage({
      endpoint: `http://127.0.0.1:${address.port}`,
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      requestTimeoutMs: 50
    });

    const startedAt = Date.now();
    await expect(
      storage.retrieve('account-a', 'account-a/encounter-a/hash_private.pdf')
    ).rejects.toThrow('S3 request timed out');
    expect(Date.now() - startedAt).toBeLessThan(500);
    await vi.waitFor(() => expect(peerClosed).toBe(true));
  });

  it('propagates caller cancellation to an in-flight S3 operation', async () => {
    const server = createServer(() => undefined);
    servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const storage = new S3CompatibleFileStorage({
      endpoint: `http://127.0.0.1:${address.port}`,
      bucket: 'private-cvg',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      requestTimeoutMs: 5_000
    });
    const controller = new AbortController();
    const operation = storage.exists('account-a', 'account-a/encounter-a/hash_private.pdf', {
      signal: controller.signal
    });
    controller.abort();

    await expect(operation).rejects.toThrow('S3 request cancelled');
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
