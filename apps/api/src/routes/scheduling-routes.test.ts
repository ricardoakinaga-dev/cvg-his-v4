import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { SmartSchedulingService } from '@cvg-his-v2/module-ml';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleSchedulingRoutes } from './scheduling-routes.js';
import { MlTelemetryService } from '../ml-telemetry.js';

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

  setHeader(): this {
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
      permissionCodes: ['scheduling.read', 'scheduling.manage'],
      capabilities: []
    }
  };
}

function createAudit() {
  return {
    write: () => {}
  };
}

function createSchedulingService() {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  return new SchedulingService(owners, patients);
}

function createSmartSchedulingService() {
  return new SmartSchedulingService({} as never);
}

function createJsonRequest(method: string, url: string, body?: Record<string, unknown>) {
  if (!body) {
    return { method, url } as never;
  }

  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

test('handleSchedulingRoutes ignores unrelated routes', async () => {
  const response = new MockResponse();
  const handled = await handleSchedulingRoutes(
    '/owners',
    { method: 'GET' } as never,
    response as never,
    'corr-scheduling-0',
    {
      scheduling: createSchedulingService(),
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, false);
});

test('handleSchedulingRoutes returns overview and availability for the agenda cockpit', async () => {
  const scheduling = createSchedulingService();

  const overviewResponse = new MockResponse();
  const overviewHandled = await handleSchedulingRoutes(
    '/scheduling/overview',
    createJsonRequest(
      'GET',
      '/scheduling/overview?viewMode=week&referenceDate=2026-03-25&search=luna&unit=Clinica&statuses=scheduled,checked_in'
    ),
    overviewResponse as never,
    'corr-scheduling-overview',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(overviewHandled, true);
  assert.equal(overviewResponse.statusCode, 200);
  const overview = overviewResponse.bodyJson<{
    viewMode: string;
    items: Array<{ id: string; patientId: string; unit?: string }>;
    stats: { total: number; scheduled: number };
  }>();
  assert.equal(overview.viewMode, 'week');
  assert.equal(overview.items[0]?.id, 'appt_luna_checkup');
  assert.equal(overview.items[0]?.patientId, 'patient_luna');
  assert.equal(overview.items[0]?.unit, 'Clinica');
  assert.ok(overview.stats.total >= 1);
  assert.ok(overview.stats.scheduled >= 1);

  const availabilityResponse = new MockResponse();
  const availabilityHandled = await handleSchedulingRoutes(
    '/scheduling/availability',
    createJsonRequest(
      'GET',
      '/scheduling/availability?scheduledAt=2026-03-25T09:00:00.000Z&patientId=patient_luna&durationMinutes=30'
    ),
    availabilityResponse as never,
    'corr-scheduling-availability',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(availabilityHandled, true);
  assert.equal(availabilityResponse.statusCode, 200);
  const availability = availabilityResponse.bodyJson<{
    available: boolean;
    conflicts: Array<{ type: string }>;
    requestedSlot: { durationMinutes: number };
  }>();
  assert.equal(availability.available, false);
  assert.equal(availability.requestedSlot.durationMinutes, 30);
  assert.ok(availability.conflicts.some((conflict) => conflict.type === 'patient_overlap'));
});

test('handleSchedulingRoutes creates, lists, reads and cancels appointments', async () => {
  const scheduling = createSchedulingService();

  const createResponse = new MockResponse();
  const createHandled = await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('POST', '/appointments', {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-03-25T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta enterprise',
      practitionerStaffId: 'staff_vet',
      unit: 'Clinica',
      specialty: 'Clinico geral',
      resourceLabel: 'Consultorio 2'
    }),
    createResponse as never,
    'corr-scheduling-create',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(createHandled, true);
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; status: string; reason: string }>();
  assert.equal(created.status, 'scheduled');
  assert.equal(created.reason, 'Consulta enterprise');

  const listResponse = new MockResponse();
  const listHandled = await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest(
      'GET',
      '/appointments?search=luna&unit=Clinica&statuses=scheduled&startAt=2026-03-25T00:00:00.000Z&endAt=2026-03-25T23:59:59.000Z'
    ),
    listResponse as never,
    'corr-scheduling-list',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listed = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.ok(listed.items.some((item) => item.id === created.id));

  const detailResponse = new MockResponse();
  const detailHandled = await handleSchedulingRoutes(
    `/appointments/${created.id}`,
    createJsonRequest('GET', `/appointments/${created.id}`),
    detailResponse as never,
    'corr-scheduling-detail',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(detailHandled, true);
  assert.equal(detailResponse.statusCode, 200);
  const detail = detailResponse.bodyJson<{ id: string; resourceLabel?: string }>();
  assert.equal(detail.id, created.id);
  assert.equal(detail.resourceLabel, 'Consultorio 2');

  const cancelResponse = new MockResponse();
  const cancelHandled = await handleSchedulingRoutes(
    `/appointments/${created.id}/cancel`,
    createJsonRequest('POST', `/appointments/${created.id}/cancel`, {
      reason: 'Reagendamento solicitado'
    }),
    cancelResponse as never,
    'corr-scheduling-cancel',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(cancelHandled, true);
  assert.equal(cancelResponse.statusCode, 200);
  const cancelled = cancelResponse.bodyJson<{ id: string; status: string; reason: string }>();
  assert.equal(cancelled.id, created.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.reason, 'Reagendamento solicitado');
});

test('handleSchedulingRoutes lists patient appointments across past and future dates', async () => {
  const scheduling = createSchedulingService();
  const handlers = {
    scheduling,
    smartScheduling: createSmartSchedulingService(),
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal()
  };

  const pastResponse = new MockResponse();
  await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('POST', '/appointments', {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2024-01-02T09:00:00.000Z',
      visitType: 'return',
      reason: 'Retorno historico'
    }),
    pastResponse as never,
    'corr-scheduling-patient-history-past',
    handlers
  );
  const pastAppointment = pastResponse.bodyJson<{ id: string }>();

  const futureResponse = new MockResponse();
  await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('POST', '/appointments', {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2099-01-01T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Vacina futura'
    }),
    futureResponse as never,
    'corr-scheduling-patient-history-future',
    handlers
  );
  const futureAppointment = futureResponse.bodyJson<{ id: string }>();

  const otherPatientResponse = new MockResponse();
  await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('POST', '/appointments', {
      patientId: 'patient_mogeb6qv_5b0gq64z',
      ownerId: 'owner_ricardo_akinaga',
      scheduledAt: '2099-01-01T11:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta de outro animal'
    }),
    otherPatientResponse as never,
    'corr-scheduling-patient-history-other',
    handlers
  );
  const otherPatientAppointment = otherPatientResponse.bodyJson<{ id: string }>();

  const listResponse = new MockResponse();
  const listHandled = await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('GET', '/appointments?patientId=patient_luna'),
    listResponse as never,
    'corr-scheduling-patient-history-list',
    handlers
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listed = listResponse.bodyJson<{
    items: Array<{ id: string; patientId: string; scheduledAt: string }>;
  }>();
  const listedIds = listed.items.map((item) => item.id);
  assert.ok(listedIds.includes(pastAppointment.id));
  assert.ok(listedIds.includes(futureAppointment.id));
  assert.ok(!listedIds.includes(otherPatientAppointment.id));
  assert.ok(listed.items.every((item) => item.patientId === 'patient_luna'));
});

test('handleSchedulingRoutes processes the operational queue flow', async () => {
  const scheduling = createSchedulingService();

  const checkInResponse = new MockResponse();
  const checkInHandled = await handleSchedulingRoutes(
    '/queue/check-in',
    createJsonRequest('POST', '/queue/check-in', {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      appointmentId: 'appt_luna_checkup',
      reason: 'Paciente chegou para triagem',
      priority: 'high'
    }),
    checkInResponse as never,
    'corr-scheduling-check-in',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(checkInHandled, true);
  assert.equal(checkInResponse.statusCode, 201);
  const checkedIn = checkInResponse.bodyJson<{ id: string; status: string; appointmentId?: string }>();
  assert.equal(checkedIn.status, 'waiting');
  assert.equal(checkedIn.appointmentId, 'appt_luna_checkup');

  const queueResponse = new MockResponse();
  const queueHandled = await handleSchedulingRoutes(
    '/queue',
    createJsonRequest('GET', '/queue'),
    queueResponse as never,
    'corr-scheduling-queue',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(queueHandled, true);
  assert.equal(queueResponse.statusCode, 200);
  const queue = queueResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>();
  assert.ok(queue.items.some((item) => item.id === checkedIn.id && item.status === 'waiting'));

  const callResponse = new MockResponse();
  const callHandled = await handleSchedulingRoutes(
    `/queue/${checkedIn.id}/call`,
    createJsonRequest('POST', `/queue/${checkedIn.id}/call`),
    callResponse as never,
    'corr-scheduling-call',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(callHandled, true);
  assert.equal(callResponse.statusCode, 200);
  const called = callResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(called.id, checkedIn.id);
  assert.equal(called.status, 'called');

  await scheduling.attachEncounter(checkedIn.id as never, 'encounter-1' as never);

  const startCareResponse = new MockResponse();
  const startCareHandled = await handleSchedulingRoutes(
    `/queue/${checkedIn.id}/start-care`,
    createJsonRequest('POST', `/queue/${checkedIn.id}/start-care`),
    startCareResponse as never,
    'corr-scheduling-start-care',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(startCareHandled, true);
  assert.equal(startCareResponse.statusCode, 200);
  const inCare = startCareResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(inCare.id, checkedIn.id);
  assert.equal(inCare.status, 'in_care');

  const noShowResponse = new MockResponse();
  const noShowHandled = await handleSchedulingRoutes(
    `/queue/${checkedIn.id}/no-show`,
    createJsonRequest('POST', `/queue/${checkedIn.id}/no-show`),
    noShowResponse as never,
    'corr-scheduling-no-show',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(noShowHandled, true);
  assert.equal(noShowResponse.statusCode, 200);
  const cancelledEntry = noShowResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(cancelledEntry.id, checkedIn.id);
  assert.equal(cancelledEntry.status, 'cancelled');
  assert.equal(scheduling.getAppointmentOrThrow('appt_luna_checkup' as never).status, 'cancelled');
});

test('handleSchedulingRoutes returns smart duration recommendation for appointment flow', async () => {
  const scheduling = createSchedulingService();
  const response = new MockResponse();

  const handled = await handleSchedulingRoutes(
    '/scheduling/recommendations/duration',
    createJsonRequest('POST', '/scheduling/recommendations/duration', {
      patientId: 'patient_luna',
      scheduledAt: '2026-03-25T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Retorno cardiologico',
      specialty: 'Cardiologia'
    }),
    response as never,
    'corr-scheduling-smart-duration',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);

  const payload = response.bodyJson<{
    recommendationId: string;
    predictedDurationMinutes: number;
    confidence: number;
    suggestedBufferMinutes: number;
    basedOn: { previousVisits: number; visitType: string };
  }>();

  assert.ok(payload.recommendationId.startsWith('smartsch_'));
  assert.ok(payload.predictedDurationMinutes >= 30);
  assert.ok(payload.confidence >= 0.7);
  assert.ok(payload.suggestedBufferMinutes >= 0);
  assert.equal(payload.basedOn.visitType, 'scheduled');
  assert.ok(payload.basedOn.previousVisits >= 1);
});

test('handleSchedulingRoutes records smart scheduling adoption and overrides for operational telemetry', async () => {
  const scheduling = createSchedulingService();
  const telemetry = new MlTelemetryService();

  const recommendationResponse = new MockResponse();
  await handleSchedulingRoutes(
    '/scheduling/recommendations/duration',
    createJsonRequest('POST', '/scheduling/recommendations/duration', {
      patientId: 'patient_luna',
      scheduledAt: '2026-03-25T12:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta com buffer',
      specialty: 'Cardiologia'
    }),
    recommendationResponse as never,
    'corr-scheduling-telemetry-rec',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      telemetry,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const recommendation = recommendationResponse.bodyJson<{ recommendationId: string; predictedDurationMinutes: number }>();

  const createResponse = new MockResponse();
  await handleSchedulingRoutes(
    '/appointments',
    createJsonRequest('POST', '/appointments', {
      patientId: 'patient_luna',
      ownerId: 'owner_maria_silva',
      scheduledAt: '2026-03-26T10:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Consulta enterprise',
      smartSchedulingRecommendationId: recommendation.recommendationId,
      durationMinutes: recommendation.predictedDurationMinutes + 15
    }),
    createResponse as never,
    'corr-scheduling-telemetry-apply',
    {
      scheduling,
      smartScheduling: createSmartSchedulingService(),
      telemetry,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const report = telemetry.getReport({
    accountId: 'acc_cvg_demo',
    appointments: scheduling.listAppointments('acc_cvg_demo' as never),
    featureFlags: {
      providerName: 'test',
      enabledKeys: ['ml.smart_scheduling.enabled'],
      decisions: {},
      authOidcEnabled: false,
      authWebauthnEnabled: false,
      runtimeDistributedStateEnabled: false,
      fiscalBackofficeEnabled: false,
      notificationsWhatsappRemindersEnabled: false,
      notificationsWhatsappInboundActionsEnabled: false,
      mlSmartSchedulingEnabled: true,
      mlForecastingEnabled: true,
      mlAnomalyDetectionEnabled: true,
      mlOcrFiscalEnabled: true,
      provider: { name: 'test', evaluate: async () => ({ key: '', enabled: true, provider: 'test', reason: 'default', evaluatedAt: '', definition: {} as never, context: {} as never }) } as never
    }
  });

  assert.equal(report.smartScheduling.recommendations, 1);
  assert.equal(report.smartScheduling.adopted, 1);
  assert.equal(report.smartScheduling.overrides, 1);
});
