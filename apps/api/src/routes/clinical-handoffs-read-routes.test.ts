import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { ClinicalHandoffListFilters } from '@cvg-his-v2/module-encounters';

import {
  handleClinicalHandoffDetailReadRoute,
  handleClinicalHandoffsReadRoute
} from './clinical-handoffs-read-routes.js';

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
  user: { id: 'user-handoff-read', accountId: 'account-handoff-read' }
} as never;

test('clinical handoff list forwards validated filters and preserves audit order and response shape', async () => {
  const calls: string[] = [];
  let receivedFilters: ClinicalHandoffListFilters | undefined;
  let receivedAudit: unknown[] | undefined;
  const handoff = { id: 'handoff-1' };
  const request = new MockRequest(
    'GET',
    '/clinical-handoffs?handoffStatus=sent_to_reception&status=returned_to_clinic&priority=high&encounterId=encounter-1&ownerId=owner-1&patientId=patient-1'
  );
  const response = new MockResponse();

  const handled = await handleClinicalHandoffsReadRoute(
    '/clinical-handoffs',
    new URL(request.url, 'http://localhost'),
    request as never,
    response as never,
    'corr-handoff-list',
    {
      clinicalHandoffs: {
        list: (accountId: string, filters: ClinicalHandoffListFilters) => {
          calls.push(`list:${accountId}`);
          receivedFilters = filters;
          return [handoff] as never;
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
  assert.deepEqual(calls, ['principal:encounters.read', 'audit', 'list:account-handoff-read']);
  assert.deepEqual(receivedFilters, {
    handoffStatus: 'sent_to_reception',
    encounterId: 'encounter-1',
    ownerId: 'owner-1',
    patientId: 'patient-1',
    priority: 'high'
  });
  assert.deepEqual(receivedAudit, [
    'user-handoff-read',
    'account-handoff-read',
    'clinical-handoffs',
    'list',
    'clinical-handoff',
    'all',
    'Clinical handoffs listed',
    'medium',
    'corr-handoff-list'
  ]);
  assert.deepEqual(response.bodyJson<{ items: unknown[] }>().items, [handoff]);
});

test('clinical handoff list preserves empty primary status precedence over the status alias', async () => {
  let receivedFilters: ClinicalHandoffListFilters | undefined;
  const request = new MockRequest(
    'GET',
    '/clinical-handoffs?handoffStatus=&status=sent_to_finance&priority='
  );

  const handled = await handleClinicalHandoffsReadRoute(
    '/clinical-handoffs',
    new URL(request.url, 'http://localhost'),
    request as never,
    new MockResponse() as never,
    'corr-handoff-empty-status',
    {
      clinicalHandoffs: {
        list: (_accountId: string, filters: ClinicalHandoffListFilters) => {
          receivedFilters = filters;
          return [];
        }
      } as never,
      requirePrincipal: async () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(receivedFilters, {
    handoffStatus: undefined,
    encounterId: undefined,
    ownerId: undefined,
    patientId: undefined,
    priority: undefined
  });
});

test('clinical handoff list uses status alias when the primary status filter is absent', async () => {
  let receivedFilters: ClinicalHandoffListFilters | undefined;
  const request = new MockRequest('GET', '/clinical-handoffs?status=returned_to_clinic');

  const handled = await handleClinicalHandoffsReadRoute(
    '/clinical-handoffs',
    new URL(request.url, 'http://localhost'),
    request as never,
    new MockResponse() as never,
    'corr-handoff-status-alias',
    {
      clinicalHandoffs: {
        list: (_accountId: string, filters: ClinicalHandoffListFilters) => {
          receivedFilters = filters;
          return [];
        }
      } as never,
      requirePrincipal: async () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(receivedFilters?.handoffStatus, 'returned_to_clinic');
});

test('clinical handoff list rejects invalid status and priority before audit or listing', async () => {
  const invalidCases = [
    {
      query: 'handoffStatus=invalid',
      message: 'Invalid clinical handoff status filter',
      details: { status: 'invalid' }
    },
    {
      query: 'priority=urgent',
      message: 'Invalid clinical handoff priority filter',
      details: { priority: 'urgent' }
    },
    {
      query: 'handoffStatus=invalid&priority=urgent',
      message: 'Invalid clinical handoff status filter',
      details: { status: 'invalid' }
    }
  ];

  for (const invalidCase of invalidCases) {
    const calls: string[] = [];
    const request = new MockRequest('GET', `/clinical-handoffs?${invalidCase.query}`);

    await assert.rejects(
      handleClinicalHandoffsReadRoute(
        '/clinical-handoffs',
        new URL(request.url, 'http://localhost'),
        request as never,
        new MockResponse() as never,
        'corr-handoff-invalid',
        {
          clinicalHandoffs: {
            list: () => {
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
        assert.equal(error.message, invalidCase.message);
        assert.equal(error.statusCode, 400);
        assert.deepEqual(error.details, invalidCase.details);
        return true;
      }
    );

    assert.deepEqual(calls, ['principal']);
  }
});

test('clinical handoff list leaves non-collection paths and methods unhandled', async () => {
  const requestCases = [
    new MockRequest('GET', '/clinical-handoffs/next'),
    new MockRequest('POST', '/clinical-handoffs')
  ];
  const handlers = {
    clinicalHandoffs: {} as never,
    requirePrincipal: async () => {
      throw new Error('unexpected authentication');
    },
    appendAudit: () => {
      throw new Error('unexpected audit');
    }
  };

  for (const request of requestCases) {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const handled = await handleClinicalHandoffsReadRoute(
      pathname,
      new URL(request.url, 'http://localhost'),
      request as never,
      new MockResponse() as never,
      'corr-handoff-unmatched',
      handlers
    );
    assert.equal(handled, false);
  }
});

test('clinical handoff detail preserves the broad nested matcher and auth, lookup, audit order', async () => {
  const calls: string[] = [];
  let receivedAudit: unknown[] | undefined;
  const handoff = { id: 'handoff-actual' };
  const request = new MockRequest(
    'GET',
    '/clinical-handoffs/handoff-requested/pending/issues?include=history'
  );
  const response = new MockResponse();

  const handled = await handleClinicalHandoffDetailReadRoute(
    '/clinical-handoffs/handoff-requested/pending/issues',
    request as never,
    response as never,
    'corr-handoff-detail',
    {
      clinicalHandoffs: {
        getOrThrow: (accountId: string, handoffId: string) => {
          calls.push(`get:${accountId}:${handoffId}`);
          return handoff as never;
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
  assert.deepEqual(calls, [
    'principal:encounters.read',
    'get:account-handoff-read:handoff-requested',
    'audit'
  ]);
  assert.deepEqual(receivedAudit, [
    'user-handoff-read',
    'account-handoff-read',
    'clinical-handoffs',
    'read',
    'clinical-handoff',
    'handoff-actual',
    'Clinical handoff handoff-actual inspected',
    'medium',
    'corr-handoff-detail'
  ]);
  assert.deepEqual(response.bodyJson(), handoff);
});

test('clinical handoff detail authenticates before rejecting an empty legacy ID segment', async () => {
  const calls: string[] = [];
  const request = new MockRequest('GET', '/clinical-handoffs/');

  await assert.rejects(
    handleClinicalHandoffDetailReadRoute(
      '/clinical-handoffs/',
      request as never,
      new MockResponse() as never,
      'corr-handoff-empty-id',
      {
        clinicalHandoffs: {
          getOrThrow: () => {
            calls.push('get');
            return {} as never;
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
      assert.equal(error.message, 'Field handoffId must be a non-empty string');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.deepEqual(calls, ['principal']);
});

test('clinical handoff detail leaves collection and non-GET paths unhandled', async () => {
  const requestCases = [
    new MockRequest('GET', '/clinical-handoffs'),
    new MockRequest('POST', '/clinical-handoffs/handoff-1')
  ];
  const handlers = {
    clinicalHandoffs: {} as never,
    requirePrincipal: async () => {
      throw new Error('unexpected authentication');
    },
    appendAudit: () => {
      throw new Error('unexpected audit');
    }
  };

  for (const request of requestCases) {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const handled = await handleClinicalHandoffDetailReadRoute(
      pathname,
      request as never,
      new MockResponse() as never,
      'corr-handoff-detail-unmatched',
      handlers
    );
    assert.equal(handled, false);
  }
});
