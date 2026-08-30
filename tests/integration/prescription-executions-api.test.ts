import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { PrescriptionExecutionsService } from '@cvg-his-v2/module-prescription-executions';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handlePrescriptionExecutionsRoutes } from '../../apps/api/src/routes/prescription-executions-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.from(chunk));
    callback();
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(accountId = 'acc-1'): AuthenticatedPrincipal {
  return {
    user: { id: 'user-1', accountId },
    access: { roleCodes: ['doctor'], permissionCodes: [], capabilities: [] }
  } as never;
}

function createHandlers(service: PrescriptionExecutionsService, accountId = 'acc-1') {
  return {
    prescriptionExecutions: service,
    audit: { write: () => undefined } as never,
    requirePrincipal: () => createPrincipal(accountId)
  };
}

function createExecution(
  service: PrescriptionExecutionsService,
  accountId: string,
  medicationName: string
) {
  return service.create(accountId as never, {
    clinicalEntryId: 'entry-shared',
    patientId: '00000000-0000-4000-8000-000000000001',
    encounterId: '00000000-0000-4000-8000-000000000002',
    medicationName,
    dosage: '500mg',
    scheduledAt: '2026-08-26T12:00:00.000Z'
  });
}

describe('Prescription executions API integration', () => {
  it('does not list another account execution for shared encounter or patient identifiers', async () => {
    const service = new PrescriptionExecutionsService();
    createExecution(service, 'acc-1', 'Dipirona');
    createExecution(service, 'acc-2', 'Prednisona');

    const encounterResponse = new MockResponse();
    await handlePrescriptionExecutionsRoutes(
      '/prescription-executions',
      {
        method: 'GET',
        url: '/prescription-executions?encounterId=00000000-0000-4000-8000-000000000002'
      } as never,
      encounterResponse as never,
      'corr-prescription-executions-tenant-encounter',
      createHandlers(service, 'acc-1')
    );

    const patientResponse = new MockResponse();
    await handlePrescriptionExecutionsRoutes(
      '/prescription-executions',
      {
        method: 'GET',
        url: '/prescription-executions?patientId=00000000-0000-4000-8000-000000000001'
      } as never,
      patientResponse as never,
      'corr-prescription-executions-tenant-patient',
      createHandlers(service, 'acc-1')
    );

    const encounterResult = encounterResponse.bodyJson<{
      items: Array<{ accountId: string; medicationName: string }>;
    }>();
    const patientResult = patientResponse.bodyJson<{
      items: Array<{ accountId: string; medicationName: string }>;
    }>();

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
});
