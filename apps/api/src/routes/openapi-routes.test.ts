import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { handleOpenApiRoutes } from './openapi-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly #headers = new Map<string, string>();

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.#headers.get(name.toLowerCase());
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    finalCallback?.();
    return this;
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
  }
}

test('handleOpenApiRoutes serves /openapi.json as JSON', () => {
  const response = new MockResponse();

  const handled = handleOpenApiRoutes(
    { method: 'GET', url: '/openapi.json' } as never,
    response as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.getHeader('content-type'), 'application/json');
  const payload = response.bodyJson<{ openapi: string; paths: Record<string, unknown> }>();
  assert.equal(payload.openapi, '3.0.3');
  assert.ok(Object.keys(payload.paths).length > 0);
});

test('handleOpenApiRoutes serves /api-docs contract', () => {
  const response = new MockResponse();

  const handled = handleOpenApiRoutes(
    { method: 'GET', url: '/api-docs' } as never,
    response as never
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ endpoints: { openapi: { url: string } } }>();
  assert.equal(payload.endpoints.openapi.url, '/openapi.json');
});
