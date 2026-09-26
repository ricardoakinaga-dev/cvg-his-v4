import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import {
  handleClinicalHandoffWorkflowRoutes,
  type ClinicalHandoffWorkflowRouteHandlers
} from './clinical-handoff-workflow-routes.js';

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

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }
}

const principal = {
  user: { id: 'user-handoff-workflow', accountId: 'account-handoff-workflow' }
} as never;
const handoff = { id: 'handoff-workflow', encounterId: 'encounter-workflow' } as never;

type HandlerOverrides = {
  readonly clinicalHandoffs?: Partial<ClinicalHandoffWorkflowRouteHandlers['clinicalHandoffs']>;
  readonly encounters?: Partial<ClinicalHandoffWorkflowRouteHandlers['encounters']>;
  readonly requirePrincipal?: ClinicalHandoffWorkflowRouteHandlers['requirePrincipal'];
  readonly appendAudit?: ClinicalHandoffWorkflowRouteHandlers['appendAudit'];
};

function createHandlers(
  calls: string[],
  overrides: HandlerOverrides = {}
): ClinicalHandoffWorkflowRouteHandlers {
  const defaults: ClinicalHandoffWorkflowRouteHandlers = {
    clinicalHandoffs: {
      markPending: () => {
        calls.push('mark-pending');
        return handoff;
      },
      resolvePending: () => {
        calls.push('resolve-pending');
        return handoff;
      },
      returnToClinic: () => {
        calls.push('return-to-clinic');
        return handoff;
      },
      sendToFinance: () => {
        calls.push('send-to-finance');
        return handoff;
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
      assert.equal(audit[2], 'clinical-handoffs');
      assert.equal(audit[4], 'clinical-handoff');
      assert.equal(audit[7], 'high');
    }
  };

  return {
    ...defaults,
    ...overrides,
    clinicalHandoffs: { ...defaults.clinicalHandoffs, ...overrides.clinicalHandoffs },
    encounters: { ...defaults.encounters, ...overrides.encounters }
  };
}

test('mark pending preserves legacy matcher, auth, persistence, audit, and response order', async () => {
  const calls: string[] = [];
  const payload = { type: 'missing_document', ownerId: 'staff-1', reason: 'Add discharge notes' };
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-pending/extra/pending',
    JSON.stringify(payload)
  );
  const response = new MockResponse();
  const handlers = createHandlers(calls, {
    clinicalHandoffs: {
      markPending: (accountId, actorId, handoffId, receivedPayload) => {
        calls.push(`mark:${accountId}:${actorId}:${handoffId}`);
        assert.deepEqual(receivedPayload, payload);
        return handoff;
      }
    },
    appendAudit: (...audit) => {
      calls.push('audit');
      assert.deepEqual(audit, [
        'user-handoff-workflow',
        'account-handoff-workflow',
        'clinical-handoffs',
        'mark_pending',
        'clinical-handoff',
        'handoff-workflow',
        'Clinical handoff pending issue marked for encounter encounter-workflow',
        'high',
        'corr-workflow-pending'
      ]);
    }
  });

  const handled = await handleClinicalHandoffWorkflowRoutes(
    request.url,
    request as never,
    response as never,
    'corr-workflow-pending',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), handoff);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'mark:account-handoff-workflow:user-handoff-workflow:handoff-pending',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
});

test('resolve pending preserves path segment selection, request parsing, and audit ordering', async () => {
  const calls: string[] = [];
  const payload = { resolution: 'Document added' };
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-resolve/pending/issue-resolve/extra/resolve',
    JSON.stringify(payload)
  );
  const response = new MockResponse();
  const handlers = createHandlers(calls, {
    clinicalHandoffs: {
      resolvePending: (accountId, actorId, handoffId, issueId, receivedPayload) => {
        calls.push(`resolve:${accountId}:${actorId}:${handoffId}:${issueId}`);
        assert.deepEqual(receivedPayload, payload);
        return handoff;
      }
    },
    appendAudit: (...audit) => {
      calls.push('audit');
      assert.deepEqual(audit.slice(2), [
        'clinical-handoffs',
        'resolve_pending',
        'clinical-handoff',
        'handoff-workflow',
        'Clinical handoff pending issue resolved for encounter encounter-workflow',
        'high',
        'corr-workflow-resolve'
      ]);
    }
  });

  const handled = await handleClinicalHandoffWorkflowRoutes(
    request.url,
    request as never,
    response as never,
    'corr-workflow-resolve',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'resolve:account-handoff-workflow:user-handoff-workflow:handoff-resolve:issue-resolve',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
});

test('return to clinic authenticates before rejecting an empty legacy ID segment', async () => {
  const calls: string[] = [];
  const request = new MockRequest('POST', '/clinical-handoffs//return-to-clinic', '{}');

  await assert.rejects(
    handleClinicalHandoffWorkflowRoutes(
      request.url,
      request as never,
      new MockResponse() as never,
      'corr-workflow-empty-id',
      createHandlers(calls)
    ),
    (error) =>
      error instanceof ValidationError &&
      error.message === 'Field handoffId must be a non-empty string'
  );

  assert.deepEqual(calls, ['principal:encounters.manage']);
});

test('return to clinic persists before audit and returns a 200 response', async () => {
  const calls: string[] = [];
  const payload = { reason: 'Needs additional clinical review' };
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-return/return-to-clinic',
    JSON.stringify(payload)
  );
  const response = new MockResponse();
  const handlers = createHandlers(calls, {
    clinicalHandoffs: {
      returnToClinic: (_accountId, _actorId, handoffId, receivedPayload) => {
        calls.push(`return:${handoffId}`);
        assert.deepEqual(receivedPayload, payload);
        return handoff;
      }
    },
    appendAudit: (...audit) => {
      calls.push('audit');
      assert.equal(audit[3], 'return_to_clinic');
      assert.equal(
        audit[6],
        'Clinical handoff returned to clinic for encounter encounter-workflow'
      );
    }
  });

  const handled = await handleClinicalHandoffWorkflowRoutes(
    request.url,
    request as never,
    response as never,
    'corr-workflow-return',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), handoff);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'return:handoff-return',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
});

test('send to finance keeps malformed-body fallback, persistence, audit, and response', async () => {
  const calls: string[] = [];
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-finance/send-to-finance',
    '{'
  );
  const response = new MockResponse();
  const handlers = createHandlers(calls, {
    clinicalHandoffs: {
      sendToFinance: (_accountId, _actorId, handoffId, payload) => {
        calls.push(`finance:${handoffId}`);
        assert.deepEqual(payload, {});
        return handoff;
      }
    },
    appendAudit: (...audit) => {
      calls.push('audit');
      assert.equal(audit[3], 'send_to_finance');
      assert.equal(audit[6], 'Clinical handoff sent to finance for encounter encounter-workflow');
    }
  });

  const handled = await handleClinicalHandoffWorkflowRoutes(
    request.url,
    request as never,
    response as never,
    'corr-workflow-finance',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), handoff);
  assert.deepEqual(calls, [
    'principal:encounters.manage',
    'finance:handoff-finance',
    'handoffs-persisted',
    'encounters-persisted',
    'audit'
  ]);
});

test('persistence failure prevents audit and success response', async () => {
  const calls: string[] = [];
  const request = new MockRequest(
    'POST',
    '/clinical-handoffs/handoff-pending/pending',
    '{"type":"missing_document","ownerId":"staff-1","reason":"Upload it"}'
  );
  const response = new MockResponse();
  const handlers = createHandlers(calls, {
    clinicalHandoffs: {
      waitForPersistence: async () => {
        calls.push('handoffs-persisted');
        throw new Error('persistence unavailable');
      }
    }
  });

  await assert.rejects(
    handleClinicalHandoffWorkflowRoutes(
      request.url,
      request as never,
      response as never,
      'corr-workflow-persistence-failure',
      handlers
    ),
    /persistence unavailable/
  );

  assert.equal(calls.includes('audit'), false);
  assert.equal(response.bodyText(), '');
});

test('workflow routes leave unmatched methods unhandled without authenticating', async () => {
  const calls: string[] = [];
  const handlers = createHandlers(calls);

  const handled = await handleClinicalHandoffWorkflowRoutes(
    '/clinical-handoffs/handoff-workflow/pending',
    new MockRequest('GET', '/clinical-handoffs/handoff-workflow/pending') as never,
    new MockResponse() as never,
    'corr-workflow-unmatched',
    handlers
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});
