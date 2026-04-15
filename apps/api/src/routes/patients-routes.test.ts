import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handlePatientsRoutes } from './patients-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
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
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['patients.read', 'patients.manage'],
      capabilities: []
    }
  };
}

function createPatientsService(): PatientsService {
  return new PatientsService({
    owners: new OwnersService()
  });
}

test('handlePatientsRoutes GET /master-search returns cross-registry results', async () => {
  const response = new MockResponse();

  const handled = await handlePatientsRoutes(
    '/master-search',
    new MockRequest({
      method: 'GET',
      url: '/master-search?q=luna'
    }) as never,
    response as never,
    'corr-patients-1',
    {
      patients: createPatientsService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ patients: Array<{ id: string }> }>();
  assert.equal(payload.patients[0]?.id, 'patient_luna');
});

test('handlePatientsRoutes GET /owner-patient-links filters links by owner', async () => {
  const response = new MockResponse();

  const handled = await handlePatientsRoutes(
    '/owner-patient-links',
    new MockRequest({
      method: 'GET',
      url: '/owner-patient-links?ownerId=owner_maria_silva'
    }) as never,
    response as never,
    'corr-patients-2',
    {
      patients: createPatientsService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ ownerId: string; patientId: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0]?.ownerId, 'owner_maria_silva');
  assert.equal(payload.items[0]?.patientId, 'patient_luna');
});

test('handlePatientsRoutes POST /owner-patient-links creates a new relationship', async () => {
  const response = new MockResponse();
  const patients = createPatientsService();

  const handled = await handlePatientsRoutes(
    '/owner-patient-links',
    new MockRequest({
      method: 'POST',
      url: '/owner-patient-links',
      body: {
        ownerId: 'owner_joao_souza',
        patientId: 'patient_luna',
        relationshipType: 'secondary',
        financialResponsible: false
      }
    }) as never,
    response as never,
    'corr-patients-3',
    {
      patients,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const payload = response.bodyJson<{ id: string; ownerId: string; patientId: string }>();
  assert.equal(payload.ownerId, 'owner_joao_souza');
  assert.equal(payload.patientId, 'patient_luna');
  assert.equal(patients.listLinks({ patientId: 'patient_luna' as never }).length, 2);
});
