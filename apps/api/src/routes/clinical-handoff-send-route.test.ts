import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleClinicalHandoffSendRoute } from './clinical-handoff-send-route.js';

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
  user: { id: 'user-handoff-send', accountId: 'account-handoff-send' }
} as never;

test('clinical handoff send retains auth, persistence, audit, and response order', async () => {
  const calls: string[] = [];
  const payload = {
    encounterId: 'encounter-handoff-send',
    clinicalSummary: 'Clinical summary',
    receptionInstructions: 'Reception instructions'
  };
  const handoff = {
    id: 'handoff-1',
    encounterId: 'encounter-handoff-send'
  };
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/send-to-reception',
    JSON.stringify(payload)
  );
  const response = new MockResponse();

  const handled = await handleClinicalHandoffSendRoute(
    '/clinical-handoffs/send-to-reception',
    request as never,
    response as never,
    'corr-handoff-send',
    {
      clinicalHandoffs: {
        sendToReception: (accountId, actorId, receivedPayload) => {
          calls.push(`send:${accountId}:${actorId}`);
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
          'user-handoff-send',
          'account-handoff-send',
          'clinical-handoffs',
          'send_to_reception',
          'clinical-handoff',
          'handoff-1',
          'Clinical handoff sent to reception for encounter encounter-handoff-send',
          'high',
          'corr-handoff-send'
        ]);
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'send:account-handoff-send:user-handoff-send',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
  assert.deepEqual(response.bodyJson(), handoff);
});

test('clinical handoff send does not audit or respond when persistence fails', async () => {
  const failure = new Error('handoff persistence failed');
  let auditCalled = false;
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/send-to-reception',
    JSON.stringify({ encounterId: 'encounter-handoff-send' })
  );
  const response = new MockResponse();

  await assert.rejects(
    handleClinicalHandoffSendRoute(
      '/clinical-handoffs/send-to-reception',
      request as never,
      response as never,
      'corr-handoff-send-failure',
      {
        clinicalHandoffs: {
          sendToReception: () =>
            ({ id: 'handoff-1', encounterId: 'encounter-handoff-send' }) as never,
          waitForPersistence: async () => {
            throw failure;
          }
        },
        encounters: { waitForPersistence: async () => undefined },
        requirePrincipal: async () => principal,
        appendAudit: () => {
          auditCalled = true;
        }
      }
    ),
    (error) => error === failure
  );

  assert.equal(auditCalled, false);
  assert.equal(response.statusCode, 200);
});

test('clinical handoff send route leaves unmatched requests unhandled', async () => {
  const request = new MockRequest('GET', '/clinical-handoffs/send-to-reception');
  const handled = await handleClinicalHandoffSendRoute(
    '/clinical-handoffs/send-to-reception',
    request as never,
    new MockResponse() as never,
    'corr-handoff-send-unmatched',
    {
      clinicalHandoffs: {
        sendToReception: () => {
          throw new Error('unexpected handoff creation');
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
});
