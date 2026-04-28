import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import {
  handleVetusImportRoutes,
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
