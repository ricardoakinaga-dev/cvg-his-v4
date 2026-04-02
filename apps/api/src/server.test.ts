import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { createApiServer } from './server.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
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

function createServerUnderTest() {
  return createApiServer({
    appName: 'api-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800
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
