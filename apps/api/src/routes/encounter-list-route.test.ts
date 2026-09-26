import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { EncounterSummary } from '@cvg-his-v2/shared-types';

import { handleEncounterListRoute } from './encounter-list-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
  }

  _read(): void {
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

const principal = {
  user: { id: 'user-encounter-list', accountId: 'account-encounter-list' }
};

test('encounter collection applies pagination and preserves auth, audit, and response order', async () => {
  const calls: string[] = [];
  let receivedAccountId: string | undefined;
  let receivedAudit: unknown[] | undefined;
  const encounters = [{ id: 'encounter-1' }, { id: 'encounter-2' }] as EncounterSummary[];
  const request = new MockRequest('GET', '/encounters?page=2&pageSize=1');
  const response = new MockResponse();

  const handled = await handleEncounterListRoute(
    '/encounters',
    new URL(request.url, 'http://localhost'),
    request as never,
    response as never,
    'corr-encounter-list',
    {
      encounters: {
        listAll: (accountId: string) => {
          calls.push('list');
          receivedAccountId = accountId;
          return encounters;
        }
      } as never,
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (...audit) => {
        calls.push('audit');
        receivedAudit = audit;
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, ['principal:encounters.read', 'list', 'audit']);
  assert.equal(receivedAccountId, 'account-encounter-list');
  assert.deepEqual(receivedAudit, [
    'user-encounter-list',
    'account-encounter-list',
    'encounters',
    'list',
    'encounter',
    'all',
    'Encounters listed',
    'medium',
    'corr-encounter-list'
  ]);
  assert.deepEqual(response.bodyJson<{ items: EncounterSummary[] }>().items, [encounters[1]]);
});

test('encounter collection lists before validating pagination and audits only valid requests', async () => {
  const calls: string[] = [];
  const request = new MockRequest('GET', '/encounters?page=0');

  await assert.rejects(
    handleEncounterListRoute(
      '/encounters',
      new URL(request.url, 'http://localhost'),
      request as never,
      new MockResponse() as never,
      'corr-encounter-list-invalid-page',
      {
        encounters: {
          listAll: () => {
            calls.push('list');
            return [];
          }
        } as never,
        requirePrincipal: async () => {
          calls.push('principal');
          return principal;
        },
        appendAudit: () => calls.push('audit')
      }
    ),
    (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.message, 'page must be a positive safe integer');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.deepEqual(calls, ['principal', 'list']);
});

test('encounter collection leaves other paths and methods unhandled', async () => {
  const requestCases = [
    new MockRequest('GET', '/encounters/encounter-1'),
    new MockRequest('POST', '/encounters')
  ];
  const handlers = {
    encounters: {} as never,
    requirePrincipal: async () => {
      throw new Error('unexpected authentication');
    },
    appendAudit: () => {
      throw new Error('unexpected audit');
    }
  };

  for (const request of requestCases) {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const handled = await handleEncounterListRoute(
      pathname,
      new URL(request.url, 'http://localhost'),
      request as never,
      new MockResponse() as never,
      'corr-encounter-list-unmatched',
      handlers
    );
    assert.equal(handled, false);
  }
});
