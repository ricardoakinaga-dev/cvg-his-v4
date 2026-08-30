import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ForbiddenError, ValidationError } from '@cvg-his-v2/shared-errors';

import { handleInternalEventsRoutes } from './internal-events-routes.js';

class MockResponse {
  statusCode = 0;
  body = '';

  setHeader(): this {
    return this;
  }

  end(body?: string): this {
    this.body = body ?? '';
    return this;
  }
}

const principal = {
  user: { id: 'event-admin-user', accountId: 'event-admin-account' },
  access: { roleCodes: ['ops'], permissionCodes: ['audit.read', 'audit.write'], capabilities: [] }
};

const audit = { write: () => undefined } as never;

function request(method: string, url: string): never {
  return { method, url } as never;
}

test('internal event administration forwards principal account to every service boundary', async () => {
  const calls: Array<{ method: string; args: readonly unknown[] }> = [];
  const event = {
    id: 'event-1',
    accountId: 'event-admin-account',
    correlationId: 'correlation-1',
    moduleName: 'billing',
    eventType: 'billing.created',
    payload: { secret: 'same-account-only' },
    status: 'failed',
    attempts: 1,
    maxAttempts: 1,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: 'failed',
    createdAt: new Date().toISOString()
  };
  const eventBus = {
    getDeadLetterEvents: (...args: readonly unknown[]) => {
      calls.push({ method: 'getDeadLetterEvents', args });
      return Promise.resolve([event]);
    },
    countEvents: (...args: readonly unknown[]) => {
      calls.push({ method: 'countEvents', args });
      return Promise.resolve({ pending: 0, retrying: 0, completed: 0, failed: 1, total: 1 });
    },
    getPendingEvents: (...args: readonly unknown[]) => {
      calls.push({ method: 'getPendingEvents', args });
      return Promise.resolve([]);
    },
    getEvent: (...args: readonly unknown[]) => {
      calls.push({ method: 'getEvent', args });
      return Promise.resolve(event);
    },
    getEventsByCorrelationId: (...args: readonly unknown[]) => {
      calls.push({ method: 'getEventsByCorrelationId', args });
      return Promise.resolve([event]);
    },
    reprocessEvent: (...args: readonly unknown[]) => {
      calls.push({ method: 'reprocessEvent', args });
      return Promise.resolve({ ...event, status: 'pending' });
    }
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {}
  };

  const dlqResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/dlq',
    request('GET', '/internal/events/dlq'),
    dlqResponse as never,
    'corr-dlq',
    handlers
  );
  const statsResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/stats',
    request('GET', '/internal/events/stats'),
    statsResponse as never,
    'corr-stats',
    handlers
  );
  const pendingResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/pending',
    request('GET', '/internal/events/pending'),
    pendingResponse as never,
    'corr-pending',
    handlers
  );
  const detailResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/event-1',
    request('GET', '/internal/events/event-1'),
    detailResponse as never,
    'corr-detail',
    handlers
  );
  const correlationResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/by-correlation/correlation-1',
    request('GET', '/internal/events/by-correlation/correlation-1?limit=25'),
    correlationResponse as never,
    'corr-correlation',
    handlers
  );
  const reprocessResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/event-1/reprocess',
    request('POST', '/internal/events/event-1/reprocess'),
    reprocessResponse as never,
    'corr-reprocess',
    handlers
  );

  assert.deepEqual(calls, [
    { method: 'getDeadLetterEvents', args: ['event-admin-account', 50] },
    { method: 'countEvents', args: ['event-admin-account'] },
    { method: 'getPendingEvents', args: ['event-admin-account', 50] },
    { method: 'getEvent', args: ['event-admin-account', 'event-1'] },
    {
      method: 'getEventsByCorrelationId',
      args: ['event-admin-account', 'correlation-1', 25]
    },
    { method: 'getEvent', args: ['event-admin-account', 'event-1'] },
    { method: 'reprocessEvent', args: ['event-admin-account', 'event-1'] }
  ]);
});

test('reprocess invokes audit.write ABAC before lookup and records a metadata-only audit event', async () => {
  const order: string[] = [];
  const evaluations: Array<{
    action: unknown;
    resource: unknown;
    principalAccountId: unknown;
  }> = [];
  const auditWrites: Array<Record<string, unknown>> = [];
  const event = {
    id: 'event-reprocess-abac-1',
    accountId: 'event-admin-account',
    correlationId: 'correlation-reprocess-abac-1',
    moduleName: 'billing',
    eventType: 'billing.created',
    payload: { secret: 'must-not-enter-audit' },
    status: 'failed',
    attempts: 2,
    maxAttempts: 2,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: 'delivery failed',
    createdAt: new Date().toISOString()
  };
  const eventBus = {
    getEvent: () => {
      order.push('getEvent');
      return Promise.resolve(event);
    },
    reprocessEvent: () => {
      order.push('reprocessEvent');
      return Promise.resolve({ ...event, status: 'pending', attempts: 0, error: null });
    }
  };
  const handlers = {
    eventBus: eventBus as never,
    requirePrincipal: async () => principal as never,
    enforceAbac: (...args: readonly unknown[]) => {
      const [action, evaluatedPrincipal, resource] = args as [
        string,
        { user: { accountId: string } },
        Record<string, unknown>
      ];
      order.push('abac');
      evaluations.push({
        action,
        resource,
        principalAccountId: evaluatedPrincipal.user.accountId
      });
    },
    audit: {
      write: (input: Record<string, unknown>) => {
        order.push('audit');
        auditWrites.push(input);
        return undefined;
      }
    } as never
  };

  const response = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/event-reprocess-abac-1/reprocess',
    request('POST', '/internal/events/event-reprocess-abac-1/reprocess'),
    response as never,
    'corr-reprocess-abac-1',
    handlers
  );

  assert.equal(response.statusCode, 202);
  assert.deepEqual(order, ['abac', 'getEvent', 'reprocessEvent', 'audit']);
  assert.deepEqual(evaluations, [
    {
      action: 'audit.write',
      resource: {
        resourceType: 'audit_entry',
        resourceId: 'event-reprocess-abac-1',
        accountId: 'event-admin-account'
      },
      principalAccountId: 'event-admin-account'
    }
  ]);
  assert.deepEqual(auditWrites, [
    {
      actorId: 'event-admin-user',
      accountId: 'event-admin-account',
      module: 'event-bus',
      action: 'reprocess_event',
      entityType: 'outbox-event',
      entityId: 'event-reprocess-abac-1',
      payloadSummary: 'status=failed;result=reprocessing',
      riskLevel: 'high',
      correlationId: 'corr-reprocess-abac-1'
    }
  ]);
  assert.equal(JSON.stringify(auditWrites).includes('must-not-enter-audit'), false);
});

test('reprocess fails closed on audit.write ABAC denial before EventBus or audit access', async () => {
  const calls: string[] = [];
  const handlers = {
    eventBus: {
      getEvent: () => {
        calls.push('getEvent');
        throw new Error('EventBus queried before ABAC denial');
      },
      reprocessEvent: () => {
        calls.push('reprocessEvent');
        throw new Error('EventBus mutated before ABAC denial');
      }
    } as never,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {
      calls.push('abac');
      throw new ForbiddenError('ABAC denied event reprocess');
    },
    audit: {
      write: () => {
        calls.push('audit');
        throw new Error('Audit written after ABAC denial');
      }
    } as never
  };

  await assert.rejects(
    handleInternalEventsRoutes(
      '/internal/events/event-reprocess-denied/reprocess',
      request('POST', '/internal/events/event-reprocess-denied/reprocess'),
      new MockResponse() as never,
      'corr-reprocess-denied',
      handlers
    ),
    (error: unknown) =>
      error instanceof ForbiddenError && error.message === 'ABAC denied event reprocess'
  );
  assert.deepEqual(calls, ['abac']);
});

test('internal read-only event routes enforce audit.read ABAC before each EventBus read', async () => {
  const evaluations: Array<{
    action: unknown;
    accountId: unknown;
    resourceType: unknown;
    resourceId: unknown;
  }> = [];
  const reads: string[] = [];
  const eventBus = {
    getDeadLetterEvents: () => {
      reads.push('dlq');
      return Promise.resolve([]);
    },
    countEvents: () => {
      reads.push('stats');
      return Promise.resolve({ pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 });
    },
    getPendingEvents: () => {
      reads.push('pending');
      return Promise.resolve([]);
    },
    getEvent: () => {
      reads.push('detail');
      return Promise.resolve(null);
    },
    getEventsByCorrelationId: () => {
      reads.push('correlation');
      return Promise.resolve([]);
    }
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: (...args: readonly unknown[]) => {
      const [action, evaluatedPrincipal, resource] = args as [
        unknown,
        { user: { accountId: unknown } },
        { resourceType: unknown; resourceId: unknown; accountId: unknown }
      ];
      assert.equal(reads.length, evaluations.length);
      evaluations.push({
        action,
        accountId: evaluatedPrincipal.user.accountId,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId
      });
    }
  };

  await handleInternalEventsRoutes(
    '/internal/events/dlq',
    request('GET', '/internal/events/dlq'),
    new MockResponse() as never,
    'corr-abac-dlq',
    handlers
  );
  await handleInternalEventsRoutes(
    '/internal/events/stats',
    request('GET', '/internal/events/stats'),
    new MockResponse() as never,
    'corr-abac-stats',
    handlers
  );
  await handleInternalEventsRoutes(
    '/internal/events/pending',
    request('GET', '/internal/events/pending'),
    new MockResponse() as never,
    'corr-abac-pending',
    handlers
  );
  await handleInternalEventsRoutes(
    '/internal/events/event-abac',
    request('GET', '/internal/events/event-abac'),
    new MockResponse() as never,
    'corr-abac-detail',
    handlers
  );
  await handleInternalEventsRoutes(
    '/internal/events/by-correlation/correlation-abac',
    request('GET', '/internal/events/by-correlation/correlation-abac'),
    new MockResponse() as never,
    'corr-abac-correlation',
    handlers
  );

  assert.deepEqual(evaluations, [
    {
      action: 'audit.read',
      accountId: 'event-admin-account',
      resourceType: 'audit_entry',
      resourceId: 'dlq'
    },
    {
      action: 'audit.read',
      accountId: 'event-admin-account',
      resourceType: 'audit_entry',
      resourceId: 'stats'
    },
    {
      action: 'audit.read',
      accountId: 'event-admin-account',
      resourceType: 'audit_entry',
      resourceId: 'pending'
    },
    {
      action: 'audit.read',
      accountId: 'event-admin-account',
      resourceType: 'audit_entry',
      resourceId: 'event-abac'
    },
    {
      action: 'audit.read',
      accountId: 'event-admin-account',
      resourceType: 'audit_entry',
      resourceId: 'correlation-abac'
    }
  ]);
});

test('internal read-only event routes fail closed when ABAC denies before querying EventBus', async () => {
  let queried = false;
  const eventBus = {
    getDeadLetterEvents: () => {
      queried = true;
      return Promise.resolve([]);
    }
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {
      throw new ForbiddenError('ABAC denied internal event inspection');
    }
  };

  await assert.rejects(
    handleInternalEventsRoutes(
      '/internal/events/dlq',
      request('GET', '/internal/events/dlq'),
      new MockResponse() as never,
      'corr-abac-denied',
      handlers
    ),
    (error: unknown) =>
      error instanceof ForbiddenError && error.message === 'ABAC denied internal event inspection'
  );
  assert.equal(queried, false);
});

test('internal read-only event routes all fail closed before their EventBus read when ABAC denies', async () => {
  const queried: string[] = [];
  const denyBeforeRead = (route: string): never => {
    queried.push(route);
    throw new Error(`EventBus queried before ABAC denial for ${route}`);
  };
  const eventBus = {
    getDeadLetterEvents: () => denyBeforeRead('dlq'),
    countEvents: () => denyBeforeRead('stats'),
    getPendingEvents: () => denyBeforeRead('pending'),
    getEvent: () => denyBeforeRead('detail'),
    getEventsByCorrelationId: () => denyBeforeRead('correlation')
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {
      throw new ForbiddenError('ABAC denied internal event inspection');
    }
  };
  const routes = [
    ['/internal/events/dlq', '/internal/events/dlq'],
    ['/internal/events/stats', '/internal/events/stats'],
    ['/internal/events/pending', '/internal/events/pending'],
    ['/internal/events/event-abac-all', '/internal/events/event-abac-all'],
    [
      '/internal/events/by-correlation/correlation-abac-all',
      '/internal/events/by-correlation/correlation-abac-all'
    ]
  ] as const;

  for (const [pathname, url] of routes) {
    await assert.rejects(
      handleInternalEventsRoutes(
        pathname,
        request('GET', url),
        new MockResponse() as never,
        `corr-${pathname}`,
        handlers
      ),
      (error: unknown) =>
        error instanceof ForbiddenError && error.message === 'ABAC denied internal event inspection'
    );
  }

  assert.deepEqual(queried, []);
});

test('internal event detail and correlation responses omit raw payloads', async () => {
  const event = {
    id: 'event-redaction-1',
    accountId: 'event-admin-account',
    correlationId: 'correlation-redaction-1',
    moduleName: 'clinical',
    eventType: 'clinical.note.created',
    payload: { secret: 'do-not-return', patientName: 'Sensitive Fixture' },
    status: 'completed',
    attempts: 1,
    maxAttempts: 1,
    scheduledAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    error: null,
    createdAt: new Date().toISOString()
  };
  const eventBus = {
    getEvent: () => Promise.resolve(event),
    getEventsByCorrelationId: () => Promise.resolve([event])
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {}
  };

  const detailResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/event-redaction-1',
    request('GET', '/internal/events/event-redaction-1'),
    detailResponse as never,
    'corr-redaction-detail',
    handlers
  );
  const detailBody = JSON.parse(detailResponse.body) as Record<string, unknown>;
  assert.equal(detailBody.id, event.id);
  assert.equal('payload' in detailBody, false);
  assert.equal(JSON.stringify(detailBody).includes('do-not-return'), false);

  const correlationResponse = new MockResponse();
  await handleInternalEventsRoutes(
    '/internal/events/by-correlation/correlation-redaction-1',
    request('GET', '/internal/events/by-correlation/correlation-redaction-1?limit=25'),
    correlationResponse as never,
    'corr-redaction-correlation',
    handlers
  );
  const correlationBody = JSON.parse(correlationResponse.body) as {
    items: Array<Record<string, unknown>>;
  };
  assert.equal(correlationBody.items[0]?.id, event.id);
  assert.equal('payload' in (correlationBody.items[0] ?? {}), false);
  assert.equal(JSON.stringify(correlationBody).includes('do-not-return'), false);
  assert.deepEqual(event.payload, { secret: 'do-not-return', patientName: 'Sensitive Fixture' });
});

test('OpenAPI uses a metadata-only schema for internal event detail and correlation responses', () => {
  const openapi = readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
  const detailStart = openapi.indexOf('  /internal/events/{eventId}:');
  const correlationStart = openapi.indexOf('  /internal/events/by-correlation/{correlationId}:');
  assert.notEqual(detailStart, -1);
  assert.notEqual(correlationStart, -1);
  const detailSection = openapi.slice(detailStart, correlationStart);
  const correlationSection = openapi.slice(
    correlationStart,
    openapi.indexOf('  /internal/events/{eventId}/reprocess:')
  );
  assert.match(detailSection, /OutboxEventAdminView/);
  assert.match(correlationSection, /OutboxEventAdminViewListResponse/);
  assert.match(correlationSection, /'400':/);
  assert.doesNotMatch(detailSection, /ref: '#\/components\/schemas\/OutboxEvent'/);
  assert.doesNotMatch(correlationSection, /ref: '#\/components\/schemas\/OutboxEventListResponse'/);
});

test('internal event administration rejects invalid list limits before querying', async () => {
  let queried = false;
  const eventBus = {
    getDeadLetterEvents: () => {
      queried = true;
      return Promise.resolve([]);
    },
    getPendingEvents: () => {
      queried = true;
      return Promise.resolve([]);
    },
    getEventsByCorrelationId: () => {
      queried = true;
      return Promise.resolve([]);
    }
  };
  const handlers = {
    eventBus: eventBus as never,
    audit,
    requirePrincipal: async () => principal as never,
    enforceAbac: () => {}
  };

  await assert.rejects(
    handleInternalEventsRoutes(
      '/internal/events/dlq',
      request('GET', '/internal/events/dlq?limit=-1'),
      new MockResponse() as never,
      'corr-invalid-dlq-limit',
      handlers
    ),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'limit must be an integer between 1 and 200'
  );
  await assert.rejects(
    handleInternalEventsRoutes(
      '/internal/events/pending',
      request('GET', '/internal/events/pending?limit=not-a-number'),
      new MockResponse() as never,
      'corr-invalid-pending-limit',
      handlers
    ),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'limit must be an integer between 1 and 200'
  );
  await assert.rejects(
    handleInternalEventsRoutes(
      '/internal/events/by-correlation/correlation-1',
      request('GET', '/internal/events/by-correlation/correlation-1?limit=201'),
      new MockResponse() as never,
      'corr-invalid-correlation-limit',
      handlers
    ),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'limit must be an integer between 1 and 200'
  );
  assert.equal(queried, false);
});
