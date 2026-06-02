import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { PrescriptionsService, InMemoryPrescriptionRepository } from '@cvg-his-v2/module-prescriptions';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handlePrescriptionRoutes } from './prescription-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly #headers = new Map<string, string>();

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
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

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
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
      accountId: 'acc-1' as never,
      username: 'medico',
      email: 'medico@example.com',
      displayName: 'Médico',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['doctor'],
      permissionCodes: ['prescriptions.read', 'prescriptions.write'],
      capabilities: []
    }
  };
}

function createPrescriptionsService(): PrescriptionsService {
  const repo = new InMemoryPrescriptionRepository();
  return new PrescriptionsService({ prescriptionRepository: repo });
}

function createMockRequest(method: string, url: string, body?: object): object {
  const bodyStr = body ? JSON.stringify(body) : '';
  const chunks: Buffer[] = bodyStr ? [Buffer.from(bodyStr)] : [];

  return {
    method,
    url,
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (chunks.length === 0) {
          return { done: true, value: undefined };
        }
        return { done: false, value: chunks.shift()! };
      }
    })
  };
}

test('handlePrescriptionRoutes creates a prescription', async () => {
  const response = new MockResponse();
  const service = createPrescriptionsService();

  const createPayload = {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'Oral',
    frequency: '8/8h'
  };

  const handled = await handlePrescriptionRoutes(
    '/prescriptions',
    createMockRequest('POST', '/prescriptions', createPayload) as never,
    response as never,
    'corr-rx-1',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const result = response.bodyJson<{ medicationName: string; entryType: string }>();
  assert.equal(result.entryType, 'prescription');
  assert.equal(result.medicationName, 'Amoxicilina');
});

test('handlePrescriptionRoutes gets a prescription by id', async () => {
  const service = createPrescriptionsService();

  // First create a prescription
  const created = service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Dipirona'
  });

  const response = new MockResponse();

  const handled = await handlePrescriptionRoutes(
    `/prescriptions/${created.id}`,
    { method: 'GET', url: `/prescriptions/${created.id}` } as never,
    response as never,
    'corr-rx-2',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const result = response.bodyJson<{ medicationName: string }>();
  assert.equal(result.medicationName, 'Dipirona');
});

test('handlePrescriptionRoutes lists prescriptions', async () => {
  const service = createPrescriptionsService();

  // Create a couple of prescriptions
  service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Amoxicilina'
  });
  service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Dipirona'
  });

  const response = new MockResponse();

  const handled = await handlePrescriptionRoutes(
    '/prescriptions',
    { method: 'GET', url: '/prescriptions' } as never,
    response as never,
    'corr-rx-3',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const result = response.bodyJson<{ items: Array<{ medicationName: string }> }>();
  assert.ok(result.items.length >= 2);
});

test('handlePrescriptionRoutes updates a prescription', async () => {
  const service = createPrescriptionsService();

  // First create a prescription
  const created = service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Amoxicilina'
  });

  const response = new MockResponse();

  const handled = await handlePrescriptionRoutes(
    `/prescriptions/${created.id}`,
    createMockRequest('PATCH', `/prescriptions/${created.id}`, {
      title: 'Amoxicilina 500mg',
      reason: 'Ajuste de apresentacao'
    }) as never,
    response as never,
    'corr-rx-4',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const result = response.bodyJson<{ medicationName: string }>();
  assert.equal(result.medicationName, 'Amoxicilina 500mg');
});

test('handlePrescriptionRoutes renders a printable prescription document', async () => {
  const service = createPrescriptionsService();
  const created = service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'Oral',
    frequency: '8/8h'
  });
  const response = new MockResponse();

  const handled = await handlePrescriptionRoutes(
    `/prescriptions/${created.id}/document`,
    createMockRequest('POST', `/prescriptions/${created.id}/document`, {
      clinic: { name: 'CVG Hospital Veterinario' },
      owner: { name: 'Maria Silva' },
      patient: { name: 'Luna', species: 'Canina' },
      professional: { name: 'Dra. Ana Vet', license: 'CRMV-SP 12345' }
    }) as never,
    response as never,
    'corr-rx-doc',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const result = response.bodyJson<{ title: string; printText: string }>();
  assert.equal(result.title, 'Receita Veterinaria');
  assert.match(result.printText, /Amoxicilina/);
});

test('handlePrescriptionRoutes archives a prescription', async () => {
  const service = createPrescriptionsService();

  // First create a prescription
  const created = service.create('acc-1' as never, 'user-1' as never, {
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    medicationName: 'Amoxicilina'
  });

  const response = new MockResponse();

  const handled = await handlePrescriptionRoutes(
    `/prescriptions/${created.id}`,
    createMockRequest('DELETE', `/prescriptions/${created.id}`, { reason: 'Duplicated' }) as never,
    response as never,
    'corr-rx-5',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const result = response.bodyJson<{ deletedAt: string; deleteReason: string }>();
  assert.ok(result.deletedAt !== undefined);
  assert.equal(result.deleteReason, 'Duplicated');
});

test('handlePrescriptionRoutes returns false for non-prescription paths', async () => {
  const response = new MockResponse();
  const service = createPrescriptionsService();

  const handled = await handlePrescriptionRoutes(
    '/other/path',
    { method: 'GET', url: '/other/path' } as never,
    response as never,
    'corr-rx-6',
    {
      prescriptions: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, false);
});
