import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { AuditService } from '@cvg-his-v2/module-audit';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { InpatientService, SectorBedService } from '@cvg-his-v2/module-inpatient';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  AuthenticatedPrincipal,
  InpatientProgressSummary,
  InpatientStaySummary
} from '@cvg-his-v2/shared-types';

import { handleInpatientRoutes } from './inpatient-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly socket: { remoteAddress: string };
  readonly #body: Buffer;
  #sent = false;

  constructor(input: {
    method: string;
    url: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = { ...(input.headers ?? {}) };
    this.socket = { remoteAddress: '127.0.0.1' };
    this.#body = Buffer.from(input.body ? JSON.stringify(input.body) : '', 'utf8');
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
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
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

    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(accountId = 'acc_cvg_demo'): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: accountId as never,
      username: 'nurse',
      email: 'nurse@example.com',
      displayName: 'Nurse',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: accountId as never,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: {
      roleCodes: ['nurse'],
      permissionCodes: ['inpatient.read', 'inpatient.manage'],
      capabilities: []
    }
  };
}

function createInpatientService(): InpatientService {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const encounters = new EncountersService({ owners, patients });
  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user-1' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'scheduled',
    origin: 'reception',
    reason: 'Internacao'
  });
  const service = new InpatientService(encounters as never);
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });
  service.addProgress(
    'user-1' as never,
    {
      stayId: stay.id,
      note: 'Pendente avaliacao de retorno e ajuste de fluidoterapia'
    },
    stay.accountId
  );
  return service;
}

test('handleInpatientRoutes generates handover preview with latest progress and attention flags', async () => {
  const response = new MockResponse();

  const handled = await handleInpatientRoutes(
    '/inpatient/handover-preview',
    new MockRequest({
      method: 'GET',
      url: '/inpatient/handover-preview?ward=Ala%20A'
    }) as never,
    response as never,
    'corr-inpatient-handover',
    {
      inpatient: createInpatientService(),
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    totalActiveStays: number;
    items: Array<{ ward: string; latestProgressNote: string | null; requiresAttention: boolean }>;
  }>();
  assert.equal(payload.totalActiveStays, 1);
  assert.equal(payload.items[0]?.ward, 'Ala A');
  assert.equal(
    payload.items[0]?.latestProgressNote,
    'Pendente avaliacao de retorno e ajuste de fluidoterapia'
  );
  assert.equal(payload.items[0]?.requiresAttention, true);
});

test('handleInpatientRoutes propagates the principal account into stay reads', async () => {
  const calls: string[] = [];
  const stay = {
    id: 'stay-account-boundary',
    accountId: 'acc_cvg_demo'
  } as InpatientStaySummary;
  const inpatient = {
    getOrThrow: (_stayId: string, accountId?: string) => {
      calls.push(`get:${accountId ?? 'missing'}`);
      return stay;
    },
    listProgress: (_stayId: string, accountId?: string) => {
      calls.push(`progress:${accountId ?? 'missing'}`);
      return [];
    }
  };
  const response = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/progress`,
    new MockRequest({
      method: 'GET',
      url: `/inpatient/${stay.id}/progress`
    }) as never,
    response as never,
    'corr-inpatient-stay-account-boundary',
    {
      inpatient: inpatient as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.deepEqual(calls, ['get:acc_cvg_demo', 'progress:acc_cvg_demo']);
  assert.equal(response.statusCode, 200);
});

test('handleInpatientRoutes hides inpatient resources from another account', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/progress`,
      new MockRequest({ method: 'GET', url: `/inpatient/${stay.id}/progress` }) as never,
      new MockResponse() as never,
      'corr-inpatient-cross-account',
      {
        inpatient,
        sectorBedService: {} as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal('acc_other')
      }
    ),
    /Inpatient stay not found/
  );
});

test('handleInpatientRoutes admits the patient from an existing encounter', async () => {
  const inpatient = createInpatientService();
  const existingStay = inpatient.list()[0];
  assert.ok(existingStay);
  inpatient.updateStatus(
    existingStay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta antes da readmissao de teste'
    },
    existingStay.accountId
  );
  const response = new MockResponse();

  const handled = await handleInpatientRoutes(
    '/inpatient',
    new MockRequest({
      method: 'POST',
      url: '/inpatient',
      body: {
        encounterId: existingStay.encounterId,
        patientId: existingStay.patientId,
        unit: 'Internacao clinica',
        ward: 'Ala B',
        bed: 'B-02'
      }
    }) as never,
    response as never,
    'corr-inpatient-admit',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const admitted = response.bodyJson<InpatientStaySummary>();
  assert.equal(admitted.encounterId, existingStay.encounterId);
  assert.equal(admitted.patientId, existingStay.patientId);
  assert.equal(admitted.ownerId, existingStay.ownerId);
  assert.equal(admitted.status, 'admitted');
});

test('handleInpatientRoutes executes admission through the tenant command seam', async () => {
  const inpatient = createInpatientService();
  const existingStay = inpatient.list()[0];
  assert.ok(existingStay);
  inpatient.updateStatus(
    existingStay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta antes da admissao idempotente'
    },
    existingStay.accountId
  );

  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const response = new MockResponse();

  await handleInpatientRoutes(
    '/inpatient',
    new MockRequest({
      method: 'POST',
      url: '/inpatient',
      headers: { 'idempotency-key': 'admission-idempotency-key' },
      body: {
        encounterId: existingStay.encounterId,
        patientId: existingStay.patientId,
        unit: 'Internacao clinica',
        ward: 'Ala B',
        bed: 'B-02'
      }
    }) as never,
    response as never,
    'corr-inpatient-admission-command',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 201);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.admissions.create');
});

test('handleInpatientRoutes removes an admission cache entry after command rollback', async () => {
  const inpatient = createInpatientService();
  const existingStay = inpatient.list()[0];
  assert.ok(existingStay);
  inpatient.updateStatus(
    existingStay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta antes do rollback de admissao'
    },
    existingStay.accountId
  );
  const before = inpatient
    .list({ includeDischarged: true })
    .map((stay) => `${stay.id}:${stay.status}`)
    .sort();
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after inpatient admission');
  };

  await assert.rejects(
    handleInpatientRoutes(
      '/inpatient',
      new MockRequest({
        method: 'POST',
        url: '/inpatient',
        body: {
          encounterId: existingStay.encounterId,
          patientId: existingStay.patientId,
          unit: 'Internacao clinica',
          ward: 'Ala B',
          bed: 'B-03'
        }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-admission-rollback',
      {
        inpatient,
        sectorBedService: {} as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient admission/
  );

  assert.deepEqual(
    inpatient
      .list({ includeDischarged: true })
      .map((stay) => `${stay.id}:${stay.status}`)
      .sort(),
    before
  );
});

test('handleInpatientRoutes appends inpatient progress to clinical record timeline', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  let callbackCompleted = false;
  const onProgressAdded = test.mock.fn(
    async (_event: {
      readonly stay: InpatientStaySummary;
      readonly progress: InpatientProgressSummary;
      readonly principal: AuthenticatedPrincipal;
    }) => {
      await Promise.resolve();
      callbackCompleted = true;
    }
  );

  const handled = await handleInpatientRoutes(
    `/inpatient/${stay.id}/progress`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/progress`,
      body: { note: 'Paciente aceitou dieta e manteve parametros estaveis' }
    }) as never,
    response as never,
    'corr-inpatient-progress',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      onProgressAdded
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.equal(onProgressAdded.mock.callCount(), 1);
  assert.equal(callbackCompleted, true);
  const callbackPayload = onProgressAdded.mock.calls[0]?.arguments[0];
  assert.equal(callbackPayload.stay.id, stay.id);
  assert.equal(
    callbackPayload.progress.note,
    'Paciente aceitou dieta e manteve parametros estaveis'
  );
  assert.equal(callbackPayload.principal.user.id, 'user-1');
});

test('handleInpatientRoutes executes inpatient progress through the tenant command seam', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/progress`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/progress`,
      headers: { 'idempotency-key': 'progress-idempotency-key' },
      body: { note: 'Progress protegida por comando tenant-scoped' }
    }) as never,
    response as never,
    'corr-inpatient-progress-command',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 201);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.progress.create');
});

test('handleInpatientRoutes executes inpatient bed assignment through the tenant command seam', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const sectorBedService = {
    getBedForAccountOrThrow: test.mock.fn(async () => ({
      id: 'bed-assignment-1',
      accountId: 'acc_cvg_demo',
      sectorId: 'sector-assignment-1',
      code: 'A-02',
      name: 'Leito A-02',
      status: 'available',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  };

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/assign-bed`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/assign-bed`,
      headers: { 'idempotency-key': 'inpatient-bed-assignment-key' },
      body: { bedId: 'bed-assignment-1', sectorId: 'sector-assignment-1' }
    }) as never,
    response as never,
    'corr-inpatient-bed-assignment-command',
    {
      inpatient,
      sectorBedService: sectorBedService as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.beds.assign');
});

test('handleInpatientRoutes executes inpatient bed transfer through the tenant command seam', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  let callbackCompleted = false;
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const sectorBedService = {
    getBedForAccountOrThrow: test.mock.fn(async () => ({
      id: 'bed-transfer-1',
      accountId: 'acc_cvg_demo',
      sectorId: 'sector-transfer-1',
      code: 'B-04',
      name: 'Leito B-04',
      status: 'available',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  };
  const onStatusUpdated = test.mock.fn(
    async (_event: {
      readonly stay: InpatientStaySummary;
      readonly previousStatus: InpatientStaySummary['status'];
      readonly principal: AuthenticatedPrincipal;
    }) => {
      await Promise.resolve();
      callbackCompleted = true;
    }
  );

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/transfer-bed`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/transfer-bed`,
      headers: { 'idempotency-key': 'inpatient-bed-transfer-key' },
      body: { bedId: 'bed-transfer-1', sectorId: 'sector-transfer-1' }
    }) as never,
    response as never,
    'corr-inpatient-bed-transfer-command',
    {
      inpatient,
      sectorBedService: sectorBedService as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never,
      onStatusUpdated
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.beds.transfer');
  assert.equal(onStatusUpdated.mock.callCount(), 1);
  assert.equal(callbackCompleted, true);
});

test('handleInpatientRoutes creates and lists inpatient occurrences', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const createResponse = new MockResponse();

  const created = await handleInpatientRoutes(
    `/inpatient/${stay.id}/occurrences`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/occurrences`,
      body: {
        type: 'clinical',
        severity: 'attention',
        title: 'Hiporexia',
        description: 'Paciente recusou dieta no plantao.'
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-occurrence',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(created, true);
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.bodyJson<{ title: string }>().title, 'Hiporexia');

  const listResponse = new MockResponse();
  const listed = await handleInpatientRoutes(
    `/inpatient/${stay.id}/occurrences`,
    new MockRequest({
      method: 'GET',
      url: `/inpatient/${stay.id}/occurrences`
    }) as never,
    listResponse as never,
    'corr-inpatient-occurrences-list',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listed, true);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(
    listResponse.bodyJson<{ items: Array<{ title: string }> }>().items[0]?.title,
    'Hiporexia'
  );
});

test('handleInpatientRoutes executes inpatient occurrence through the tenant command seam', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const response = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/occurrences`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/occurrences`,
      headers: { 'idempotency-key': 'occurrence-idempotency-key' },
      body: {
        type: 'clinical',
        severity: 'attention',
        title: 'Hiporexia protegida',
        description: 'Ocorrencia criada dentro do comando tenant-scoped.'
      }
    }) as never,
    response as never,
    'corr-inpatient-occurrence-command',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 201);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.occurrences.create');
});

test('handleInpatientRoutes refreshes inpatient caches after progress and occurrence rollback', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  const beforeProgress = inpatient.listProgress(stay.id, stay.accountId);
  const beforeOccurrences = inpatient.listOccurrences(stay.id, stay.accountId);
  const refreshInpatient = test.mock.fn(async () => {});
  inpatient.refreshAccount = refreshInpatient as never;
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after inpatient command');
  };

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/progress`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/progress`,
        body: { note: 'Progress que deve ser reidratada após rollback' }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-progress-rollback',
      {
        inpatient,
        sectorBedService: {} as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient command/
  );

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/occurrences`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/occurrences`,
        body: {
          type: 'clinical',
          severity: 'attention',
          title: 'Ocorrencia rollback',
          description: 'Ocorrencia que deve ser reidratada após rollback.'
        }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-occurrence-rollback',
      {
        inpatient,
        sectorBedService: {} as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient command/
  );

  assert.equal(refreshInpatient.mock.callCount(), 2);
  assert.deepEqual(inpatient.listProgress(stay.id, stay.accountId), beforeProgress);
  assert.deepEqual(inpatient.listOccurrences(stay.id, stay.accountId), beforeOccurrences);
});

test('handleInpatientRoutes refreshes inpatient caches after bed and status rollback', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  const refreshInpatient = test.mock.fn(async () => {});
  inpatient.refreshAccount = refreshInpatient as never;
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after inpatient bed/status command');
  };
  const sectorBedService = {
    getBedForAccountOrThrow: test.mock.fn(async (accountId: string, bedId: string) => ({
      id: bedId,
      accountId,
      sectorId: 'sector-rollback',
      code: 'R-01',
      name: 'Leito rollback',
      status: 'available',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  };

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/assign-bed`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/assign-bed`,
        body: { bedId: 'bed-rollback-assign', sectorId: 'sector-rollback' }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-bed-assignment-rollback',
      {
        inpatient,
        sectorBedService: sectorBedService as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient bed\/status command/
  );

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/update-status`,
      new MockRequest({
        method: 'PATCH',
        url: `/inpatient/${stay.id}/update-status`,
        body: { status: 'stable' }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-status-rollback',
      {
        inpatient,
        sectorBedService: sectorBedService as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient bed\/status command/
  );

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/transfer-bed`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/transfer-bed`,
        body: { bedId: 'bed-rollback-transfer', sectorId: 'sector-rollback' }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-bed-transfer-rollback',
      {
        inpatient,
        sectorBedService: sectorBedService as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after inpatient bed\/status command/
  );

  assert.equal(refreshInpatient.mock.callCount(), 3);
});

test('handleInpatientRoutes creates and bills daily inpatient charges', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const addBillingItem = test.mock.fn(async () => ({
    id: 'billitem_1',
    billingRecordId: 'bill_inpatient_1',
    accountId: 'acc_cvg_demo',
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 2,
    unitPriceAmount: 180,
    totalAmount: 360,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: 'charge_pending',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString()
  }));
  const createResponse = new MockResponse();

  const created = await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria UTI',
        chargeDate: '2026-05-28',
        quantity: 2,
        unitAmount: 180
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-daily-charge',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(created, true);
  assert.equal(createResponse.statusCode, 201);
  const charge = createResponse.bodyJson<{ id: string; totalAmount: number; status: string }>();
  assert.equal(charge.totalAmount, 360);
  assert.equal(charge.status, 'pending');

  const billResponse = new MockResponse();
  const billed = await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      body: { billingRecordId: 'bill_1' }
    }) as never,
    billResponse as never,
    'corr-inpatient-daily-charge-bill',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(billed, true);
  assert.equal(billResponse.statusCode, 200);
  assert.equal(addBillingItem.mock.callCount(), 1);
  const addBillingItemPayload = (
    addBillingItem.mock.calls[0]?.arguments as unknown[] | undefined
  )?.[2];
  assert.deepEqual(addBillingItemPayload, {
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 2,
    unitPriceAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: charge.id
  });
  assert.equal(
    billResponse.bodyJson<{ status: string; billingRecordId: string }>().status,
    'billed'
  );
  assert.equal(
    billResponse.bodyJson<{ status: string; billingRecordId: string }>().billingRecordId,
    'bill_inpatient_1'
  );
});

test('handleInpatientRoutes restores daily-charge cache after command rollback', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after daily charge');
  };

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/daily-charges`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/daily-charges`,
        body: {
          description: 'Diária removida após rollback',
          quantity: 1,
          unitAmount: 180
        }
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-daily-charge-rollback',
      {
        inpatient,
        sectorBedService: {} as never,
        audit: { write: () => {} } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after daily charge/
  );

  assert.deepEqual(inpatient.listDailyCharges(stay.id, stay.accountId), []);
});

test('handleInpatientRoutes executes daily-charge creation through the tenant command seam', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  assert.ok(stay);
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const response = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      headers: { 'idempotency-key': 'daily-charge-idempotency-key' },
      body: {
        description: 'Diaria protegida',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    response as never,
    'corr-inpatient-daily-charge-command',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 201);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.daily-charges.create');
});

test('handleInpatientRoutes executes daily-charge billing through the tenant command seam', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const addBillingItem = test.mock.fn(async () => ({
    id: 'billitem_transaction_1',
    billingRecordId: 'bill_inpatient_transaction_1',
    accountId: 'acc_cvg_demo',
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    totalAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: 'charge_transaction',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString()
  }));
  const createResponse = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria UTI',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-daily-charge-transaction-create',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const charge = createResponse.bodyJson<{ id: string }>();
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };
  const response = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      body: {}
    }) as never,
    response as never,
    'corr-inpatient-daily-charge-transaction-bill',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.daily-charges.bill');
});

test('handleInpatientRoutes keeps billed daily-charge replays inside the tenant command seam', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const addBillingItem = test.mock.fn(async () => ({
    id: 'billitem_replay_transaction_1',
    billingRecordId: 'bill_inpatient_replay_transaction_1',
    accountId: 'acc_cvg_demo',
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    totalAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: 'charge_replay_transaction',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString()
  }));
  const createResponse = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria UTI',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-daily-charge-replay-create',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const charge = createResponse.bodyJson<{ id: string }>();
  let commandCalls = 0;
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    commandCalls += 1;
    return input.command();
  };
  const request = () =>
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      body: {}
    });

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    request() as never,
    new MockResponse() as never,
    'corr-inpatient-daily-charge-replay-first',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );
  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    request() as never,
    new MockResponse() as never,
    'corr-inpatient-daily-charge-replay-second',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: runCommand as never
    }
  );

  assert.equal(commandCalls, 2);
  assert.equal(addBillingItem.mock.callCount(), 1);
});

test('handleInpatientRoutes refreshes hot caches after a rolled-back daily-charge command', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const addBillingItem = test.mock.fn(async () => ({
    id: 'billitem_rollback_1',
    billingRecordId: 'bill_inpatient_rollback_1',
    accountId: 'acc_cvg_demo',
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    totalAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: 'charge_rollback',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString()
  }));
  const refreshBilling = test.mock.fn(async () => {});
  const refreshInpatient = test.mock.fn(async () => {});
  const refreshAudit = test.mock.fn(async () => {});
  inpatient.refreshAccount = refreshInpatient as never;
  const createResponse = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria UTI',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-daily-charge-rollback-create',
    {
      inpatient,
      billing: { addItem: addBillingItem, refreshFromDatabase: refreshBilling } as never,
      sectorBedService: {} as never,
      audit: { write: () => {}, refreshFromDatabase: refreshAudit } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const charge = createResponse.bodyJson<{ id: string }>();
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after daily-charge command');
  };

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
        body: {}
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-daily-charge-rollback-bill',
      {
        inpatient,
        billing: { addItem: addBillingItem, refreshFromDatabase: refreshBilling } as never,
        sectorBedService: {} as never,
        audit: { write: () => {}, refreshFromDatabase: refreshAudit } as never,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after daily-charge command/
  );

  assert.equal(refreshBilling.mock.callCount(), 1);
  // The command refreshes before resolving a cross-instance retry and again
  // after the injected failure to remove speculative cache state.
  assert.equal(refreshInpatient.mock.callCount(), 2);
  assert.equal(refreshAudit.mock.callCount(), 1);
});

test('handleInpatientRoutes removes a rolled-back audit event from the real cache', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const audit = new AuditService({
    auditRepository: {
      async create(): Promise<void> {},
      async list(): Promise<readonly never[]> {
        return [];
      },
      async findById(): Promise<null> {
        return null;
      }
    }
  });
  const createResponse = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria audit rollback',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    createResponse as never,
    'corr-inpatient-audit-cache-create',
    {
      inpatient,
      billing: { addItem: async () => ({}) } as never,
      sectorBedService: {} as never,
      audit,
      requirePrincipal: () => createPrincipal()
    }
  );

  const charge = createResponse.bodyJson<{ id: string }>();
  const runCommand = async <T>(input: { readonly command: () => Promise<T> }): Promise<T> => {
    await input.command();
    throw new Error('injected failure after daily-charge audit');
  };

  await assert.rejects(
    handleInpatientRoutes(
      `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      new MockRequest({
        method: 'POST',
        url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
        body: {}
      }) as never,
      new MockResponse() as never,
      'corr-inpatient-audit-cache-rollback',
      {
        inpatient,
        billing: {
          addItem: async () => ({
            id: 'billitem_audit_rollback',
            billingRecordId: 'bill_audit_rollback'
          })
        } as never,
        sectorBedService: {} as never,
        audit,
        requirePrincipal: () => createPrincipal(),
        runCommand: runCommand as never
      }
    ),
    /injected failure after daily-charge audit/
  );

  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(
    audit
      .list()
      .some((event) => event.action === 'bill_daily_charge' && event.entityId === charge.id),
    false
  );
});

test('handleInpatientRoutes treats a repeated daily-charge billing request as idempotent', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const addBillingItem = test.mock.fn(async () => ({
    id: 'billitem_idempotent_1',
    billingRecordId: 'bill_inpatient_idempotent',
    accountId: 'acc_cvg_demo',
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    totalAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: 'charge_idempotent',
    createdByUserId: 'user-1',
    createdAt: new Date().toISOString()
  }));
  const createdResponse = new MockResponse();

  await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges`,
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges`,
      body: {
        description: 'Diaria UTI',
        chargeDate: '2026-05-28',
        quantity: 1,
        unitAmount: 180
      }
    }) as never,
    createdResponse as never,
    'corr-inpatient-daily-charge-idempotent-create',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const charge = createdResponse.bodyJson<{ id: string }>();
  const request = () =>
    new MockRequest({
      method: 'POST',
      url: `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
      body: {}
    });
  const firstResponse = new MockResponse();
  const firstHandled = await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    request() as never,
    firstResponse as never,
    'corr-inpatient-daily-charge-idempotent-first',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  const secondResponse = new MockResponse();
  const secondHandled = await handleInpatientRoutes(
    `/inpatient/${stay.id}/daily-charges/${charge.id}/bill`,
    request() as never,
    secondResponse as never,
    'corr-inpatient-daily-charge-idempotent-replay',
    {
      inpatient,
      billing: { addItem: addBillingItem } as never,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(firstHandled, true);
  assert.equal(secondHandled, true);
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  assert.deepEqual(secondResponse.bodyJson(), firstResponse.bodyJson());
  assert.equal(addBillingItem.mock.callCount(), 1);
});

test('handleInpatientRoutes lists inpatient daily charge worklist with totals', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  inpatient.createDailyCharge(
    'user-1' as never,
    {
      stayId: stay.id,
      description: 'Diaria UTI',
      chargeDate: '2026-05-28',
      quantity: 2,
      unitAmount: 180
    },
    stay.accountId
  );
  const response = new MockResponse();

  const handled = await handleInpatientRoutes(
    '/inpatient/daily-charges/worklist',
    new MockRequest({
      method: 'GET',
      url: '/inpatient/daily-charges/worklist?status=pending&ward=Ala%20A'
    }) as never,
    response as never,
    'corr-inpatient-daily-charge-worklist',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    totalPendingAmount: number;
    items: Array<{ ward: string; bed: string; status: string; totalAmount: number }>;
  }>();
  assert.equal(payload.totalPendingAmount, 360);
  assert.equal(payload.items[0]?.ward, 'Ala A');
  assert.equal(payload.items[0]?.bed, 'B12');
  assert.equal(payload.items[0]?.status, 'pending');
});

test('handleInpatientRoutes appends inpatient discharge to clinical record timeline', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  let callbackCompleted = false;
  const onStatusUpdated = test.mock.fn(
    async (_event: {
      readonly stay: InpatientStaySummary;
      readonly previousStatus: InpatientStaySummary['status'];
      readonly principal: AuthenticatedPrincipal;
    }) => {
      await Promise.resolve();
      callbackCompleted = true;
    }
  );
  let commandCalls = 0;
  let operation = '';
  const runCommand = async <T>(input: {
    readonly operation: string;
    readonly command: () => Promise<T>;
  }): Promise<T> => {
    commandCalls += 1;
    operation = input.operation;
    return input.command();
  };

  const handled = await handleInpatientRoutes(
    `/inpatient/${stay.id}/update-status`,
    new MockRequest({
      method: 'PATCH',
      url: `/inpatient/${stay.id}/update-status`,
      body: { status: 'discharged', dischargeReason: 'Alta clinica' }
    }) as never,
    response as never,
    'corr-inpatient-discharge',
    {
      inpatient,
      sectorBedService: {} as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal(),
      onStatusUpdated,
      runCommand: runCommand as never
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(commandCalls, 1);
  assert.equal(operation, 'inpatient.status.update');
  assert.equal(onStatusUpdated.mock.callCount(), 1);
  assert.equal(callbackCompleted, true);
  assert.equal(onStatusUpdated.mock.calls[0]?.arguments[0].previousStatus, 'admitted');
  assert.equal(onStatusUpdated.mock.calls[0]?.arguments[0].stay.status, 'discharged');
});

test('handleInpatientRoutes lists beds with Vetus-like filters', async () => {
  const response = new MockResponse();
  const listBeds = test.mock.fn(async () => [
    {
      id: 'bed-1',
      accountId: 'acc_cvg_demo',
      sectorId: 'sector-1',
      code: 'B01',
      name: 'Box 01',
      status: 'available',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bed-2',
      accountId: 'acc_cvg_demo',
      sectorId: 'sector-1',
      code: 'B02',
      name: 'Isolamento',
      status: 'blocked',
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);

  const handled = await handleInpatientRoutes(
    '/beds',
    new MockRequest({
      method: 'GET',
      url: '/beds?code=B01&description=Box&active=true'
    }) as never,
    response as never,
    'corr-beds-list',
    {
      inpatient: createInpatientService(),
      sectorBedService: { listBeds } as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ id: string }> }>();
  assert.deepEqual(
    payload.items.map((item) => item.id),
    ['bed-1']
  );
});

test('handleInpatientRoutes does not disclose a foreign sector-filtered bed list', async () => {
  const sectorBedService = new SectorBedService();
  const accountB = 'acc_foreign_b' as never;
  const sectorB = await sectorBedService.createSector(accountB, {
    code: 'FOREIGN',
    name: 'Setor estrangeiro',
    kind: 'observation'
  });
  await sectorBedService.createBed(accountB, {
    sectorId: sectorB.id,
    code: 'B-01',
    name: 'Leito estrangeiro'
  });
  const response = new MockResponse();

  const handled = await handleInpatientRoutes(
    '/beds',
    new MockRequest({
      method: 'GET',
      url: `/beds?sectorId=${encodeURIComponent(sectorB.id)}`
    }) as never,
    response as never,
    'corr-beds-cross-account-sector',
    {
      inpatient: createInpatientService(),
      sectorBedService,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal('acc_foreign_a')
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(response.bodyJson<{ items: unknown[] }>().items, []);
});
