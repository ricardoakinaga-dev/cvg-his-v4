import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import { handleClinicalHandoffAcknowledgeRoute } from './clinical-handoff-acknowledge-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string> = {};
  readonly #body: Buffer;
  #sent = false;

  constructor(method: string, url: string, body = '') {
    super();
    this.method = method;
    this.url = url;
    this.#body = Buffer.from(body, 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) this.push(this.#body);
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
  user: { id: 'user-handoff-ack', accountId: 'account-handoff-ack' }
} as never;

test('clinical handoff acknowledgement preserves route, auth, persistence, audit, and response order', async () => {
  const calls: string[] = [];
  const payload = { note: 'Received safely' };
  const handoff = { id: 'handoff-ack', encounterId: 'encounter-ack' };
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-ack/acknowledge',
    JSON.stringify(payload)
  );
  const response = new MockResponse();

  const handled = await handleClinicalHandoffAcknowledgeRoute(
    '/clinical-handoffs/handoff-ack/acknowledge',
    request as never,
    response as never,
    'corr-handoff-ack',
    {
      clinicalHandoffs: {
        acknowledge: (accountId, actorId, handoffId, receivedPayload) => {
          calls.push(`acknowledge:${accountId}:${actorId}:${handoffId}`);
          assert.deepEqual(receivedPayload, payload);
          return handoff as never;
        },
        waitForPersistence: async () => {
          calls.push('handoffs-persisted');
        }
      },
      encounters: {
        waitForPersistence: async () => {
          calls.push('encounters-persisted');
        }
      },
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (...audit) => {
        calls.push('audit');
        assert.deepEqual(audit, [
          'user-handoff-ack',
          'account-handoff-ack',
          'clinical-handoffs',
          'acknowledge',
          'clinical-handoff',
          'handoff-ack',
          'Clinical handoff acknowledged for encounter encounter-ack',
          'high',
          'corr-handoff-ack'
        ]);
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'acknowledge:account-handoff-ack:user-handoff-ack:handoff-ack',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
  assert.deepEqual(response.bodyJson(), handoff);
});

test('clinical handoff acknowledgement preserves nested suffix matching and malformed-body fallback', async () => {
  let receivedId: string | undefined;
  let receivedPayload: unknown;
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-nested/extra/acknowledge',
    '{'
  );
  const response = new MockResponse();

  const handled = await handleClinicalHandoffAcknowledgeRoute(
    '/clinical-handoffs/handoff-nested/extra/acknowledge',
    request as never,
    response as never,
    'corr-handoff-ack-nested',
    {
      clinicalHandoffs: {
        acknowledge: (_accountId, _actorId, handoffId, payload) => {
          receivedId = handoffId;
          receivedPayload = payload;
          return { id: 'handoff-nested', encounterId: 'encounter-nested' } as never;
        },
        waitForPersistence: async () => undefined
      },
      encounters: { waitForPersistence: async () => undefined },
      requirePrincipal: async () => principal,
      appendAudit: () => undefined
    }
  );

  assert.equal(handled, true);
  assert.equal(receivedId, 'handoff-nested');
  assert.deepEqual(receivedPayload, {});
  assert.equal(response.statusCode, 200);
});

test('clinical handoff acknowledgement authenticates before rejecting an empty legacy ID segment', async () => {
  const calls: string[] = [];
  const request = new MockRequest('POST', '/clinical-handoffs//acknowledge', '{}');

  await assert.rejects(
    handleClinicalHandoffAcknowledgeRoute(
      '/clinical-handoffs//acknowledge',
      request as never,
      new MockResponse() as never,
      'corr-handoff-ack-empty',
      {
        clinicalHandoffs: {
          acknowledge: () => {
            throw new Error('unexpected acknowledgement');
          },
          waitForPersistence: async () => undefined
        },
        encounters: { waitForPersistence: async () => undefined },
        requirePrincipal: async (_request, permissionCode) => {
          calls.push(`principal:${permissionCode}`);
          return principal;
        },
        appendAudit: () => {
          throw new Error('unexpected audit');
        }
      }
    ),
    (error) =>
      error instanceof ValidationError &&
      error.message === 'Field handoffId must be a non-empty string'
  );

  assert.deepEqual(calls, ['principal:encounters.manage']);
});

test('clinical handoff acknowledgement leaves unmatched requests unhandled', async () => {
  const unmatchedRequests = [
    new MockRequest('GET', '/clinical-handoffs/handoff-ack/acknowledge'),
    new MockRequest('POST', '/clinical-handoffs/handoff-ack/acknowledge/')
  ];

  for (const request of unmatchedRequests) {
    const handled = await handleClinicalHandoffAcknowledgeRoute(
      request.url,
      request as never,
      new MockResponse() as never,
      'corr-handoff-ack-unmatched',
      {
        clinicalHandoffs: {
          acknowledge: () => {
            throw new Error('unexpected acknowledgement');
          },
          waitForPersistence: async () => undefined
        },
        encounters: { waitForPersistence: async () => undefined },
        requirePrincipal: async () => {
          throw new Error('unexpected authentication');
        },
        appendAudit: () => {
          throw new Error('unexpected audit');
        }
      }
    );

    assert.equal(handled, false);
  }
});
