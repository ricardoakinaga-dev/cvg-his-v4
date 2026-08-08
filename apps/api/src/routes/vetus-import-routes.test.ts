import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { InMemoryVetusImportLogRepository } from '../repositories/vetus-import-log-repository.js';
import {
  handleVetusImportRoutes,
  type VetusImportBatchItemSummary,
  type VetusImportBatchSummary,
  type VetusImportSummary
} from './vetus-import-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string> = {};
  readonly #body: Buffer;
  #sent = false;

  constructor(input: { method: string; url: string; body?: Record<string, unknown> }) {
    super();
    this.method = input.method;
    this.url = input.url;
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

function createPrincipal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['patients.read', 'patients.manage', 'owners.manage'],
      capabilities: []
    }
  };
}

function createHandlers() {
  const owners = new OwnersService({ seedOwners: [] });
  const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
  const importLogStore = new Map<string, VetusImportSummary>();

  return {
    owners,
    patients,
    audit: { write: () => {} } as never,
    importLogStore,
    requirePrincipal: () => createPrincipal()
  };
}

function createBatchHandlers() {
  const owners = new OwnersService({ seedOwners: [] });
  const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
  const importLogStore = new InMemoryVetusImportLogRepository();

  return {
    owners,
    patients,
    audit: { write: () => {} } as never,
    importLogStore,
    importBatchStore: importLogStore,
    requirePrincipal: () => createPrincipal()
  };
}

test('handleVetusImportRoutes imports a Vetus owner and patient with traceability', async () => {
  const handlers = createHandlers();
  const response = new MockResponse();

  const handled = await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({
      method: 'POST',
      url: '/vetus-imports',
      body: {
        sourceSystem: 'Vetus',
        sourceReference: 'planilha-animais-abril',
        reviewedBy: 'Maria Recepcao',
        owner: {
          legacyVetusId: '3835',
          fullName: 'Maria Silva',
          phone: '(11) 99999-1111',
          email: 'maria@example.com',
          originalCreatedAt: '2020-01-10'
        },
        patient: {
          legacyVetusId: '10115',
          name: 'Luna',
          species: 'Canina',
          breed: 'SRD',
          sex: 'female',
          baseWeightKg: 12.4,
          generalNotes: 'Historico importado do Vetus'
        }
      }
    }) as never,
    response as never,
    'corr-vetus-import',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const payload = response.bodyJson<VetusImportSummary>();
  assert.equal(payload.sourceSystem, 'Vetus');
  assert.equal(payload.sourceReference, 'planilha-animais-abril');
  assert.equal(payload.reviewedBy, 'Maria Recepcao');
  assert.equal(payload.ownerName, 'Maria Silva');
  assert.equal(payload.patientName, 'Luna');
  assert.equal(payload.importedByUserId, 'user-1');
  assert.equal(handlers.importLogStore.size, 1);

  const owner = handlers.owners.getOrThrow(payload.ownerId as never);
  const patient = handlers.patients.getOrThrow(payload.patientId as never);
  assert.equal(owner.legacyVetusId, '3835');
  assert.equal(patient.legacyVetusId, '10115');
  assert.match(patient.generalNotes ?? '', /Importacao assistida Vetus/);
});

test('handleVetusImportRoutes lists assisted imports for audit review', async () => {
  const handlers = createHandlers();

  await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({
      method: 'POST',
      url: '/vetus-imports',
      body: {
        owner: { legacyVetusId: '1', fullName: 'Joao Souza', phone: '(11) 98888-0000' },
        patient: { legacyVetusId: '2', name: 'Rex', species: 'Canina' }
      }
    }) as never,
    new MockResponse() as never,
    'corr-vetus-import-create',
    handlers
  );

  const response = new MockResponse();
  const handled = await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({ method: 'GET', url: '/vetus-imports' }) as never,
    response as never,
    'corr-vetus-import-list',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: VetusImportSummary[] }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0]?.ownerName, 'Joao Souza');
  assert.equal(payload.items[0]?.patientName, 'Rex');
});

test('handleVetusImportRoutes links repeated Vetus IDs instead of duplicating records', async () => {
  const handlers = createHandlers();
  const body = {
    owner: { legacyVetusId: '3835', fullName: 'Maria Silva', phone: '(11) 99999-1111' },
    patient: { legacyVetusId: '10115', name: 'Luna', species: 'Canina' }
  };

  const firstResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({ method: 'POST', url: '/vetus-imports', body }) as never,
    firstResponse as never,
    'corr-vetus-import-first',
    handlers
  );

  const secondResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({ method: 'POST', url: '/vetus-imports', body }) as never,
    secondResponse as never,
    'corr-vetus-import-second',
    handlers
  );

  const first = firstResponse.bodyJson<VetusImportSummary>();
  const second = secondResponse.bodyJson<VetusImportSummary>();
  assert.equal(second.status, 'linked');
  assert.equal(second.ownerId, first.ownerId);
  assert.equal(second.patientId, first.patientId);
  assert.equal(handlers.owners.list().length, 1);
  assert.equal(handlers.patients.list().length, 1);
});

test('handleVetusImportRoutes replays the same source reference idempotently', async () => {
  const handlers = createHandlers();
  const body = {
    sourceSystem: 'Vetus',
    sourceReference: 'batch-2026-08-07-001',
    owner: { legacyVetusId: 'owner-1', fullName: 'Referencia Unica', phone: '(11) 90000-0000' },
    patient: { legacyVetusId: 'patient-1', name: 'Referencia', species: 'Canina' }
  };

  const firstResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({ method: 'POST', url: '/vetus-imports', body }) as never,
    firstResponse as never,
    'corr-vetus-idempotent-first',
    handlers
  );

  const secondResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-imports',
    new MockRequest({ method: 'POST', url: '/vetus-imports', body }) as never,
    secondResponse as never,
    'corr-vetus-idempotent-second',
    handlers
  );

  const first = firstResponse.bodyJson<VetusImportSummary>();
  const second = secondResponse.bodyJson<VetusImportSummary>();
  assert.equal(first.id, second.id);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(handlers.importLogStore.size, 1);
  assert.equal(handlers.owners.list().length, 1);
  assert.equal(handlers.patients.list().length, 1);
});

test('handleVetusImportRoutes validates Vetus batches without creating records during dry-run', async () => {
  const handlers = createBatchHandlers();
  const response = new MockResponse();
  const handled = await handleVetusImportRoutes(
    '/vetus-import-batches',
    new MockRequest({
      method: 'POST',
      url: '/vetus-import-batches',
      body: {
        sourceSystem: 'Vetus',
        sourceReference: 'dry-run-001',
        dryRun: true,
        items: [
          {
            owner: { fullName: 'Ana Dry Run', phone: '(11) 90000-0001' },
            patient: { name: 'Bidu', species: 'Canina' }
          },
          {
            owner: { fullName: 'Sem Contato' },
            patient: { name: 'Falha', species: 'Felina' }
          }
        ]
      }
    }) as never,
    response as never,
    'corr-vetus-batch-dry-run',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const payload = response.bodyJson<{
    batch: VetusImportBatchSummary;
    items: VetusImportBatchItemSummary[];
  }>();
  assert.equal(payload.batch.status, 'dry_run');
  assert.equal(payload.batch.totalCount, 2);
  assert.equal(payload.batch.importedCount, 1);
  assert.equal(payload.batch.rejectedCount, 1);
  assert.deepEqual(payload.items.map((item) => item.status), ['validated', 'rejected']);
  assert.equal(handlers.owners.list().length, 0);
  assert.equal(handlers.patients.list().length, 0);
});

test('handleVetusImportRoutes replays a batch by source reference without duplicating it', async () => {
  const handlers = createBatchHandlers();
  const body = {
    sourceSystem: 'Vetus',
    sourceReference: 'arquivo-vetus-001',
    items: [{
      owner: { fullName: 'Arquivo Unico', phone: '(11) 90000-0003' },
      patient: { name: 'Paciente Unico', species: 'Felina' }
    }]
  };

  const firstResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-import-batches',
    new MockRequest({ method: 'POST', url: '/vetus-import-batches', body }) as never,
    firstResponse as never,
    'corr-vetus-batch-idempotent-first',
    handlers
  );
  const first = firstResponse.bodyJson<{ batch: VetusImportBatchSummary }>();

  const secondResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-import-batches',
    new MockRequest({ method: 'POST', url: '/vetus-import-batches', body }) as never,
    secondResponse as never,
    'corr-vetus-batch-idempotent-second',
    handlers
  );
  const second = secondResponse.bodyJson<{ batch: VetusImportBatchSummary }>();

  assert.equal(secondResponse.statusCode, 200);
  assert.equal(second.batch.id, first.batch.id);
  assert.equal(handlers.owners.list().length, 1);
  assert.equal(handlers.patients.list().length, 1);
});

test('handleVetusImportRoutes resumes rejected Vetus rows and rolls back created records', async () => {
  const handlers = createBatchHandlers();
  const firstResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-import-batches',
    new MockRequest({
      method: 'POST',
      url: '/vetus-import-batches',
      body: {
        sourceSystem: 'Vetus',
        items: [{
          owner: { fullName: 'Operacao Vetus', phone: '' },
          patient: { name: 'Paciente Vetus', species: 'Canina' }
        }]
      }
    }) as never,
    firstResponse as never,
    'corr-vetus-batch-partial',
    handlers
  );

  const partial = firstResponse.bodyJson<{ batch: VetusImportBatchSummary }>();
  assert.equal(partial.batch.status, 'partial');
  assert.equal(partial.batch.rejectedCount, 1);

  const resumeResponse = new MockResponse();
  await handleVetusImportRoutes(
    '/vetus-import-batches',
    new MockRequest({
      method: 'POST',
      url: '/vetus-import-batches',
      body: {
        resumeBatchId: partial.batch.id,
        items: [{
          owner: { fullName: 'Operacao Vetus', phone: '(11) 90000-0002' },
          patient: { name: 'Paciente Vetus', species: 'Canina' }
        }]
      }
    }) as never,
    resumeResponse as never,
    'corr-vetus-batch-resume',
    handlers
  );

  const completed = resumeResponse.bodyJson<{
    batch: VetusImportBatchSummary;
    items: VetusImportBatchItemSummary[];
  }>();
  assert.equal(resumeResponse.statusCode, 200);
  assert.equal(completed.batch.status, 'completed');
  assert.equal(completed.batch.importedCount, 1);
  assert.equal(completed.batch.rejectedCount, 0);
  assert.equal(completed.items[0]?.status, 'imported');
  assert.equal(handlers.owners.list().length, 1);
  assert.equal(handlers.patients.list().length, 1);

  const rollbackResponse = new MockResponse();
  await handleVetusImportRoutes(
    `/vetus-import-batches/${completed.batch.id}/rollback`,
    new MockRequest({
      method: 'POST',
      url: `/vetus-import-batches/${completed.batch.id}/rollback`
    }) as never,
    rollbackResponse as never,
    'corr-vetus-batch-rollback',
    handlers
  );

  const rolledBack = rollbackResponse.bodyJson<{
    batch: VetusImportBatchSummary;
    items: VetusImportBatchItemSummary[];
  }>();
  assert.equal(rollbackResponse.statusCode, 200);
  assert.equal(rolledBack.batch.status, 'rolled_back');
  assert.equal(rolledBack.items[0]?.status, 'rolled_back');
  assert.equal(handlers.owners.list()[0]?.status, 'inactive');
  assert.equal(handlers.patients.list()[0]?.status, 'inactive');
});
