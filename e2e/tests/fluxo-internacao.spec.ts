import type { APIRequestContext, APIResponse } from '@playwright/test';

import { test, expect } from '../fixtures/cvg-his.fixture';

type ClinicalFixture = {
  ownerId: string;
  patientId: string;
  encounterId: string;
};

type InpatientStay = {
  id: string;
  encounterId: string;
  patientId: string;
  unit: string;
  ward: string;
  bed: string;
  status: 'admitted' | 'stable' | 'transferred' | 'discharged';
  admittedAt: string;
  dischargedAt?: string;
  dischargeReason?: string;
};

type Prescription = {
  id: string;
  medicalRecordId: string;
  encounterId: string;
  patientId: string;
  entryType: 'prescription';
  medicationName: string;
  dosage?: string;
  route?: string;
  frequency?: string;
};

type PrescriptionExecution = {
  id: string;
  clinicalEntryId: string;
  encounterId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  scheduledAt: string;
  status: 'pending' | 'administered' | 'not-administered' | 'suspended' | 'cancelled';
  administeredBy?: string;
  administeredAt?: string;
};

async function expectJsonResponse<T>(response: APIResponse, expectedStatus: number): Promise<T> {
  const rawBody = await response.text();

  expect(response.status(), `Resposta inesperada de ${response.url()}: ${rawBody}`).toBe(
    expectedStatus
  );
  expect(rawBody, `Resposta sem body em ${response.url()}`).not.toBe('');

  const body: unknown = JSON.parse(rawBody);
  expect(body, `Body JSON ausente em ${response.url()}`).toEqual(expect.any(Object));
  return body as T;
}

async function createClinicalFixture(apiContext: APIRequestContext): Promise<ClinicalFixture> {
  const ownerResponse = await apiContext.post('/owners', {
    data: {
      fullName: 'Tutor E2E Internação',
      contacts: [
        {
          label: 'Celular',
          value: '+55 11 97777-6655',
          type: 'whatsapp',
          primary: true
        }
      ],
      financialResponsible: true
    }
  });
  const owner = await expectJsonResponse<{ id: string; fullName: string }>(ownerResponse, 201);
  expect(owner).toMatchObject({ fullName: 'Tutor E2E Internação' });
  expect(owner.id).toEqual(expect.any(String));

  const patientResponse = await apiContext.post('/patients', {
    data: {
      primaryOwnerId: owner.id,
      name: 'Paciente E2E Internação',
      species: 'feline',
      breed: 'SRD',
      sex: 'female'
    }
  });
  const patient = await expectJsonResponse<{
    id: string;
    name: string;
    primaryOwnerId: string;
  }>(patientResponse, 201);
  expect(patient).toMatchObject({
    name: 'Paciente E2E Internação',
    primaryOwnerId: owner.id
  });
  expect(patient.id).toEqual(expect.any(String));

  const encounterResponse = await apiContext.post('/encounters', {
    data: {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Observação pós-operatória E2E'
    }
  });
  const encounter = await expectJsonResponse<{
    id: string;
    patientId: string;
    ownerId: string;
    status: string;
    reason: string;
  }>(encounterResponse, 201);
  expect(encounter).toMatchObject({
    patientId: patient.id,
    ownerId: owner.id,
    status: 'reception',
    reason: 'Observação pós-operatória E2E'
  });
  expect(encounter.id).toEqual(expect.any(String));

  return {
    ownerId: owner.id,
    patientId: patient.id,
    encounterId: encounter.id
  };
}

test.describe('Fluxo: Internação → Prescrição → Administração → Alta', () => {
  test('admite, prescreve, administra e dá alta com as APIs atuais', async ({
    apiContext,
    testUser
  }) => {
    const fixture = await createClinicalFixture(apiContext);

    const admitResponse = await apiContext.post('/inpatient/admit', {
      data: {
        encounterId: fixture.encounterId,
        patientId: fixture.patientId,
        unit: 'Hospital CVG E2E',
        ward: 'Ala de Observação E2E',
        bed: 'Leito E2E 01'
      }
    });
    const stay = await expectJsonResponse<InpatientStay>(admitResponse, 201);
    expect(stay).toMatchObject({
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      unit: 'Hospital CVG E2E',
      ward: 'Ala de Observação E2E',
      bed: 'Leito E2E 01',
      status: 'admitted'
    });
    expect(stay.id).toEqual(expect.any(String));
    expect(stay.admittedAt).toEqual(expect.any(String));

    const activeStaysResponse = await apiContext.get('/inpatient', {
      params: { patientId: fixture.patientId }
    });
    const activeStays = await expectJsonResponse<{ items: InpatientStay[] }>(
      activeStaysResponse,
      200
    );
    expect(activeStays.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: stay.id,
          encounterId: fixture.encounterId,
          status: 'admitted'
        })
      ])
    );

    const medicalRecordResponse = await apiContext.get('/medical-records', {
      params: { encounterId: fixture.encounterId }
    });
    const medicalRecord = await expectJsonResponse<{
      record: { id: string; encounterId: string; patientId: string; status: string };
      entries: unknown[];
    }>(medicalRecordResponse, 200);
    expect(medicalRecord.record).toMatchObject({
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      status: 'open'
    });
    expect(medicalRecord.record.id).toEqual(expect.any(String));
    expect(medicalRecord.entries).toEqual(expect.any(Array));

    const prescriptionResponse = await apiContext.post('/prescriptions', {
      data: {
        medicalRecordId: medicalRecord.record.id,
        encounterId: fixture.encounterId,
        patientId: fixture.patientId,
        medicationName: 'Dipirona',
        dosage: '25 mg/kg',
        route: 'intravenosa',
        frequency: '8/8h',
        notes: 'Prescrição E2E da internação'
      }
    });
    const prescription = await expectJsonResponse<Prescription>(prescriptionResponse, 201);
    expect(prescription).toMatchObject({
      medicalRecordId: medicalRecord.record.id,
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      entryType: 'prescription',
      medicationName: 'Dipirona',
      dosage: '25 mg/kg',
      route: 'intravenosa',
      frequency: '8/8h'
    });
    expect(prescription.id).toEqual(expect.any(String));

    const prescriptionsResponse = await apiContext.get('/prescriptions', {
      params: { encounterId: fixture.encounterId }
    });
    const prescriptions = await expectJsonResponse<{ items: Prescription[] }>(
      prescriptionsResponse,
      200
    );
    expect(prescriptions.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: prescription.id, medicationName: 'Dipirona' })
      ])
    );

    const scheduledAt = '2030-01-15T12:00:00.000Z';
    const executionResponse = await apiContext.post('/prescription-executions', {
      data: {
        clinicalEntryId: prescription.id,
        patientId: fixture.patientId,
        encounterId: fixture.encounterId,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        route: prescription.route,
        frequency: prescription.frequency,
        scheduledAt,
        notes: 'Dose programada durante internação E2E'
      }
    });
    const execution = await expectJsonResponse<PrescriptionExecution>(executionResponse, 201);
    expect(execution).toMatchObject({
      clinicalEntryId: prescription.id,
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      medicationName: 'Dipirona',
      dosage: '25 mg/kg',
      scheduledAt,
      status: 'pending'
    });
    expect(execution.id).toEqual(expect.any(String));

    const administrationResponse = await apiContext.post(
      `/prescription-executions/${execution.id}/execute`,
      {
        data: {
          status: 'administered',
          notes: 'Dose administrada sem intercorrências.',
          vitalsSnapshot: { temperatureCelsius: 38.2 }
        }
      }
    );
    const administration = await expectJsonResponse<PrescriptionExecution>(
      administrationResponse,
      200
    );
    expect(administration).toMatchObject({
      id: execution.id,
      clinicalEntryId: prescription.id,
      status: 'administered',
      administeredBy: testUser.userId
    });
    expect(administration.administeredAt).toEqual(expect.any(String));

    const executionDetailResponse = await apiContext.get(
      `/prescription-executions/${execution.id}`
    );
    const executionDetail = await expectJsonResponse<
      PrescriptionExecution & { events: Array<{ eventType: string; actorId: string }> }
    >(executionDetailResponse, 200);
    expect(executionDetail).toMatchObject({ id: execution.id, status: 'administered' });
    expect(executionDetail.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'created' }),
        expect.objectContaining({ eventType: 'administered', actorId: testUser.userId })
      ])
    );

    const progressResponse = await apiContext.post(`/inpatient/${stay.id}/progress`, {
      data: { note: 'Paciente estável após administração da medicação.' }
    });
    const progress = await expectJsonResponse<{
      id: string;
      stayId: string;
      encounterId: string;
      note: string;
      authoredByUserId: string;
    }>(progressResponse, 201);
    expect(progress).toMatchObject({
      stayId: stay.id,
      encounterId: fixture.encounterId,
      note: 'Paciente estável após administração da medicação.',
      authoredByUserId: testUser.userId
    });
    expect(progress.id).toEqual(expect.any(String));

    const stableResponse = await apiContext.patch(`/inpatient/${stay.id}/update-status`, {
      data: { status: 'stable' }
    });
    const stableStay = await expectJsonResponse<InpatientStay>(stableResponse, 200);
    expect(stableStay).toMatchObject({
      id: stay.id,
      patientId: fixture.patientId,
      status: 'stable'
    });

    const dischargeReason = 'Paciente recuperado após observação E2E.';
    const dischargeResponse = await apiContext.patch(`/inpatient/${stay.id}/update-status`, {
      data: {
        status: 'discharged',
        dischargeReason
      }
    });
    const dischargedStay = await expectJsonResponse<InpatientStay>(dischargeResponse, 200);
    expect(dischargedStay).toMatchObject({
      id: stay.id,
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      status: 'discharged',
      dischargeReason
    });
    expect(dischargedStay.dischargedAt).toEqual(expect.any(String));

    const dischargedStaysResponse = await apiContext.get('/inpatient', {
      params: {
        patientId: fixture.patientId,
        includeDischarged: 'true'
      }
    });
    const dischargedStays = await expectJsonResponse<{ items: InpatientStay[] }>(
      dischargedStaysResponse,
      200
    );
    expect(dischargedStays.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: stay.id,
          status: 'discharged',
          dischargeReason
        })
      ])
    );

    const timelineResponse = await apiContext.get('/medical-records/timeline', {
      params: { encounterId: fixture.encounterId }
    });
    const timeline = await expectJsonResponse<{
      items: Array<{ eventType: string; encounterId: string; summary: string }>;
    }>(timelineResponse, 200);
    expect(timeline.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'inpatient_admitted'
        }),
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'inpatient_progressed'
        }),
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'inpatient_discharged'
        })
      ])
    );
  });
});
