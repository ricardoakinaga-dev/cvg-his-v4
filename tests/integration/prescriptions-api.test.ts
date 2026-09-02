import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import {
  InMemoryPrescriptionRepository,
  PrescriptionsService
} from '@cvg-his-v2/module-prescriptions';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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

function createPrincipal(accountId = 'acc-1'): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: accountId as never,
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
      accountId: accountId as never,
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

function createHandlers(service: PrescriptionsService, accountId = 'acc-1') {
  return {
    prescriptions: service,
    audit: { write: () => ({}) } as never,
    requirePrincipal: () => createPrincipal(accountId)
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

    const created = response.bodyJson<{
      id: string;
      medicalRecordId: string;
      medicationName: string;
    }>();
    const persisted = await repository.findById(created.id as never, 'acc-1' as never);

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

    const result = response.bodyJson<{
      items: Array<{ encounterId: string; medicationName: string }>;
    }>();

    expect(handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      encounterId: 'enc-1',
      medicationName: 'Amoxicilina'
    });
  });

  it('does not list another account prescription when filtering by shared encounter or patient identifiers', async () => {
    const repository = new InMemoryPrescriptionRepository();
    const service = new PrescriptionsService({
      prescriptionRepository: repository
    });

    service.create('acc-1' as never, 'user-1' as never, {
      medicalRecordId: 'mr-1',
      encounterId: 'shared-encounter',
      patientId: 'shared-patient',
      medicationName: 'Dipirona'
    });
    service.create('acc-2' as never, 'user-2' as never, {
      medicalRecordId: 'mr-2',
      encounterId: 'shared-encounter',
      patientId: 'shared-patient',
      medicationName: 'Prednisona'
    });
    await service.waitForPersistence();

    const hydratedService = new PrescriptionsService({ prescriptionRepository: repository });
    await hydratedService.hydrateFromDatabase('acc-1' as never);
    await hydratedService.hydrateFromDatabase('acc-2' as never);

    const encounterResponse = new MockResponse();
    const encounterHandled = await handlePrescriptionRoutes(
      '/prescriptions',
      { method: 'GET', url: '/prescriptions?encounterId=shared-encounter' } as never,
      encounterResponse as never,
      'corr-rx-tenant-encounter',
      createHandlers(hydratedService, 'acc-1')
    );
    const encounterResult = encounterResponse.bodyJson<{
      items: Array<{ accountId: string; medicationName: string }>;
    }>();

    const patientResponse = new MockResponse();
    const patientHandled = await handlePrescriptionRoutes(
      '/prescriptions',
      { method: 'GET', url: '/prescriptions?patientId=shared-patient' } as never,
      patientResponse as never,
      'corr-rx-tenant-patient',
      createHandlers(hydratedService, 'acc-1')
    );
    const patientResult = patientResponse.bodyJson<{
      items: Array<{ accountId: string; medicationName: string }>;
    }>();

    expect(encounterHandled).toBe(true);
    expect(patientHandled).toBe(true);
    expect(encounterResult.items).toHaveLength(1);
    expect(encounterResult.items[0]).toMatchObject({
      accountId: 'acc-1',
      medicationName: 'Dipirona'
    });
    expect(patientResult.items).toHaveLength(1);
    expect(patientResult.items[0]).toMatchObject({
      accountId: 'acc-1',
      medicationName: 'Dipirona'
    });
  });

  it('rejects an empty collection filter instead of broadening to the account list', async () => {
    const service = new PrescriptionsService({
      prescriptionRepository: new InMemoryPrescriptionRepository()
    });

    await expect(
      handlePrescriptionRoutes(
        '/prescriptions',
        { method: 'GET', url: '/prescriptions?encounterId=' } as never,
        new MockResponse() as never,
        'corr-rx-empty-encounter',
        createHandlers(service)
      )
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      handlePrescriptionRoutes(
        '/prescriptions',
        { method: 'GET', url: '/prescriptions?patientId=' } as never,
        new MockResponse() as never,
        'corr-rx-empty-patient',
        createHandlers(service)
      )
    ).rejects.toBeInstanceOf(ValidationError);
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

  it('rejects foreign detail, document, revision and command routes without mutation', async () => {
    const repository = new InMemoryPrescriptionRepository();
    const service = new PrescriptionsService({ prescriptionRepository: repository });
    const foreign = service.create('acc-2' as never, 'user-2' as never, {
      medicalRecordId: 'mr-2',
      encounterId: 'enc-2',
      patientId: 'pat-2',
      medicationName: 'Prednisona'
    });
    await service.waitForPersistence();
    const before = service.getById('acc-2' as never, foreign.id);
    const beforeRevisions = service.getRevisions('acc-2' as never, foreign.id);

    const requests: Array<{ pathname: string; request: object }> = [
      {
        pathname: `/prescriptions/${foreign.id}`,
        request: { method: 'GET', url: `/prescriptions/${foreign.id}` }
      },
      {
        pathname: `/prescriptions/${foreign.id}/document`,
        request: createMockRequest('POST', `/prescriptions/${foreign.id}/document`, {
          clinic: { name: 'CVG' },
          owner: { name: 'Maria' },
          patient: { name: 'Luna' },
          professional: { name: 'Dra. Ana' }
        })
      },
      {
        pathname: `/prescriptions/${foreign.id}/revisions`,
        request: { method: 'GET', url: `/prescriptions/${foreign.id}/revisions` }
      },
      {
        pathname: `/prescriptions/${foreign.id}/sign`,
        request: createMockRequest('POST', `/prescriptions/${foreign.id}/sign`, {
          expectedVersion: 1
        })
      },
      {
        pathname: `/prescriptions/${foreign.id}`,
        request: createMockRequest('PATCH', `/prescriptions/${foreign.id}`, {
          title: 'Alteracao cruzada',
          reason: 'nao autorizado'
        })
      },
      {
        pathname: `/prescriptions/${foreign.id}`,
        request: createMockRequest('DELETE', `/prescriptions/${foreign.id}`, {
          reason: 'nao autorizado'
        })
      }
    ];

    for (const { pathname, request } of requests) {
      await expect(
        handlePrescriptionRoutes(
          pathname,
          request as never,
          new MockResponse() as never,
          `corr-rx-foreign-${pathname}`,
          createHandlers(service, 'acc-1')
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    }

    expect(service.getById('acc-2' as never, foreign.id)).toEqual(before);
    expect(service.getRevisions('acc-2' as never, foreign.id)).toEqual(beforeRevisions);
    await service.waitForPersistence();
    expect(await repository.findById(foreign.id, 'acc-2' as never)).toEqual(before);
  });
});
