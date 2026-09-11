import { test, expect } from '../fixtures/cvg-his.fixture';
import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Jornada clínica canônica ponta a ponta, mantida no escopo do harness de API.
 *
 * A jornada só é executada quando /health confirma persistência PostgreSQL em
 * um banco descartável preparado pelo harness. Disponibilidade (se criada),
 * queue, triage, diagnóstico e alta não têm uma API pública de descarte
 * completa; a execução CI usa uma base efêmera que é descartada ao terminar o
 * job, portanto nenhum banco compartilhado é aceito como evidência.
 * O teste cobre resultado laboratorial assinado, entrega, execução de medicação,
 * auditoria e invariantes de tenant no mesmo encounter.
 */

type ApiEntity = {
  readonly id: string;
  readonly accountId: string;
  readonly patientId?: string;
  readonly ownerId?: string;
  readonly appointmentId?: string;
  readonly queueEntryId?: string;
  readonly encounterId?: string;
  readonly status?: string;
  readonly [key: string]: unknown;
};

type Collection<T> = { readonly items: readonly T[] };

type WorkflowTask = ApiEntity & {
  readonly taskType: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly dueAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
};

type Staff = {
  readonly id: string;
  readonly userId?: string;
  readonly status?: string;
};

async function findAvailableAppointmentSlot(
  apiContext: APIRequestContext,
  patientId: string
): Promise<{ readonly practitionerStaffId: string; readonly scheduledAt: string }> {
  const availabilityPayload = await readJson<{
    readonly items?: readonly {
      readonly professionalUserId: string;
      readonly dayOfWeek: number;
    }[];
  }>(
    await apiContext.get('/availability', { params: { page: 1, pageSize: 100 } }),
    'list availability'
  );
  let availability = [...(availabilityPayload.items ?? [])];

  const staffPayload = await readJson<{ readonly items: readonly Staff[] }>(
    await apiContext.get('/staff'),
    'list staff'
  );
  const staff =
    staffPayload.items.find((item) => item.id === 'staff_vet' && item.status !== 'inactive') ??
    staffPayload.items.find((item) => item.status !== 'inactive') ??
    staffPayload.items[0];
  expect(staff).toBeDefined();

  if (availability.length === 0) {
    const seedDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const createdAvailability = await readJson<{
      readonly professionalUserId: string;
      readonly dayOfWeek: number;
    }>(
      await apiContext.post('/availability', {
        data: {
          professionalUserId: staff!.userId ?? staff!.id,
          dayOfWeek: seedDate.getUTCDay(),
          startTime: '08:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          timezone: 'America/Sao_Paulo',
          notes: 'Disponibilidade sintética da jornada canônica'
        }
      }),
      'create synthetic availability',
      201
    );
    availability = [createdAvailability];
  }

  const selectedAvailability = availability[0]!;
  const selectedStaff = staffPayload.items.find(
    (item) =>
      item.userId === selectedAvailability.professionalUserId ||
      item.id === selectedAvailability.professionalUserId
  );
  const practitionerStaffId = selectedStaff?.id ?? selectedAvailability.professionalUserId;

  const firstCandidate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  firstCandidate.setUTCHours(9, 0, 0, 0);
  for (let dayOffset = 0; dayOffset < 21; dayOffset += 1) {
    for (let slotOffset = 0; slotOffset < 18; slotOffset += 1) {
      const candidate = new Date(firstCandidate);
      candidate.setUTCDate(candidate.getUTCDate() + dayOffset);
      candidate.setUTCHours(9 + Math.floor(slotOffset / 2), (slotOffset % 2) * 30, 0, 0);
      if (candidate.getUTCDay() !== selectedAvailability.dayOfWeek) continue;

      const availabilityCheck = await readJson<{ readonly available: boolean }>(
        await apiContext.get('/scheduling/availability', {
          params: {
            scheduledAt: candidate.toISOString(),
            patientId,
            practitionerStaffId,
            durationMinutes: 30
          }
        }),
        'check appointment availability'
      );
      if (availabilityCheck.available) {
        return { practitionerStaffId, scheduledAt: candidate.toISOString() };
      }
    }
  }

  throw new Error('No available synthetic appointment slot was found');
}

async function readJson<T>(response: APIResponse, operation: string, expectedStatus = 200) {
  const body = await response.text();
  expect(response.status(), `${operation} returned an unexpected status: ${body}`).toBe(
    expectedStatus
  );
  return JSON.parse(body) as T;
}

function expectTenant(entity: { readonly accountId?: string }, accountId: string): void {
  expect(entity.accountId).toBe(accountId);
}

async function bestEffortCleanup(
  apiContext: APIRequestContext,
  label: string,
  request: () => Promise<APIResponse>
): Promise<void> {
  try {
    const response = await request();
    if (!response.ok() && response.status() !== 404) {
      console.warn(`   cleanup ${label} returned ${response.status()}: ${await response.text()}`);
    }
  } catch (error) {
    console.warn(`   cleanup ${label} failed: ${String(error)}`);
  }
}

test('executa owner -> patient -> appointment/queue -> triage/encounter -> prescription/diagnostic -> discharge/follow-up', async ({
  apiContext
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created: {
    ownerId?: string;
    patientId?: string;
    appointmentId?: string;
    encounterId?: string;
    prescriptionId?: string;
    executionId?: string;
    encounterClosed?: boolean;
  } = {};

  try {
    const health = await readJson<{ readonly ok: boolean; readonly persistenceMode: string }>(
      await apiContext.get('/health'),
      'health'
    );
    expect(health.ok).toBeTruthy();
    test.skip(
      health.persistenceMode !== 'database',
      'A jornada canônica exige o runtime PostgreSQL descartável; fallback em memória não é evidência clínica'
    );

    const session = await readJson<{
      readonly principal: { readonly user: { readonly accountId: string } };
    }>(await apiContext.get('/auth/session'), 'auth/session');
    const accountId = session.principal.user.accountId;
    expect(accountId).toBeTruthy();

    const owner = await readJson<ApiEntity>(
      await apiContext.post('/owners', {
        data: {
          fullName: `Tutor Jornada Clínica ${suffix}`,
          documentId: `E2E-CANONICAL-${suffix}`,
          contacts: [
            {
              label: 'Celular',
              value: '11999999999',
              type: 'phone',
              primary: true
            },
            {
              label: 'Email',
              value: `canonical-${suffix}@test.invalid`,
              type: 'email'
            }
          ],
          financialResponsible: true
        }
      }),
      'create owner',
      201
    );
    created.ownerId = owner.id;
    expectTenant(owner, accountId);

    const patient = await readJson<ApiEntity>(
      await apiContext.post('/patients', {
        data: {
          primaryOwnerId: owner.id,
          name: `Paciente Jornada Clínica ${suffix}`,
          species: 'canine',
          breed: 'SRD',
          sex: 'female',
          microchip: `E2E-CANONICAL-${suffix}`
        }
      }),
      'create patient',
      201
    );
    created.patientId = patient.id;
    expectTenant(patient, accountId);
    expect(patient.primaryOwnerId).toBe(owner.id);

    const appointmentSlot = await findAvailableAppointmentSlot(apiContext, patient.id);
    const appointment = await readJson<ApiEntity>(
      await apiContext.post('/appointments', {
        data: {
          patientId: patient.id,
          ownerId: owner.id,
          practitionerStaffId: appointmentSlot.practitionerStaffId,
          scheduledAt: appointmentSlot.scheduledAt,
          visitType: 'scheduled',
          reason: `Consulta canônica ${suffix}`
        }
      }),
      'create appointment',
      201
    );
    created.appointmentId = appointment.id;
    expectTenant(appointment, accountId);
    expect(appointment.patientId).toBe(patient.id);
    expect(appointment.ownerId).toBe(owner.id);
    expect(appointment.status).toBe('scheduled');

    const checkedIn = await readJson<ApiEntity>(
      await apiContext.post('/queue/check-in', {
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          ownerId: owner.id,
          reason: `Check-in canônico ${suffix}`,
          entryType: 'standard',
          priority: 'medium'
        }
      }),
      'queue check-in',
      201
    );
    expectTenant(checkedIn, accountId);
    expect(checkedIn.appointmentId).toBe(appointment.id);
    expect(checkedIn.status).toBe('waiting');

    const called = await readJson<ApiEntity>(
      await apiContext.post(`/queue/${checkedIn.id}/call`),
      'call queue entry'
    );
    expectTenant(called, accountId);
    expect(called.id).toBe(checkedIn.id);
    expect(called.status).toBe('called');

    const encounter = await readJson<ApiEntity>(
      await apiContext.post('/encounters', {
        data: {
          patientId: patient.id,
          ownerId: owner.id,
          appointmentId: appointment.id,
          queueEntryId: checkedIn.id,
          visitType: 'scheduled',
          origin: 'schedule',
          reason: `Atendimento canônico ${suffix}`
        }
      }),
      'open encounter',
      201
    );
    created.encounterId = encounter.id;
    expectTenant(encounter, accountId);
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.ownerId).toBe(owner.id);
    expect(encounter.appointmentId).toBe(appointment.id);
    expect(encounter.queueEntryId).toBe(checkedIn.id);
    expect(encounter.status).toBe('reception');

    const attachedQueue = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/queue'),
      'read queue after encounter'
    ).then((payload: Collection<ApiEntity>) => {
      const entry = payload.items.find((item) => item.id === checkedIn.id);
      expect(entry).toBeDefined();
      return entry as ApiEntity;
    });
    expectTenant(attachedQueue, accountId);
    expect(attachedQueue.encounterId).toBe(encounter.id);
    expect(attachedQueue.status).toBe('in_triage');

    const triage = await readJson<ApiEntity>(
      await apiContext.post('/triage', {
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          priority: 'medium',
          chiefComplaint: 'Consulta de rotina para avaliação clínica',
          initialNotes: 'Fixture sintético; sem dados reais.',
          alerts: [],
          destination: 'in_care'
        }
      }),
      'create triage',
      201
    );
    expectTenant(triage, accountId);
    expect(triage.encounterId).toBe(encounter.id);
    expect(triage.patientId).toBe(patient.id);
    expect(triage.destination).toBe('in_care');

    const triagedEncounter = await readJson<ApiEntity>(
      await apiContext.get(`/encounters/${encounter.id}`),
      'read triaged encounter'
    );
    expectTenant(triagedEncounter, accountId);
    expect(triagedEncounter.status).toBe('in_care');

    const triageList = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/triage', { params: { encounterId: encounter.id } }),
      'list triage records'
    );
    expect(triageList.items).toHaveLength(1);
    expectTenant(triageList.items[0]!, accountId);
    expect(triageList.items[0]!.id).toBe(triage.id);

    const medicalRecord = await readJson<{
      readonly record: ApiEntity;
      readonly entries: readonly ApiEntity[];
    }>(
      await apiContext.get('/medical-records', { params: { encounterId: encounter.id } }),
      'read medical record'
    );
    expectTenant(medicalRecord.record, accountId);
    expect(medicalRecord.record.encounterId).toBe(encounter.id);

    const prescription = await readJson<ApiEntity>(
      await apiContext.post('/prescriptions', {
        data: {
          medicalRecordId: medicalRecord.record.id,
          encounterId: encounter.id,
          patientId: patient.id,
          medicationName: `Medicação sintética ${suffix}`,
          dosage: '1 unidade',
          route: 'oral',
          frequency: '8/8h',
          duration: '3 dias',
          notes: 'Fixture E2E descartável'
        }
      }),
      'create prescription',
      201
    );
    created.prescriptionId = prescription.id;
    expectTenant(prescription, accountId);
    expect(prescription.encounterId).toBe(encounter.id);
    expect(prescription.patientId).toBe(patient.id);
    expect(prescription.entryType).toBe('prescription');

    const signedPrescription = await readJson<ApiEntity>(
      await apiContext.post(`/prescriptions/${prescription.id}/sign`, { data: {} }),
      'sign prescription'
    );
    expectTenant(signedPrescription, accountId);
    expect(signedPrescription.id).toBe(prescription.id);
    expect(signedPrescription.signedAt).toBeTruthy();
    expect(signedPrescription.signedByUserId).toBeTruthy();
    expect(signedPrescription.signatureHash).toBeTruthy();

    const prescriptionList = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/prescriptions', { params: { encounterId: encounter.id } }),
      'list prescriptions'
    );
    const listedPrescription = prescriptionList.items.find((item) => item.id === prescription.id);
    expect(listedPrescription).toBeDefined();
    expectTenant(listedPrescription!, accountId);

    const execution = await readJson<ApiEntity>(
      await apiContext.post('/prescription-executions', {
        data: {
          clinicalEntryId: prescription.id,
          patientId: patient.id,
          encounterId: encounter.id,
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          route: prescription.route,
          frequency: prescription.frequency,
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          notes: 'Execução de medicação da jornada canônica'
        }
      }),
      'create prescription execution',
      201
    );
    created.executionId = execution.id;
    expectTenant(execution, accountId);
    expect(execution.encounterId).toBe(encounter.id);
    expect(execution.patientId).toBe(patient.id);
    expect(execution.status).toBe('pending');

    const administered = await readJson<ApiEntity>(
      await apiContext.post(`/prescription-executions/${execution.id}/execute`, {
        data: {
          status: 'administered',
          notes: 'Administração sintética registrada no encounter',
          vitalsSnapshot: { temperatureC: 38.4, heartRateBpm: 96 }
        }
      }),
      'execute prescription',
      200
    );
    expectTenant(administered, accountId);
    expect(administered.id).toBe(execution.id);
    expect(administered.status).toBe('administered');

    const executionDetail = await readJson<ApiEntity & { readonly events?: readonly ApiEntity[] }>(
      await apiContext.get(`/prescription-executions/${execution.id}`),
      'read prescription execution detail'
    );
    expectTenant(executionDetail, accountId);
    expect(
      executionDetail.events?.some((event) => event.eventType === 'administered')
    ).toBeTruthy();

    const diagnostic = await readJson<ApiEntity>(
      await apiContext.post('/diagnostics/orders', {
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          examType: `Hemograma sintético ${suffix}`,
          reason: 'Pedido diagnóstico da jornada canônica'
        }
      }),
      'create diagnostic order',
      201
    );
    expectTenant(diagnostic, accountId);
    expect(diagnostic.encounterId).toBe(encounter.id);
    expect(diagnostic.patientId).toBe(patient.id);
    expect(diagnostic.status).toBe('requested');

    const diagnostics = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/diagnostics/orders', { params: { encounterId: encounter.id } }),
      'list diagnostic orders'
    );
    const listedDiagnostic = diagnostics.items.find((item) => item.id === diagnostic.id);
    expect(listedDiagnostic).toBeDefined();
    expectTenant(listedDiagnostic!, accountId);

    const collectedDiagnostic = await readJson<ApiEntity>(
      await apiContext.post(`/diagnostics/orders/${diagnostic.id}/result`, {
        headers: { 'idempotency-key': `canonical-${suffix}-collect` },
        data: { status: 'collected' }
      }),
      'collect diagnostic order'
    );
    expectTenant(collectedDiagnostic, accountId);
    expect(collectedDiagnostic.status).toBe('collected');
    expect(collectedDiagnostic.collectionAttempt).toBe(1);

    const analyzingDiagnostic = await readJson<ApiEntity>(
      await apiContext.post(`/diagnostics/orders/${diagnostic.id}/result`, {
        headers: { 'idempotency-key': `canonical-${suffix}-analysis` },
        data: { status: 'in_analysis' }
      }),
      'start diagnostic analysis'
    );
    expectTenant(analyzingDiagnostic, accountId);
    expect(analyzingDiagnostic.status).toBe('in_analysis');

    const reportedDiagnostic = await readJson<ApiEntity>(
      await apiContext.post(`/diagnostics/orders/${diagnostic.id}/result`, {
        headers: { 'idempotency-key': `canonical-${suffix}-report` },
        data: {
          status: 'reported',
          resultSummary: 'Hemograma sintético sem alterações críticas',
          resultValues: [
            {
              parameter: 'Leucócitos',
              value: '8500',
              unit: '/mm³',
              reference: '6000–17000'
            }
          ]
        }
      }),
      'report diagnostic result'
    );
    expectTenant(reportedDiagnostic, accountId);
    expect(reportedDiagnostic.status).toBe('reported');
    expect(reportedDiagnostic.signedByUserId).toBeTruthy();
    expect(reportedDiagnostic.signatureHash).toBeTruthy();

    const replayedReportedDiagnostic = await readJson<ApiEntity>(
      await apiContext.post(`/diagnostics/orders/${diagnostic.id}/result`, {
        headers: { 'idempotency-key': `canonical-${suffix}-report` },
        data: {
          status: 'reported',
          resultSummary: 'Hemograma sintético sem alterações críticas',
          resultValues: [
            {
              parameter: 'Leucócitos',
              value: '8500',
              unit: '/mm³',
              reference: '6000–17000'
            }
          ]
        }
      }),
      'replay diagnostic result'
    );
    expect(replayedReportedDiagnostic.id).toBe(reportedDiagnostic.id);
    expect(replayedReportedDiagnostic.status).toBe('reported');

    const deliveredDiagnostic = await readJson<ApiEntity>(
      await apiContext.post(`/diagnostics/orders/${diagnostic.id}/result`, {
        headers: { 'idempotency-key': `canonical-${suffix}-deliver` },
        data: { status: 'delivered', deliveryChannel: 'portal' }
      }),
      'deliver diagnostic result'
    );
    expectTenant(deliveredDiagnostic, accountId);
    expect(deliveredDiagnostic.status).toBe('delivered');

    const diagnosticDetail = await readJson<
      ApiEntity & { readonly history?: readonly ApiEntity[] }
    >(
      await apiContext.get(`/laboratory/orders/${diagnostic.id}`),
      'read diagnostic workflow detail'
    );
    expectTenant(diagnosticDetail, accountId);
    expect(diagnosticDetail.history?.map((event) => event.eventType)).toEqual([
      'collected',
      'in_analysis',
      'reported',
      'delivered'
    ]);

    const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const discharge = await readJson<ApiEntity>(
      await apiContext.post('/discharges', {
        data: {
          encounterId: encounter.id,
          dischargeType: 'ambulatory',
          outcome: 'Alta clínica sintética',
          clinicalSummary: 'Jornada E2E sem dados reais.',
          continuityInstructions: 'Manter observação e seguir orientação clínica.',
          followUpDate,
          followUpNotes: 'Retorno ambulatorial sintético em 7 dias.'
        }
      }),
      'create discharge',
      201
    );
    expectTenant(discharge, accountId);
    expect(discharge.encounterId).toBe(encounter.id);
    expect(discharge.dischargeType).toBe('ambulatory');
    expect(discharge.followUpDate).toBe(followUpDate);

    const followUpTasks = await readJson<Collection<WorkflowTask>>(
      await apiContext.get('/workflow-tasks', {
        params: { taskType: 'clinical.follow_up', encounterId: encounter.id }
      }),
      'list discharge follow-up tasks'
    );
    const followUpTask = followUpTasks.items.find(
      (item) => item.metadata.sourceEntityId === discharge.id
    );
    expect(followUpTask).toBeDefined();
    expectTenant(followUpTask!, accountId);
    expect(followUpTask!.taskType).toBe('clinical.follow_up');
    expect(followUpTask!.patientId).toBe(patient.id);
    expect(followUpTask!.encounterId).toBe(encounter.id);
    expect(followUpTask!.status).toBe('pending');
    expect(followUpTask!.dueAt).toBe(`${followUpDate}T09:00:00.000Z`);

    const closedEncounter = await readJson<ApiEntity>(
      await apiContext.post(`/encounters/${encounter.id}/close`, {
        data: { closeReason: 'Alta ambulatorial concluída' }
      }),
      'close encounter'
    );
    expectTenant(closedEncounter, accountId);
    expect(closedEncounter.status).toBe('closed');
    created.encounterClosed = true;

    const completedQueue = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/queue'),
      'read completed queue'
    ).then((payload) => payload.items.find((item) => item.id === checkedIn.id));
    expect(completedQueue).toBeDefined();
    expectTenant(completedQueue!, accountId);
    expect(completedQueue!.encounterId).toBe(encounter.id);
    expect(completedQueue!.status).toBe('completed');

    const completedAppointment = await readJson<ApiEntity>(
      await apiContext.get(`/appointments/${appointment.id}`),
      'read completed appointment'
    );
    expectTenant(completedAppointment, accountId);
    expect(completedAppointment.status).toBe('completed');

    const summary = await readJson<{
      readonly encounter: ApiEntity;
      readonly timeline: readonly ApiEntity[];
      readonly diagnostics: {
        readonly totalOrders: number;
        readonly latestOrders: readonly ApiEntity[];
      };
    }>(await apiContext.get(`/encounters/${encounter.id}/summary`), 'read encounter summary');
    expectTenant(summary.encounter, accountId);
    expect(summary.encounter.status).toBe('closed');
    expect(summary.diagnostics.totalOrders).toBeGreaterThanOrEqual(1);
    expect(
      summary.diagnostics.latestOrders.some((order) => order.id === diagnostic.id)
    ).toBeTruthy();
    expect(summary.timeline.some((event) => event.eventType === 'triage_recorded')).toBeTruthy();

    const auditEvents = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/audit/events'),
      'read canonical audit events'
    );
    expect(
      auditEvents.items.some(
        (event) => event.entityId === diagnostic.id && event.action === 'reported'
      )
    ).toBeTruthy();
    expect(
      auditEvents.items.some(
        (event) => event.entityId === execution.id && event.action === 'administered'
      )
    ).toBeTruthy();
  } finally {
    // These are public soft-delete/archive routes. Synthetic availability (when
    // created), queue, triage, diagnostics and discharge have no public delete
    // route; the in-memory server teardown discards those derived fixture
    // records after this test process exits.
    if (created.prescriptionId) {
      await bestEffortCleanup(apiContext, 'prescription', () =>
        apiContext.delete(`/prescriptions/${created.prescriptionId}`, {
          data: { reason: 'E2E fixture cleanup' }
        })
      );
    }
    if (created.encounterId && !created.encounterClosed) {
      await bestEffortCleanup(apiContext, 'encounter', () =>
        apiContext.delete(`/encounters/${created.encounterId}`)
      );
    }
    if (created.patientId) {
      await bestEffortCleanup(apiContext, 'patient', () =>
        apiContext.delete(`/patients/${created.patientId}`)
      );
    }
    if (created.ownerId) {
      await bestEffortCleanup(apiContext, 'owner', () =>
        apiContext.delete(`/owners/${created.ownerId}`)
      );
    }
  }
});
