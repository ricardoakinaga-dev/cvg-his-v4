import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { ChaosEngine } from '@cvg-his-v2/chaos';

import { setAppState } from './app-state.js';
import { createApiServer } from './server.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly socket: { remoteAddress: string; encrypted: boolean };
  readonly #body: Buffer;
  #sent = false;

  constructor(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = input.headers ?? {};
    this.socket = {
      remoteAddress: '127.0.0.1',
      encrypted: this.headers['x-forwarded-proto'] === 'https'
    };
    this.#body = Buffer.from(input.body ?? '', 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) {
      this.push(this.#body);
    }
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  public readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];
  readonly #finished: Promise<void>;
  #resolveFinished!: () => void;

  constructor() {
    super();
    this.#finished = new Promise<void>((resolve) => {
      this.#resolveFinished = resolve;
    });
  }

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  writeHead(statusCode: number, headers?: Record<string, string>): this {
    this.statusCode = statusCode;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        this.setHeader(key, value);
      }
    }
    return this;
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
    this.#resolveFinished();
    finalCallback?.();
    return this;
  }

  async waitForEnd(): Promise<void> {
    await this.#finished;
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
  }
}

function createServerUnderTest(overrides: Partial<Parameters<typeof createApiServer>[0]> = {}) {
  return createApiServer({
    appName: 'api-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    featureFlags: {
      providerName: 'test',
      enabledKeys: ['notifications.whatsapp.inbound_actions.enabled'],
      decisions: {
        'notifications.whatsapp.inbound_actions.enabled': {
          key: 'notifications.whatsapp.inbound_actions.enabled',
          enabled: true,
          provider: 'test',
          reason: 'test-default',
          evaluatedAt: new Date('2026-04-15T00:00:00.000Z').toISOString(),
          definition: {} as never,
          context: { environment: 'test' } as never
        }
      },
      authOidcEnabled: false,
      authWebauthnEnabled: false,
      runtimeDistributedStateEnabled: false,
      fiscalBackofficeEnabled: false,
      notificationsWhatsappRemindersEnabled: false,
      notificationsWhatsappInboundActionsEnabled: true,
      provider: {
        name: 'test',
        evaluate: async () => ({
          key: 'notifications.whatsapp.inbound_actions.enabled',
          enabled: true,
          provider: 'test',
          reason: 'test-default',
          evaluatedAt: new Date('2026-04-15T00:00:00.000Z').toISOString(),
          definition: {} as never,
          context: { environment: 'test' } as never
        })
      }
    } as never,
    ...overrides
  });
}

async function performRequest(
  server: ReturnType<typeof createApiServer>,
  input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }
) {
  const request = new MockRequest({
    method: input.method,
    url: input.url,
    headers: input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined
  });
  const response = new MockResponse();

  server.emit('request', request as never, response as never);
  request.resume();
  await response.waitForEnd();

  return response;
}

async function login(
  server: ReturnType<typeof createApiServer>,
  username: string,
  password: string
) {
  const response = await performRequest(server, {
    method: 'POST',
    url: '/auth/login',
    headers: {
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { username, password }
  });

  assert.equal(response.statusCode, 200);
  return response.bodyJson<{ accessToken: string }>().accessToken;
}

test('CORS preflight reflects an allowed origin', async () => {
  const server = createServerUnderTest({
    corsAllowedOrigins: ['https://app.example.com']
  });

  const response = await performRequest(server, {
    method: 'OPTIONS',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      'access-control-request-method': 'GET',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.getHeader('access-control-allow-origin'), 'https://app.example.com');
  assert.match(response.getHeader('access-control-allow-methods') ?? '', /OPTIONS/);
});

test('server falls back to LocalPix when PagarMe credentials are absent', async () => {
  assert.doesNotThrow(() =>
    createServerUnderTest({
      pixMockMode: false,
      pagarmeApiKey: undefined,
      pagarmePixKey: undefined
    })
  );
});

test('CORS rejects an origin outside the allowlist', async () => {
  const server = createServerUnderTest({
    corsAllowedOrigins: ['https://app.example.com']
  });

  const response = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://evil.example.com',
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.bodyJson<{ code: string }>().code, 'CORS_ORIGIN_DENIED');
});

test('HSTS is emitted only for secure production-like requests', async () => {
  const server = createServerUnderTest({
    environment: 'production',
    corsAllowedOrigins: ['https://app.example.com']
  });

  const secureResponse = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      'x-forwarded-proto': 'https',
      host: 'localhost'
    }
  });
  assert.equal(
    secureResponse.getHeader('strict-transport-security'),
    'max-age=31536000; includeSubDomains; preload'
  );

  const insecureResponse = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      origin: 'https://app.example.com',
      host: 'localhost'
    }
  });

  assert.equal(insecureResponse.getHeader('strict-transport-security'), undefined);
});

test('observability contract exposes request and trace correlation headers', async () => {
  const server = createServerUnderTest();
  const response = await performRequest(server, {
    method: 'GET',
    url: '/health',
    headers: {
      'x-correlation-id': 'corr-obs-123',
      host: 'localhost'
    }
  });

  const traceparent = response.getHeader('traceparent');
  assert.ok(traceparent);
  assert.equal(response.getHeader('x-correlation-id'), 'corr-obs-123');
  assert.equal(response.getHeader('x-request-id'), 'corr-obs-123');
  assert.equal(response.getHeader('x-trace-id'), traceparent?.split('-')[1]);
});

test('chaos operations expose effective runtime state, runbooks and metrics', async () => {
  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: 'Database connected',
    repositoriesReady: true,
    repositoryCount: 13,
    workerReady: true,
    workerDetail: 'Worker connected',
    productionReady: true,
    initialized: true,
    mlReady: true,
    mlDetail: 'ML ready'
  });

  const server = createServerUnderTest({
    redisUrl: 'redis://127.0.0.1:6379/0',
    runtimeDistributedStateEnabled: true
  });

  const chaos = ChaosEngine.getInstance();
  for (const experimentId of ['database-failure', 'redis-failure', 'worker-failure']) {
    if (chaos.isActive(experimentId)) {
      await chaos.stop(experimentId);
    }
  }
  try {
    const startDatabaseFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/database-failure/start',
      headers: {
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { durationMs: 60_000 }
    });
    assert.equal(startDatabaseFailure.statusCode, 200);

    const startRedisFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/redis-failure/start',
      headers: {
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { durationMs: 60_000 }
    });
    assert.equal(startRedisFailure.statusCode, 200);

    const startWorkerFailure = await performRequest(server, {
      method: 'POST',
      url: '/chaos/experiments/worker-failure/start',
      headers: {
        'content-type': 'application/json',
        host: 'localhost'
      },
      body: { durationMs: 60_000, faultDelayMs: 5 }
    });
    assert.equal(startWorkerFailure.statusCode, 200);

    const experimentsResponse = await performRequest(server, {
      method: 'GET',
      url: '/chaos/experiments',
      headers: {
        host: 'localhost'
      }
    });
    assert.equal(experimentsResponse.statusCode, 200);
    const experimentsPayload = experimentsResponse.bodyJson<{
      runtimeState: {
        databaseHealthy: boolean;
        persistenceMode: string;
        workerReady: boolean;
        redisHealthy: boolean;
        rateLimiterMode: string;
        activeExperimentIds: string[];
      };
      experiments: Array<{
        id: string;
        active: boolean;
        runbook?: { path: string };
        runtimeImpact?: { persistenceMode: string; redisHealthy: boolean; workerReady: boolean };
      }>;
    }>();

    assert.equal(experimentsPayload.runtimeState.databaseHealthy, false);
    assert.equal(experimentsPayload.runtimeState.persistenceMode, 'in-memory');
    assert.equal(experimentsPayload.runtimeState.workerReady, false);
    assert.equal(experimentsPayload.runtimeState.redisHealthy, false);
    assert.equal(experimentsPayload.runtimeState.rateLimiterMode, 'in-memory-fallback');
    assert.equal(experimentsPayload.runtimeState.activeExperimentIds.includes('database-failure'), true);

    const databaseExperiment = experimentsPayload.experiments.find((item) => item.id === 'database-failure');
    assert.equal(databaseExperiment?.active, true);
    assert.equal(
      databaseExperiment?.runbook?.path,
      'packages/chaos/src/runbooks/database-failure-runbook.md'
    );
    assert.equal(databaseExperiment?.runtimeImpact?.persistenceMode, 'in-memory');

    const readyResponse = await performRequest(server, {
      method: 'GET',
      url: '/ready',
      headers: {
        host: 'localhost'
      }
    });
    assert.equal(readyResponse.statusCode, 503);
    const readyPayload = readyResponse.bodyJson<{
      readiness: { ready: boolean; persistenceMode: string };
      dependencies: {
        database: { state: string };
        worker: { state: string };
      };
    }>();
    assert.equal(readyPayload.readiness.ready, false);
    assert.equal(readyPayload.readiness.persistenceMode, 'in-memory');
    assert.equal(readyPayload.dependencies.database.state, 'unhealthy');
    assert.equal(readyPayload.dependencies.worker.state, 'degraded');

    const metricsResponse = await performRequest(server, {
      method: 'GET',
      url: '/metrics',
      headers: {
        host: 'localhost'
      }
    });
    assert.equal(metricsResponse.statusCode, 200);
    const metricsText = metricsResponse.bodyText();
    assert.match(metricsText, /^app_database_healthy 0$/m);
    assert.match(metricsText, /^app_redis_healthy 0$/m);
    assert.match(metricsText, /^app_persistence_mode\{mode="in-memory"\} 1$/m);
    assert.match(metricsText, /^app_rate_limiter_mode\{mode="in-memory-fallback"\} 1$/m);
  } finally {
    for (const experimentId of ['database-failure', 'redis-failure', 'worker-failure']) {
      if (chaos.isActive(experimentId)) {
        await chaos.stop(experimentId);
      }
    }
  }
});

test('bootstrap serves extracted OpenAPI and docs routes over HTTP semantics', async () => {
  const server = createServerUnderTest();

  const openApiResponse = await performRequest(server, {
    method: 'GET',
    url: '/openapi.json',
    headers: {
      host: 'localhost'
    }
  });
  assert.equal(openApiResponse.statusCode, 200);
  assert.equal(openApiResponse.getHeader('content-type'), 'application/json');
  const openApiPayload = openApiResponse.bodyJson<{ openapi: string; paths: Record<string, unknown> }>();
  assert.equal(openApiPayload.openapi, '3.0.3');
  assert.ok(Object.keys(openApiPayload.paths).length > 0);

  const docsResponse = await performRequest(server, {
    method: 'GET',
    url: '/api-docs',
    headers: {
      host: 'localhost'
    }
  });
  assert.equal(docsResponse.statusCode, 200);
  assert.equal(
    docsResponse.bodyJson<{ endpoints: { openapi: { url: string } } }>().endpoints.openapi.url,
    '/openapi.json'
  );
});

test('bootstrap serves extracted owners and patients routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const ownersResponse = await performRequest(server, {
    method: 'GET',
    url: '/owners?financialResponsible=true',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(ownersResponse.statusCode, 200);
  const ownersPayload = ownersResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(ownersPayload.items[0]?.id, 'owner_maria_silva');

  const patientsResponse = await performRequest(server, {
    method: 'GET',
    url: '/owner-patient-links?ownerId=owner_maria_silva',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(patientsResponse.statusCode, 200);
  const patientsPayload = patientsResponse.bodyJson<{ items: Array<{ patientId: string }> }>();
  assert.equal(patientsPayload.items[0]?.patientId, 'patient_luna');
});

test('bootstrap registers prescription routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createResponse = await performRequest(server, {
    method: 'POST',
    url: '/prescriptions',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      medicalRecordId: 'mr-http-prescription',
      encounterId: 'enc-http-prescription',
      patientId: 'patient_luna',
      medicationName: 'Dipirona',
      dosage: '25 mg/kg',
      route: 'Oral',
      frequency: '12/12h'
    }
  });
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; medicationName: string }>();
  assert.equal(created.medicationName, 'Dipirona');

  const listResponse = await performRequest(server, {
    method: 'GET',
    url: '/prescriptions?patientId=patient_luna',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listResponse.statusCode, 200);
  const payload = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.ok(payload.items.some((item) => item.id === created.id));
});

test('bootstrap serves administrative financial routes over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Fluxo financeiro administrativo HTTP'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string }>();

  const estimateResponse = await performRequest(server, {
    method: 'POST',
    url: '/billing/estimate',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      administrativeNotes: 'Orcamento administrativo HTTP'
    }
  });
  assert.equal(estimateResponse.statusCode, 200);

  const itemResponse = await performRequest(server, {
    method: 'POST',
    url: '/billing/items',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta HTTP',
      quantity: 1,
      unitPriceAmount: 150
    }
  });
  assert.equal(itemResponse.statusCode, 201);

  const summaryResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}/financial-summary`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(summaryResponse.statusCode, 200);
  const summary = summaryResponse.bodyJson<{
    total: number;
    receivables: Array<{ installmentLabel: string }>;
  }>();
  assert.equal(summary.total, 150);
  assert.equal(summary.receivables.length, 1);

  const closeResponse = await performRequest(server, {
    method: 'POST',
    url: `/encounters/${encounter.id}/financial-close`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      notes: 'Parcelamento administrativo HTTP',
      installments: [
        { label: 'Entrada', amount: 50, dueAt: '2026-04-15T00:00:00.000Z' },
        { label: '30 dias', amount: 100, dueAt: '2026-05-15T00:00:00.000Z' }
      ]
    }
  });
  assert.equal(closeResponse.statusCode, 200);
  const closedSummary = closeResponse.bodyJson<{
    financialClosed: boolean;
    receivables: Array<{ installmentLabel: string }>;
  }>();
  assert.equal(closedSummary.financialClosed, true);
  assert.equal(closedSummary.receivables.length, 2);

  const receivablesResponse = await performRequest(server, {
    method: 'GET',
    url: `/financial/receivables?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(receivablesResponse.statusCode, 200);
  const receivables = receivablesResponse.bodyJson<{ data: Array<{ encounterId: string }> }>();
  assert.equal(receivables.data.length, 2);
  assert.equal(receivables.data[0]?.encounterId, encounter.id);
});

test('bootstrap deletes encounters over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Delete encounter over HTTP'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string }>();

  const deleteResponse = await performRequest(server, {
    method: 'DELETE',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(deleteResponse.statusCode, 204);

  const getResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(getResponse.statusCode, 404);
});

test('bootstrap serves administrative report hubs over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const response = await performRequest(server, {
    method: 'GET',
    url: '/reports/administrative-hubs',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });

  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    generatedAt: string;
    domains: {
      financial: { billing: { totalRecords: number } };
      commercial: { quotes: { issuedCount: number } };
      cash: { hasOpenRegister: boolean };
      fiscal: { activeTaxes: number };
    };
    highlights: Array<{ title: string }>;
  }>();

  assert.ok(payload.generatedAt.length > 0);
  assert.equal(typeof payload.domains.financial.billing.totalRecords, 'number');
  assert.equal(typeof payload.domains.commercial.quotes.issuedCount, 'number');
  assert.equal(typeof payload.domains.cash.hasOpenRegister, 'boolean');
  assert.equal(typeof payload.domains.fiscal.activeTaxes, 'number');
  assert.ok(Array.isArray(payload.highlights));
});

test('queue endpoints support check-in, list and call lifecycle over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createResponse = await performRequest(server, {
    method: 'POST',
    url: '/queue/check-in',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      reason: 'HTTP queue lifecycle',
      priority: 'high'
    }
  });
  assert.equal(createResponse.statusCode, 201);
  const queueEntry = createResponse.bodyJson<{ id: string; status: string }>();

  const listResponse = await performRequest(server, {
    method: 'GET',
    url: '/queue',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listResponse.statusCode, 200);
  const listed = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(
    listed.items.some((entry) => entry.id === queueEntry.id),
    true
  );

  const callResponse = await performRequest(server, {
    method: 'POST',
    url: `/queue/${queueEntry.id}/call`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(callResponse.statusCode, 200);
  const called = callResponse.bodyJson<{ status: string; calledAt?: string }>();
  assert.equal(called.status, 'called');
  assert.ok(called.calledAt);
});

test('appointments reject duplicate time slot for the same patient over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'reception', 'seed_reception');
  const payload = {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    scheduledAt: '2026-04-20T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Consulta duplicada'
  };

  const first = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: payload
  });
  assert.equal(first.statusCode, 201);

  const duplicate = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: payload
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.bodyJson<{ code: string }>().code, 'CONFLICT');
});

test('triage patch updates the record and transitions encounter status over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'HTTP triage update'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const createTriageResponse = await performRequest(server, {
    method: 'POST',
    url: '/triage',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      priority: 'medium',
      chiefComplaint: 'Apatia',
      initialNotes: 'Paciente chegou sem apetite',
      alerts: ['letargia'],
      destination: 'observation'
    }
  });
  assert.equal(createTriageResponse.statusCode, 201);
  const triage = createTriageResponse.bodyJson<{ id: string }>();

  const updateTriageResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/triage/${triage.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      priority: 'high',
      chiefComplaint: 'Apatia e desidratacao',
      alerts: ['letargia', 'desidratacao'],
      destination: 'in_care'
    }
  });
  assert.equal(updateTriageResponse.statusCode, 200);
  const updated = updateTriageResponse.bodyJson<{ priority: string; destination: string }>();
  assert.equal(updated.priority, 'high');
  assert.equal(updated.destination, 'in_care');

  const encounterAfterResponse = await performRequest(server, {
    method: 'GET',
    url: `/encounters/${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(encounterAfterResponse.statusCode, 200);
  const encounterAfter = encounterAfterResponse.bodyJson<{ status: string }>();
  assert.equal(encounterAfter.status, 'in_care');

  const triageListResponse = await performRequest(server, {
    method: 'GET',
    url: `/triage?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(triageListResponse.statusCode, 200);
  const triageList = triageListResponse.bodyJson<{ items: Array<{ chiefComplaint: string }> }>();
  assert.equal(triageList.items[0]?.chiefComplaint, 'Apatia e desidratacao');

  const historyResponse = await performRequest(server, {
    method: 'GET',
    url: `/triage/${triage.id}/history`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(historyResponse.statusCode, 200);
  const history = historyResponse.bodyJson<{
    items: Array<{ changedFields: string[]; nextSnapshot: { destination: string } }>;
  }>();
  assert.equal(history.items.length, 1);
  assert.equal(history.items[0]?.changedFields.includes('priority'), true);
  assert.equal(history.items[0]?.nextSnapshot.destination, 'in_care');
});

test('quotes expose dedicated PDF generation over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createQuote = await performRequest(server, {
    method: 'POST',
    url: '/quotes',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: { notes: 'Quote PDF API' }
  });
  assert.equal(createQuote.statusCode, 201);
  const quote = createQuote.bodyJson<{ id: string }>();

  const addItem = await performRequest(server, {
    method: 'POST',
    url: `/quotes/${quote.id}/items`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      itemType: 'service',
      nameSnapshot: 'Consulta clinica',
      unitPrice: 180,
      quantity: 1
    }
  });
  assert.equal(addItem.statusCode, 201);

  const pdfResponse = await performRequest(server, {
    method: 'GET',
    url: `/quotes/${quote.id}/pdf`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(pdfResponse.statusCode, 200);
  assert.equal(pdfResponse.getHeader('content-type'), 'application/pdf');
  assert.ok(pdfResponse.getHeader('content-disposition')?.includes('.pdf'));
  assert.ok(pdfResponse.bodyText().startsWith('%PDF-1.4'));
});

test('medical records expose revision history and archive semantics over HTTP', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const encounterResponse = await performRequest(server, {
    method: 'POST',
    url: '/encounters',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'HTTP medical record contract'
    }
  });
  assert.equal(encounterResponse.statusCode, 201);
  const encounter = encounterResponse.bodyJson<{ id: string; patientId: string }>();

  const createEntryResponse = await performRequest(server, {
    method: 'POST',
    url: '/medical-records/entries',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      entryType: 'progress_note',
      title: 'Admissao',
      content: 'Paciente admitido para observacao.'
    }
  });
  assert.equal(createEntryResponse.statusCode, 201);
  const entry = createEntryResponse.bodyJson<{ id: string }>();

  const updateEntryResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/medical-records/entries/${entry.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Admissao atualizada',
      content: 'Paciente admitido e monitorado.'
    }
  });
  assert.equal(updateEntryResponse.statusCode, 200);

  const revisionsResponse = await performRequest(server, {
    method: 'GET',
    url: `/medical-records/entries/${entry.id}/revisions`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(revisionsResponse.statusCode, 200);
  const revisions = revisionsResponse.bodyJson<{
    items: Array<{ version: number; content: string }>;
  }>();
  assert.equal(revisions.items.length, 1);
  assert.equal(revisions.items[0]?.version, 1);
  assert.equal(revisions.items[0]?.content, 'Paciente admitido para observacao.');

  const archiveResponse = await performRequest(server, {
    method: 'DELETE',
    url: `/medical-records/entries/${entry.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      reason: 'Lancamento duplicado'
    }
  });
  assert.equal(archiveResponse.statusCode, 200);
  const archived = archiveResponse.bodyJson<{ deletedAt?: string; deleteReason?: string }>();
  assert.ok(archived.deletedAt);
  assert.equal(archived.deleteReason, 'Lancamento duplicado');

  const listEntriesResponse = await performRequest(server, {
    method: 'GET',
    url: `/medical-records/entries?encounterId=${encounter.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listEntriesResponse.statusCode, 200);
  const entries = listEntriesResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(entries.items.length, 0);
});

test('catalog endpoints respect frontend search filters over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const seededBreedsResponse = await performRequest(server, {
    method: 'GET',
    url: '/breeds?active=true&species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(seededBreedsResponse.statusCode, 200);
  const seededBreeds = seededBreedsResponse.bodyJson<{
    items: Array<{ name: string; code: string | null; species: string; active: boolean }>;
  }>();
  assert.equal(
    seededBreeds.items.some(
      (item) => item.name === 'Yorkshire Terrier' && item.species === 'canine' && item.active
    ),
    true
  );

  const seededSpeciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/species?active=true&systemCode=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(seededSpeciesResponse.statusCode, 200);
  const seededSpecies = seededSpeciesResponse.bodyJson<{
    items: Array<{ name: string; code: string | null; systemCode: string; active: boolean }>;
  }>();
  assert.equal(
    seededSpecies.items.some(
      (item) => item.name === 'Canina' && item.systemCode === 'canine' && item.active
    ),
    true
  );

  const createProductResponse = await performRequest(server, {
    method: 'POST',
    url: '/products',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Produto Integrado',
      code: 'PROD-FILTRO-001',
      description: 'Produto para validar busca HTTP',
      basePrice: 45.5
    }
  });
  assert.equal(createProductResponse.statusCode, 201);

  const createServiceResponse = await performRequest(server, {
    method: 'POST',
    url: '/services',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Servico Integrado',
      code: 'SRV-FILTRO-001',
      description: 'Servico para validar busca HTTP',
      basePrice: 90
    }
  });
  assert.equal(createServiceResponse.statusCode, 201);

  const createInactiveServiceResponse = await performRequest(server, {
    method: 'POST',
    url: '/services',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Filtro Servico Inativo',
      code: 'SRV-INATIVO-001',
      description: 'Servico para validar filtro ativo',
      basePrice: 75,
      active: false
    }
  });
  assert.equal(createInactiveServiceResponse.statusCode, 201);

  const productsResponse = await performRequest(server, {
    method: 'GET',
    url: '/products?search=FILTRO-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(productsResponse.statusCode, 200);
  const products = productsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(products.items.length, 1);
  assert.equal(products.items[0]?.code, 'PROD-FILTRO-001');

  const servicesResponse = await performRequest(server, {
    method: 'GET',
    url: '/services?search=SRV-FILTRO-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(servicesResponse.statusCode, 200);
  const services = servicesResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(services.items.length, 1);
  assert.equal(services.items[0]?.code, 'SRV-FILTRO-001');

  const activeServicesResponse = await performRequest(server, {
    method: 'GET',
    url: '/services?active=true',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(activeServicesResponse.statusCode, 200);
  const activeServices = activeServicesResponse.bodyJson<{ items: Array<{ code: string | null; active: boolean }> }>();
  assert.equal(activeServices.items.some((item) => item.code === 'SRV-FILTRO-001'), true);
  assert.equal(activeServices.items.some((item) => item.code === 'SRV-INATIVO-001'), false);

  const createTermResponse = await performRequest(server, {
    method: 'POST',
    url: '/responsibility-terms',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Termo de Internacao',
      code: 'TERM-INTERNACAO-001',
      usageContext: 'internacao',
      content: 'Responsavel ciente dos riscos da internacao.',
      active: true,
      requiresOwnerSignature: true,
      requiresWitnessSignature: false
    }
  });
  assert.equal(createTermResponse.statusCode, 201);
  const createdTerm = createTermResponse.bodyJson<{ id: string; code: string | null; usageContext: string }>();
  assert.equal(createdTerm.code, 'TERM-INTERNACAO-001');
  assert.equal(createdTerm.usageContext, 'internacao');

  const termsResponse = await performRequest(server, {
    method: 'GET',
    url: '/responsibility-terms?search=TERM-INTERNACAO-001&active=true&usageContext=internacao',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(termsResponse.statusCode, 200);
  const terms = termsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(terms.items.length, 1);
  assert.equal(terms.items[0]?.code, 'TERM-INTERNACAO-001');

  const updateTermResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/responsibility-terms/${createdTerm.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      title: 'Termo de Internacao Revisado',
      active: false
    }
  });
  assert.equal(updateTermResponse.statusCode, 200);
  assert.equal(updateTermResponse.bodyJson<{ active: boolean; title: string }>().active, false);

  const createBreedResponse = await performRequest(server, {
    method: 'POST',
    url: '/breeds',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Golden Retriever',
      code: 'CAN-GOLD-001',
      species: 'canine',
      description: 'Raca canina para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createBreedResponse.statusCode, 201);
  const createdBreed = createBreedResponse.bodyJson<{ id: string; code: string | null; species: string }>();
  assert.equal(createdBreed.code, 'CAN-GOLD-001');
  assert.equal(createdBreed.species, 'canine');

  const breedsResponse = await performRequest(server, {
    method: 'GET',
    url: '/breeds?search=GOLD-001&active=true&species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(breedsResponse.statusCode, 200);
  const breeds = breedsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(breeds.items.length, 1);
  assert.equal(breeds.items[0]?.code, 'CAN-GOLD-001');

  const vetusAliasBreedResponse = await performRequest(server, {
    method: 'GET',
    url: '/breed?species=canine',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasBreedResponse.statusCode, 200);
  const vetusAliasBreeds = vetusAliasBreedResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(vetusAliasBreeds.items.some((item) => item.code === 'CAN-GOLD-001'), true);

  const updateBreedResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/breeds/${createdBreed.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Golden Retriever Revisado',
      active: false
    }
  });
  assert.equal(updateBreedResponse.statusCode, 200);
  assert.equal(updateBreedResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createSpeciesResponse = await performRequest(server, {
    method: 'POST',
    url: '/species',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Lagomorfo',
      code: 'LAGOMORPH-001',
      systemCode: 'other',
      description: 'Especie para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createSpeciesResponse.statusCode, 201);
  const createdSpecies = createSpeciesResponse.bodyJson<{ id: string; code: string | null; systemCode: string }>();
  assert.equal(createdSpecies.code, 'LAGOMORPH-001');
  assert.equal(createdSpecies.systemCode, 'other');

  const speciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/species?search=LAGOMORPH-001&active=true&systemCode=other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(speciesResponse.statusCode, 200);
  const species = speciesResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(species.items.length, 1);
  assert.equal(species.items[0]?.code, 'LAGOMORPH-001');

  const vetusAliasSpeciesResponse = await performRequest(server, {
    method: 'GET',
    url: '/specie?systemCode=other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasSpeciesResponse.statusCode, 200);
  const vetusAliasSpecies = vetusAliasSpeciesResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(vetusAliasSpecies.items.some((item) => item.code === 'LAGOMORPH-001'), true);

  const updateSpeciesResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/species/${createdSpecies.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Lagomorfo Revisado',
      active: false
    }
  });
  assert.equal(updateSpeciesResponse.statusCode, 200);
  assert.equal(updateSpeciesResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createCoatColorResponse = await performRequest(server, {
    method: 'POST',
    url: '/coat-colors',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Chocolate',
      code: 'COAT-CHOCOLATE-001',
      colorGroup: 'Solida',
      hexColor: '#4b2e22',
      description: 'Pelagem para validar cadastro Vetus',
      active: true
    }
  });
  assert.equal(createCoatColorResponse.statusCode, 201);
  const createdCoatColor = createCoatColorResponse.bodyJson<{
    id: string;
    code: string | null;
    colorGroup: string | null;
    hexColor: string | null;
  }>();
  assert.equal(createdCoatColor.code, 'COAT-CHOCOLATE-001');
  assert.equal(createdCoatColor.colorGroup, 'Solida');
  assert.equal(createdCoatColor.hexColor, '#4b2e22');

  const coatColorsResponse = await performRequest(server, {
    method: 'GET',
    url: '/coat-colors?search=CHOCOLATE-001&active=true&colorGroup=Solida',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(coatColorsResponse.statusCode, 200);
  const coatColors = coatColorsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(coatColors.items.length, 1);
  assert.equal(coatColors.items[0]?.code, 'COAT-CHOCOLATE-001');

  const vetusAliasCoatColorsResponse = await performRequest(server, {
    method: 'GET',
    url: '/coat-color?colorGroup=Solida',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasCoatColorsResponse.statusCode, 200);
  const vetusAliasCoatColors = vetusAliasCoatColorsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(vetusAliasCoatColors.items.some((item) => item.code === 'COAT-CHOCOLATE-001'), true);

  const updateCoatColorResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/coat-colors/${createdCoatColor.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Chocolate Revisado',
      active: false
    }
  });
  assert.equal(updateCoatColorResponse.statusCode, 200);
  assert.equal(updateCoatColorResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createCustomerGroupResponse = await performRequest(server, {
    method: 'POST',
    url: '/customer-groups',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Convenio',
      code: 'CUSTOMER-GROUP-001',
      segment: 'Convenio',
      discountPercent: 10,
      paymentTermDays: 30,
      creditLimitAmount: 1000,
      description: 'Grupo para validar cadastro Vetus-like',
      active: true
    }
  });
  assert.equal(createCustomerGroupResponse.statusCode, 201);
  const createdCustomerGroup = createCustomerGroupResponse.bodyJson<{
    id: string;
    code: string | null;
    segment: string | null;
    discountPercent: number;
    paymentTermDays: number;
    creditLimitAmount: number | null;
  }>();
  assert.equal(createdCustomerGroup.code, 'CUSTOMER-GROUP-001');
  assert.equal(createdCustomerGroup.segment, 'Convenio');
  assert.equal(createdCustomerGroup.discountPercent, 10);
  assert.equal(createdCustomerGroup.paymentTermDays, 30);
  assert.equal(createdCustomerGroup.creditLimitAmount, 1000);

  const customerGroupsResponse = await performRequest(server, {
    method: 'GET',
    url: '/customer-groups?search=CUSTOMER-GROUP-001&active=true&segment=Convenio',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(customerGroupsResponse.statusCode, 200);
  const customerGroups = customerGroupsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(customerGroups.items.length, 1);
  assert.equal(customerGroups.items[0]?.code, 'CUSTOMER-GROUP-001');

  const vetusAliasCustomerGroupsResponse = await performRequest(server, {
    method: 'GET',
    url: '/grupos-de-clientes?segment=Convenio',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(vetusAliasCustomerGroupsResponse.statusCode, 200);
  const vetusAliasCustomerGroups = vetusAliasCustomerGroupsResponse.bodyJson<{ items: Array<{ code: string | null }> }>();
  assert.equal(vetusAliasCustomerGroups.items.some((item) => item.code === 'CUSTOMER-GROUP-001'), true);

  const updateCustomerGroupResponse = await performRequest(server, {
    method: 'PATCH',
    url: `/customer-groups/${createdCustomerGroup.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Convenio Revisado',
      active: false
    }
  });
  assert.equal(updateCustomerGroupResponse.statusCode, 200);
  assert.equal(updateCustomerGroupResponse.bodyJson<{ active: boolean; name: string }>().active, false);

  const createPreventiveResponse = await performRequest(server, {
    method: 'POST',
    url: '/vaccines-dewormers',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_rex',
      ownerId: 'owner_maria',
      clientName: 'Maria Silva',
      animalName: 'Rex',
      eventDate: '2026-05-10',
      itemType: 'vaccine',
      description: 'Vacina V10 - reforco anual',
      observation: 'Avisar tutor com antecedencia.'
    }
  });
  assert.equal(createPreventiveResponse.statusCode, 201);
  const createdPreventive = createPreventiveResponse.bodyJson<{
    id: string;
    description: string;
    status: string;
    itemType: string;
    patientId: string | null;
    ownerId: string | null;
  }>();
  assert.equal(createdPreventive.description, 'Vacina V10 - reforco anual');
  assert.equal(createdPreventive.status, 'scheduled');
  assert.equal(createdPreventive.itemType, 'vaccine');
  assert.equal(createdPreventive.patientId, 'patient_rex');
  assert.equal(createdPreventive.ownerId, 'owner_maria');

  const preventiveListResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?dateFrom=2026-05-01&dateTo=2026-05-31&client=Maria&animal=Rex&itemType=vaccine&patientId=patient_rex&ownerId=owner_maria',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(preventiveListResponse.statusCode, 200);
  const preventiveEvents = preventiveListResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>();
  assert.equal(preventiveEvents.items.length, 1);
  assert.equal(preventiveEvents.items[0]?.id, createdPreventive.id);

  const otherPatientPreventiveListResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?includeExecuted=true&patientId=patient_other',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(otherPatientPreventiveListResponse.statusCode, 200);
  assert.equal(otherPatientPreventiveListResponse.bodyJson<{ items: unknown[] }>().items.length, 0);

  const executePreventiveResponse = await performRequest(server, {
    method: 'POST',
    url: `/vaccines-dewormers/${createdPreventive.id}/execute`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      observation: 'Aplicada sem intercorrencias.',
      rescheduleTo: '2027-05-10'
    }
  });
  assert.equal(executePreventiveResponse.statusCode, 200);
  const executePreventive = executePreventiveResponse.bodyJson<{
    event: { status: string; executedObservation: string | null };
    rescheduledEvent: { eventDate: string; status: string } | null;
  }>();
  assert.equal(executePreventive.event.status, 'executed');
  assert.equal(executePreventive.event.executedObservation, 'Aplicada sem intercorrencias.');
  assert.equal(executePreventive.rescheduledEvent?.eventDate, '2027-05-10');
  assert.equal(executePreventive.rescheduledEvent?.status, 'scheduled');

  const includeExecutedPreventiveResponse = await performRequest(server, {
    method: 'GET',
    url: '/vaccines-dewormers?includeExecuted=true&client=Maria',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(includeExecutedPreventiveResponse.statusCode, 200);
  const includeExecutedPreventive = includeExecutedPreventiveResponse.bodyJson<{
    items: Array<{ status: string }>;
  }>();
  assert.equal(includeExecutedPreventive.items.some((item) => item.status === 'executed'), true);

  const preventiveEmailResponse = await performRequest(server, {
    method: 'POST',
    url: '/vaccines-dewormers/reminders/email',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      client: 'Maria'
    }
  });
  assert.equal(preventiveEmailResponse.statusCode, 200);
  assert.equal(preventiveEmailResponse.bodyJson<{ preparedCount: number }>().preparedCount, 1);

  const inventoryResponse = await performRequest(server, {
    method: 'GET',
    url: '/inventory?search=MED-001',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(inventoryResponse.statusCode, 200);
  const inventory = inventoryResponse.bodyJson<{ items: Array<{ sku: string; name: string }> }>();
  assert.equal(inventory.items.length, 1);
  assert.equal(inventory.items[0]?.sku, 'MED-001');
  assert.equal(inventory.items[0]?.name, 'Dipirona Injetavel');
});

test('API keys unlock integration catalog and PIX intent creation over HTTP semantics', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const createKeyResponse = await performRequest(server, {
    method: 'POST',
    url: '/api-keys',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      name: 'Third-party integration key',
      permissions: ['integrations.read', 'payments.manage'],
      rateLimit: 120,
      rateLimitWindow: 3600
    }
  });
  assert.equal(createKeyResponse.statusCode, 201);
  const createdKey = createKeyResponse.bodyJson<{ apiKey: { id: string }; rawKey: string }>();
  assert.ok(createdKey.rawKey.startsWith('cvg_'));

  const listKeyResponse = await performRequest(server, {
    method: 'GET',
    url: '/api-keys',
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(listKeyResponse.statusCode, 200);
  const apiKeyList = listKeyResponse.bodyJson<{ items: Array<{ id: string; keyHash?: string }> }>();
  assert.equal(apiKeyList.items.some((item) => item.id === createdKey.apiKey.id), true);
  assert.equal(apiKeyList.items.some((item) => 'keyHash' in item), false);

  const catalogResponse = await performRequest(server, {
    method: 'GET',
    url: '/integrations/catalog',
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(catalogResponse.statusCode, 200);
  const catalog = catalogResponse.bodyJson<{
    payments: { provider: string; capabilities: string[]; endpoints: string[] };
  }>();
  assert.equal(catalog.payments.provider, 'gateway-abstraction');
  assert.deepEqual(catalog.payments.capabilities, ['pix', 'cards']);
  assert.equal(catalog.payments.endpoints.includes('/payments/cards/intents'), true);
  assert.equal(
    catalog.payments.endpoints.includes('/payments/cards/intents/{intentId}/capture'),
    true
  );
  assert.equal(catalog.payments.endpoints.includes('/payments/cards/report'), true);

  const paymentResponse = await performRequest(server, {
    method: 'POST',
    url: '/payments/pix/intents',
    headers: {
      'x-api-key': createdKey.rawKey,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      billingRecordId: 'bill_123',
      amount: 149.9,
      description: 'Consulta de acompanhamento',
      expirationMinutes: 45
    }
  });
  assert.equal(paymentResponse.statusCode, 201);
  const payment = paymentResponse.bodyJson<{
    provider: string;
    status: string;
    eventId: string;
    qrCodePayload: string;
  }>();
  assert.equal(payment.provider, 'local-pix');
  assert.equal(payment.status, 'pending');
  assert.ok(payment.eventId);
  assert.ok(payment.qrCodePayload.includes('bill_123'));

  const cardIntentResponse = await performRequest(server, {
    method: 'POST',
    url: '/payments/cards/intents',
    headers: {
      'x-api-key': createdKey.rawKey,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      billingRecordId: 'bill_card_123',
      amount: 320,
      description: 'Internacao parcelada',
      cardHolderName: 'Maria Silva',
      customerName: 'Maria Silva',
      customerEmail: 'maria@example.com',
      brand: 'visa',
      last4: '4242',
      installments: 4
    }
  });
  assert.equal(cardIntentResponse.statusCode, 201);
  const cardIntent = cardIntentResponse.bodyJson<{
    provider: string;
    status: string;
    installments: number;
    eventId: string;
    id: string;
    providerChargeId?: string;
    card: { last4: string; brand?: string };
  }>();
  assert.equal(cardIntent.provider, 'local-card');
  assert.equal(cardIntent.status, 'authorized_pending_capture');
  assert.equal(cardIntent.installments, 4);
  assert.equal(cardIntent.card.last4, '4242');
  assert.equal(cardIntent.card.brand, 'visa');
  assert.ok(cardIntent.eventId);
  assert.ok(cardIntent.providerChargeId);

  const cardCaptureResponse = await performRequest(server, {
    method: 'POST',
    url: `/payments/cards/intents/${cardIntent.id}/capture`,
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(cardCaptureResponse.statusCode, 200);
  const cardCapture = cardCaptureResponse.bodyJson<{
    provider: string;
    status: string;
    providerChargeId?: string;
  }>();
  assert.equal(cardCapture.provider, 'local-card');
  assert.equal(cardCapture.status, 'captured');
  assert.ok(cardCapture.providerChargeId);

  const cardReportResponse = await performRequest(server, {
    method: 'GET',
    url: '/payments/cards/report',
    headers: {
      'x-api-key': createdKey.rawKey,
      host: 'localhost'
    }
  });
  assert.equal(cardReportResponse.statusCode, 200);
  const cardReport = cardReportResponse.bodyJson<{
    provider: string;
    summary: { total: number };
    items: unknown[];
  }>();
  assert.equal(cardReport.provider, 'local-card');
  assert.ok(Array.isArray(cardReport.items));
  assert.equal(typeof cardReport.summary.total, 'number');
});

// =============================================================================
// WhatsApp inbound webhook tests
// =============================================================================

test('POST /webhooks/whatsapp/inbound confirms a scheduled appointment', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-01T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Confirm test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(appointment.status, 'scheduled');

  // Send CONFIRMAR via WhatsApp inbound
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestconfirm001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CONFIRMAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');

  // Verify appointment status changed to checked_in
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const updatedApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(updatedApt.status, 'checked_in');
});

test('POST /webhooks/whatsapp/inbound cancels a scheduled appointment', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-02T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Cancel test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(appointment.status, 'scheduled');

  // Send CANCELAR via WhatsApp inbound
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestcancel001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CANCELAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CANCELADO');

  // Verify appointment status changed to cancelled
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const cancelledApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(cancelledApt.status, 'cancelled');
});

test('POST /webhooks/whatsapp/inbound with REMARCAR returns AGUARDANDO REMARCA', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  // Create a scheduled appointment
  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-03T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Reschedule test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string; status: string }>();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestremarcar001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'REMARCAR',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'AGUARDANDO REMARCA');

  // Status should remain scheduled (REMARCAR does not change status)
  const aptGetResponse = await performRequest(server, {
    method: 'GET',
    url: `/appointments/${appointment.id}`,
    headers: {
      authorization: `Bearer ${accessToken}`,
      host: 'localhost'
    }
  });
  assert.equal(aptGetResponse.statusCode, 200);
  const unchangedApt = aptGetResponse.bodyJson<{ status: string }>();
  assert.equal(unchangedApt.status, 'scheduled');
});

test('POST /webhooks/whatsapp/inbound with malformed payload returns OK', async () => {
  const server = createServerUnderTest();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestmalformed001',
      From: 'whatsapp:+5511999998888',
      Body: 'CONFIRMAR'
      // no AppointmentId
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'OK');
});

test('POST /webhooks/whatsapp/inbound returns CONFIRMADO even if appointment not found (fail-safe)', async () => {
  const server = createServerUnderTest();

  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestnotfound001',
      From: 'whatsapp:+5511999998888',
      To: 'whatsapp:+551155555555',
      Body: 'CONFIRMAR',
      AppointmentId: 'appt_nonexistent_999'
    }
  });

  // Fail-safe: always return CONFIRMADO even if appointment lookup fails
  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');
});

test('POST /webhooks/whatsapp/inbound CONFIRM returns CONFIRMADO (alias)', async () => {
  const server = createServerUnderTest();
  const accessToken = await login(server, 'admin', 'seed_admin');

  const aptResponse = await performRequest(server, {
    method: 'POST',
    url: '/appointments',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      host: 'localhost'
    },
    body: {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-05-04T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Confirm alias test'
    }
  });
  assert.equal(aptResponse.statusCode, 201);
  const appointment = aptResponse.bodyJson<{ id: string }>();

  // Use CONFIRM (alias) instead of CONFIRMAR
  const inboundResponse = await performRequest(server, {
    method: 'POST',
    url: '/webhooks/whatsapp/inbound',
    headers: { 'content-type': 'application/json', host: 'localhost' },
    body: {
      MessageSid: 'SMtestconfirmalias001',
      From: 'whatsapp:+5511999998888',
      Body: 'CONFIRM',
      AppointmentId: appointment.id
    }
  });

  assert.equal(inboundResponse.statusCode, 200);
  assert.equal(inboundResponse.bodyText(), 'CONFIRMADO');
});
