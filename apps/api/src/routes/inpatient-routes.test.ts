import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { EncountersService } from '@cvg-his-v2/module-encounters';
import { InpatientService } from '@cvg-his-v2/module-inpatient';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleInpatientRoutes } from './inpatient-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly socket: { remoteAddress: string };
  readonly #body: Buffer;
  #sent = false;

  constructor(input: { method: string; url: string; body?: Record<string, unknown> }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = {};
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

function createPrincipal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
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
      accountId: 'acc_cvg_demo' as never,
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
  service.addProgress('user-1' as never, {
    stayId: stay.id,
    note: 'Pendente avaliacao de retorno e ajuste de fluidoterapia'
  });
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
