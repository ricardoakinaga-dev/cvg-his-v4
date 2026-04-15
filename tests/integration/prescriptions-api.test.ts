import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import {
  InMemoryPrescriptionRepository,
  PrescriptionsService
} from '@cvg-his-v2/module-prescriptions';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handlePrescriptionRoutes } from '../../apps/api/src/routes/prescription-routes.js';

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
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'medico',
      email: 'medico@example.com',
      displayName: 'Medico',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: now,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: now,
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

function createHandlers(service: PrescriptionsService) {
  return {
    prescriptions: service,
    audit: { write: () => ({}) } as never,
    requirePrincipal: () => createPrincipal()
  };
}

describe('Prescriptions API integration', () => {
  it('creates a prescription through the route and persists medicalRecordId', async () => {
    const repository = new InMemoryPrescriptionRepository();
    const service = new PrescriptionsService({ prescriptionRepository: repository });
    const response = new MockResponse();

    const handled = await handlePrescriptionRoutes(
      '/prescriptions',
      createMockRequest('POST', '/prescriptions', {
        medicalRecordId: 'mr-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        medicationName: 'Amoxicilina',
        dosage: '500mg'
      }) as never,
      response as never,
      'corr-rx-vitest-1',
      createHandlers(service)
    );

    await service.waitForPersistence();

    const created = response.bodyJson<{ id: string; medicalRecordId: string; medicationName: string }>();
    const persisted = await repository.findById(created.id as never);

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(201);
    expect(created.medicalRecordId).toBe('mr-1');
    expect(created.medicationName).toBe('Amoxicilina');
    expect(persisted?.medicalRecordId).toBe('mr-1');
  });

  it('filters listed prescriptions by encounter', async () => {
    const service = new PrescriptionsService({
      prescriptionRepository: new InMemoryPrescriptionRepository()
    });

    service.create('acc-1' as never, 'user-1' as never, {
      medicalRecordId: 'mr-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      medicationName: 'Amoxicilina'
    });
    service.create('acc-1' as never, 'user-1' as never, {
      medicalRecordId: 'mr-2',
      encounterId: 'enc-2',
      patientId: 'pat-1',
      medicationName: 'Dipirona'
    });

    const response = new MockResponse();
    const handled = await handlePrescriptionRoutes(
      '/prescriptions',
      { method: 'GET', url: '/prescriptions?encounterId=enc-1' } as never,
      response as never,
      'corr-rx-vitest-2',
      createHandlers(service)
    );

    const result = response.bodyJson<{ items: Array<{ encounterId: string; medicationName: string }> }>();

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina'
    });
  });

  it('rejects create requests without medicalRecordId', async () => {
    const service = new PrescriptionsService({
      prescriptionRepository: new InMemoryPrescriptionRepository()
    });
    const response = new MockResponse();

    await expect(
      handlePrescriptionRoutes(
        '/prescriptions',
        createMockRequest('POST', '/prescriptions', {
          encounterId: 'enc-1',
          patientId: 'pat-1',
          medicationName: 'Amoxicilina'
        }) as never,
        response as never,
        'corr-rx-vitest-3',
        createHandlers(service)
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
