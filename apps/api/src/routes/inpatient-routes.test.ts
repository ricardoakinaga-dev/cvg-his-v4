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

test('handleInpatientRoutes appends inpatient progress to clinical record timeline', async () => {
  const response = new MockResponse();
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  const onProgressAdded = test.mock.fn();

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
  const callbackPayload = onProgressAdded.mock.calls[0]?.arguments[0];
  assert.equal(callbackPayload.stay.id, stay.id);
  assert.equal(callbackPayload.progress.note, 'Paciente aceitou dieta e manteve parametros estaveis');
  assert.equal(callbackPayload.principal.user.id, 'user-1');
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
  assert.equal(listResponse.bodyJson<{ items: Array<{ title: string }> }>().items[0]?.title, 'Hiporexia');
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
  const addBillingItemPayload =
    (addBillingItem.mock.calls[0]?.arguments as unknown[] | undefined)?.[1];
  assert.deepEqual(addBillingItemPayload, {
    encounterId: stay.encounterId,
    itemType: 'daily_rate',
    description: 'Diaria UTI',
    quantity: 2,
    unitPriceAmount: 180,
    sourceEntityType: 'inpatient_daily_charge',
    sourceEntityId: charge.id
  });
  assert.equal(billResponse.bodyJson<{ status: string; billingRecordId: string }>().status, 'billed');
  assert.equal(billResponse.bodyJson<{ status: string; billingRecordId: string }>().billingRecordId, 'bill_inpatient_1');
});

test('handleInpatientRoutes lists inpatient daily charge worklist with totals', async () => {
  const inpatient = createInpatientService();
  const stay = inpatient.list()[0];
  inpatient.createDailyCharge('user-1' as never, {
    stayId: stay.id,
    description: 'Diaria UTI',
    chargeDate: '2026-05-28',
    quantity: 2,
    unitAmount: 180
  });
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
  const onStatusUpdated = test.mock.fn();

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
      onStatusUpdated
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(onStatusUpdated.mock.callCount(), 1);
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
  assert.deepEqual(payload.items.map((item) => item.id), ['bed-1']);
});
