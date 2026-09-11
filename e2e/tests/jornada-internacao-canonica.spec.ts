import { test, expect } from '../fixtures/cvg-his.fixture';
import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Prova canônica do trecho de internação do golden clinical path.
 *
 * A fixture é criada em um setor/leito sintético próprio. O teste só é
 * evidência clínica quando o runtime está ligado ao PostgreSQL descartável;
 * um fallback em memória não comprova RLS, ocupação/liberação de leito ou
 * persistência da evolução/handover.
 */

type ApiEntity = {
  readonly id: string;
  readonly accountId: string;
  readonly patientId?: string;
  readonly ownerId?: string;
  readonly encounterId?: string;
  readonly status?: string;
  readonly [key: string]: unknown;
};

type Collection<T> = { readonly items: readonly T[] };

async function readJson<T>(
  response: APIResponse,
  operation: string,
  expectedStatus = 200
): Promise<T> {
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

test('prova admissão -> leito -> handover -> alta inpatient', async ({ apiContext }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created: {
    ownerId?: string;
    patientId?: string;
    encounterId?: string;
    stayId?: string;
    sectorId?: string;
    bedId?: string;
    handoffId?: string;
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
      'A prova inpatient exige PostgreSQL descartável; fallback em memória não comprova ocupação, RLS ou persistência'
    );

    const session = await readJson<{
      readonly principal: { readonly user: { readonly accountId: string } };
    }>(await apiContext.get('/auth/session'), 'auth/session');
    const accountId = session.principal.user.accountId;
    expect(accountId).toBeTruthy();

    const owner = await readJson<ApiEntity>(
      await apiContext.post('/owners', {
        data: {
          fullName: `Tutor Internação Canônica ${suffix}`,
          documentId: `E2E-INPATIENT-${suffix}`,
          contacts: [
            {
              label: 'Celular',
              value: '11999999999',
              type: 'phone',
              primary: true
            }
          ],
          financialResponsible: true
        }
      }),
      'create inpatient owner',
      201
    );
    created.ownerId = owner.id;
    expectTenant(owner, accountId);

    const patient = await readJson<ApiEntity>(
      await apiContext.post('/patients', {
        data: {
          primaryOwnerId: owner.id,
          name: `Paciente Internação Canônica ${suffix}`,
          species: 'canine',
          breed: 'SRD',
          sex: 'female',
          microchip: `E2E-INPATIENT-${suffix}`
        }
      }),
      'create inpatient patient',
      201
    );
    created.patientId = patient.id;
    expectTenant(patient, accountId);
    expect(patient.primaryOwnerId).toBe(owner.id);

    const encounter = await readJson<ApiEntity>(
      await apiContext.post('/encounters', {
        data: {
          patientId: patient.id,
          ownerId: owner.id,
          visitType: 'walk_in',
          origin: 'reception',
          reason: `Necessidade de observação inpatient ${suffix}`
        }
      }),
      'create inpatient encounter',
      201
    );
    created.encounterId = encounter.id;
    expectTenant(encounter, accountId);
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.ownerId).toBe(owner.id);

    // Always allocate a private synthetic sector/bed so another test cannot
    // change the availability that this proof is asserting.
    const sector = await readJson<ApiEntity & { readonly name: string }>(
      await apiContext.post('/sectors', {
        headers: { 'idempotency-key': `inpatient-${suffix}-sector` },
        data: {
          code: `E2E-${suffix}`,
          name: `Ala Canônica ${suffix}`,
          kind: 'observation'
        }
      }),
      'create synthetic inpatient sector',
      201
    );
    created.sectorId = sector.id;
    expectTenant(sector, accountId);

    const bed = await readJson<ApiEntity & { readonly code: string }>(
      await apiContext.post('/beds', {
        headers: { 'idempotency-key': `inpatient-${suffix}-bed` },
        data: {
          sectorId: sector.id,
          code: `E2E-BED-${suffix}`,
          name: `Leito canônico ${suffix}`,
          supportsSpecies: 'canine'
        }
      }),
      'create synthetic inpatient bed',
      201
    );
    created.bedId = bed.id;
    expectTenant(bed, accountId);
    expect(bed.sectorId).toBe(sector.id);
    expect(bed.status).toBe('available');

    const stay = await readJson<ApiEntity>(
      await apiContext.post('/inpatient', {
        headers: { 'idempotency-key': `inpatient-${suffix}-admission` },
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          unit: 'clinic',
          ward: sector.name,
          bed: `aguardando-${suffix}`,
          chiefComplaint: 'Observação clínica sintética',
          reason: 'Monitoramento inpatient da jornada canônica',
          planSummary: 'Monitorar sinais e reavaliar no handover'
        }
      }),
      'admit inpatient stay without bed',
      201
    );
    created.stayId = stay.id;
    expectTenant(stay, accountId);
    expect(stay.encounterId).toBe(encounter.id);
    expect(stay.patientId).toBe(patient.id);
    expect(stay.status).toBe('admitted');
    expect(stay.bedId).toBeUndefined();

    const rejectedUnknownBed = await readJson<{ readonly code: string }>(
      await apiContext.post(`/inpatient/${stay.id}/assign-bed`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-unknown-bed` },
        data: {
          bedId: '00000000-0000-0000-0000-000000000000',
          sectorId: sector.id
        }
      }),
      'reject assignment to unknown bed',
      404
    );
    expect(rejectedUnknownBed.code).toBe('NOT_FOUND');

    const stayBeforeAssignment = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/inpatient', {
        params: { patientId: patient.id, includeDischarged: 'true' }
      }),
      'read stay after rejected bed assignment'
    ).then((payload) => payload.items.find((item) => item.id === stay.id));
    expect(stayBeforeAssignment).toBeDefined();
    expect(stayBeforeAssignment!.bedId).toBeUndefined();
    expect(stayBeforeAssignment!.status).toBe('admitted');

    const assignedStay = await readJson<ApiEntity>(
      await apiContext.post(`/inpatient/${stay.id}/assign-bed`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-assign-bed` },
        data: { bedId: bed.id, sectorId: sector.id }
      }),
      'assign inpatient bed'
    );
    expectTenant(assignedStay, accountId);
    expect(assignedStay.id).toBe(stay.id);
    expect(assignedStay.status).toBe('admitted');
    expect(assignedStay.bedId).toBe(bed.id);
    expect(assignedStay.sectorId).toBe(sector.id);
    expect(assignedStay.bed).toBe(bed.code);
    expect(assignedStay.ward).toBe(sector.name);

    const bedAfterAssignment = await readJson<ApiEntity>(
      await apiContext.get(`/beds/${bed.id}`),
      'read occupied inpatient bed'
    );
    expectTenant(bedAfterAssignment, accountId);
    expect(bedAfterAssignment.status).toBe('occupied');

    const progress = await readJson<ApiEntity>(
      await apiContext.post(`/inpatient/${stay.id}/progress`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-progress` },
        data: { note: 'Pendente reavaliacao antes da passagem de plantão' }
      }),
      'record inpatient progress',
      201
    );
    expectTenant(progress, accountId);
    expect(progress.stayId).toBe(stay.id);
    expect(progress.encounterId).toBe(encounter.id);

    const handoverPreview = await readJson<{
      readonly totalActiveStays: number;
      readonly items: readonly ApiEntity[];
    }>(
      await apiContext.get('/inpatient/handover-preview', {
        params: { unit: 'clinic', ward: sector.name }
      }),
      'read inpatient handover preview'
    );
    const previewItem = handoverPreview.items.find((item) => item.stayId === stay.id);
    expect(handoverPreview.totalActiveStays).toBeGreaterThanOrEqual(1);
    expect(previewItem).toBeDefined();
    expect(previewItem!.encounterId).toBe(encounter.id);
    expect(previewItem!.patientId).toBe(patient.id);
    expect(previewItem!.status).toBe('admitted');
    expect(previewItem!.latestProgressNote).toBe(progress.note);
    expect(previewItem!.requiresAttention).toBe(true);

    const handoff = await readJson<ApiEntity>(
      await apiContext.post('/clinical-handoffs/send-to-reception', {
        headers: { 'idempotency-key': `inpatient-${suffix}-handoff-send` },
        data: {
          encounterId: encounter.id,
          clinicalSummary: 'Paciente internado em leito sintético, com pendência de reavaliação.',
          receptionInstructions: 'Confirmar recebimento do contexto antes da alta.',
          priority: 'high',
          toResponsibleType: 'sector',
          toResponsibleId: 'reception'
        }
      }),
      'send clinical handoff',
      201
    );
    created.handoffId = handoff.id;
    expectTenant(handoff, accountId);
    expect(handoff.encounterId).toBe(encounter.id);
    expect(handoff.patientId).toBe(patient.id);
    expect(handoff.handoffStatus).toBe('sent_to_reception');

    const acknowledgedHandoff = await readJson<ApiEntity>(
      await apiContext.post(`/clinical-handoffs/${handoff.id}/acknowledge`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-handoff-ack` },
        data: { note: 'Contexto recebido pela equipe de recepção.' }
      }),
      'acknowledge clinical handoff'
    );
    expectTenant(acknowledgedHandoff, accountId);
    expect(acknowledgedHandoff.id).toBe(handoff.id);
    expect(acknowledgedHandoff.handoffStatus).toBe('acknowledged_by_reception');
    expect(acknowledgedHandoff.acknowledgedBy).toBeTruthy();

    const handoffList = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/clinical-handoffs', {
        params: { encounterId: encounter.id }
      }),
      'read acknowledged clinical handoff'
    );
    const listedHandoff = handoffList.items.find((item) => item.id === handoff.id);
    expect(listedHandoff).toBeDefined();
    expectTenant(listedHandoff!, accountId);
    expect(listedHandoff!.handoffStatus).toBe('acknowledged_by_reception');

    const rejectedDischarge = await readJson<{ readonly code: string }>(
      await apiContext.patch(`/inpatient/${stay.id}/update-status`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-invalid-discharge` },
        data: { status: 'discharged' }
      }),
      'reject inpatient discharge without reason',
      400
    );
    expect(rejectedDischarge.code).toBe('VALIDATION_ERROR');

    const stayBeforeDischarge = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/inpatient', {
        params: { patientId: patient.id, includeDischarged: 'true' }
      }),
      'verify stay after rejected discharge'
    ).then((payload) => payload.items.find((item) => item.id === stay.id));
    expect(stayBeforeDischarge).toBeDefined();
    expect(stayBeforeDischarge!.status).toBe('admitted');
    expect(stayBeforeDischarge!.bedId).toBe(bed.id);

    const dischargedStay = await readJson<ApiEntity>(
      await apiContext.patch(`/inpatient/${stay.id}/update-status`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-discharge` },
        data: {
          status: 'discharged',
          dischargeReason: 'Alta inpatient sintética após reavaliação'
        }
      }),
      'discharge inpatient stay'
    );
    expectTenant(dischargedStay, accountId);
    expect(dischargedStay.id).toBe(stay.id);
    expect(dischargedStay.status).toBe('discharged');
    expect(dischargedStay.dischargedAt).toBeTruthy();
    expect(dischargedStay.dischargeReason).toBe('Alta inpatient sintética após reavaliação');

    const bedAfterDischarge = await readJson<ApiEntity>(
      await apiContext.get(`/beds/${bed.id}`),
      'read released inpatient bed'
    );
    expectTenant(bedAfterDischarge, accountId);
    expect(bedAfterDischarge.status).toBe('available');

    const closedEncounter = await readJson<ApiEntity>(
      await apiContext.post(`/encounters/${encounter.id}/close`, {
        headers: { 'idempotency-key': `inpatient-${suffix}-close-encounter` },
        data: { closeReason: 'Alta inpatient concluída' }
      }),
      'close inpatient encounter'
    );
    expectTenant(closedEncounter, accountId);
    expect(closedEncounter.status).toBe('closed');
    created.encounterClosed = true;

    const finalStay = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/inpatient', {
        params: { patientId: patient.id, includeDischarged: 'true' }
      }),
      'read final inpatient stay'
    ).then((payload) => payload.items.find((item) => item.id === stay.id));
    expect(finalStay).toBeDefined();
    expectTenant(finalStay!, accountId);
    expect(finalStay!.status).toBe('discharged');

    const summary = await readJson<{
      readonly encounter: ApiEntity;
      readonly timeline: readonly ApiEntity[];
    }>(await apiContext.get(`/encounters/${encounter.id}/summary`), 'read inpatient timeline');
    expectTenant(summary.encounter, accountId);
    expect(summary.encounter.status).toBe('closed');
    expect(summary.timeline.some((event) => event.eventType === 'handoff_sent_to_reception')).toBe(
      true
    );
    expect(summary.timeline.some((event) => event.eventType === 'handoff_acknowledged')).toBe(true);

    const medicalTimeline = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/medical-records/timeline', {
        params: { encounterId: encounter.id }
      }),
      'read inpatient medical timeline'
    );
    expectTenant(medicalTimeline.items[0]!, accountId);
    expect(medicalTimeline.items.some((event) => event.eventType === 'inpatient_progressed')).toBe(
      true
    );
    expect(medicalTimeline.items.some((event) => event.eventType === 'inpatient_discharged')).toBe(
      true
    );

    const auditEvents = await readJson<Collection<ApiEntity>>(
      await apiContext.get('/audit/events'),
      'read inpatient audit events'
    );
    for (const action of ['admit', 'assign_bed', 'add_progress', 'update_status']) {
      expect(
        auditEvents.items.some((event) => event.entityId === stay.id && event.action === action),
        `missing inpatient audit action ${action}`
      ).toBe(true);
    }
    for (const action of ['send_to_reception', 'acknowledge']) {
      expect(
        auditEvents.items.some((event) => event.entityId === handoff.id && event.action === action),
        `missing handoff audit action ${action}`
      ).toBe(true);
    }
  } finally {
    // Inpatient stays, handoffs and synthetic sectors have no public delete
    // route. The CI database is created for the job and discarded afterwards;
    // the bed/owner/patient cleanup below prevents avoidable residue when a
    // local run reaches the corresponding lifecycle state.
    if (created.bedId) {
      await bestEffortCleanup(apiContext, 'synthetic inpatient bed', () =>
        apiContext.delete(`/beds/${created.bedId}`, {
          headers: { 'idempotency-key': `inpatient-${suffix}-cleanup-bed` }
        })
      );
    }
    if (created.encounterId && !created.encounterClosed) {
      await bestEffortCleanup(apiContext, 'inpatient encounter', () =>
        apiContext.delete(`/encounters/${created.encounterId}`)
      );
    }
    if (created.patientId) {
      await bestEffortCleanup(apiContext, 'inpatient patient', () =>
        apiContext.delete(`/patients/${created.patientId}`)
      );
    }
    if (created.ownerId) {
      await bestEffortCleanup(apiContext, 'inpatient owner', () =>
        apiContext.delete(`/owners/${created.ownerId}`)
      );
    }
  }
});
