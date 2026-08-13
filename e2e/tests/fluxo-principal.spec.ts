import { randomUUID } from 'node:crypto';

import type { APIResponse } from '@playwright/test';

import { expect, test } from '../fixtures/cvg-his.fixture';

async function expectJsonResponse<T>(response: APIResponse, expectedStatus: number): Promise<T> {
  const rawBody = await response.text();
  expect(response.status(), `Resposta inesperada de ${response.url()}: ${rawBody}`).toBe(
    expectedStatus
  );
  expect(rawBody, `Resposta sem JSON em ${response.url()}`).not.toBe('');
  return JSON.parse(rawBody) as T;
}

function futureOperationalSlot(daysFromNow: number, hourUtc: number): string {
  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + daysFromNow);
  slot.setUTCHours(hourUtc, 0, 0, 0);
  return slot.toISOString();
}

test.describe('Fluxo: Tutor → Paciente → Agendamento → Atendimento', () => {
  test('completa o fluxo principal usando os contratos atuais', async ({ apiContext }) => {
    const fixtureId = randomUUID();
    const ownerResponse = await apiContext.post('/owners', {
      data: {
        fullName: `Tutor Fluxo Principal ${fixtureId}`,
        documentId: `E2E-PRINCIPAL-${fixtureId}`,
        contacts: [
          {
            label: 'Celular',
            type: 'phone',
            value: '11987654321',
            primary: true
          }
        ],
        financialResponsible: true,
        status: 'active'
      }
    });
    const owner = await expectJsonResponse<{ id: string; fullName: string }>(ownerResponse, 201);
    expect(owner).toMatchObject({ fullName: `Tutor Fluxo Principal ${fixtureId}` });

    const patientResponse = await apiContext.post('/patients', {
      data: {
        primaryOwnerId: owner.id,
        name: `Paciente Fluxo Principal ${fixtureId}`,
        species: 'canine',
        breed: 'Golden Retriever',
        sex: 'male',
        birthDateApproximate: '2020-05-15',
        baseWeightKg: 30.5,
        microchip: `E2E-MICROCHIP-${fixtureId}`,
        status: 'active'
      }
    });
    const patient = await expectJsonResponse<{
      id: string;
      name: string;
      primaryOwnerId: string;
    }>(patientResponse, 201);
    expect(patient).toMatchObject({
      name: `Paciente Fluxo Principal ${fixtureId}`,
      primaryOwnerId: owner.id
    });

    const scheduledAt = futureOperationalSlot(3, 9);
    const appointmentResponse = await apiContext.post('/appointments', {
      data: {
        patientId: patient.id,
        ownerId: owner.id,
        scheduledAt,
        durationMinutes: 30,
        visitType: 'scheduled',
        reason: 'Consulta de rotina do fluxo principal E2E'
      }
    });
    const appointment = await expectJsonResponse<{
      id: string;
      patientId: string;
      ownerId: string;
      scheduledAt: string;
      status: string;
    }>(appointmentResponse, 201);
    expect(appointment).toMatchObject({
      patientId: patient.id,
      ownerId: owner.id,
      scheduledAt,
      status: 'scheduled'
    });

    const appointmentsResponse = await apiContext.get('/appointments', {
      params: { patientId: patient.id }
    });
    const appointments = await expectJsonResponse<{ items: Array<{ id: string }> }>(
      appointmentsResponse,
      200
    );
    expect(appointments.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: appointment.id })])
    );

    const encounterResponse = await apiContext.post(
      `/appointments/${appointment.id}/start-encounter`,
      { data: {} }
    );
    const encounter = await expectJsonResponse<{
      id: string;
      patientId: string;
      ownerId: string;
      appointmentId: string;
      status: string;
    }>(encounterResponse, 201);
    expect(encounter).toMatchObject({
      patientId: patient.id,
      ownerId: owner.id,
      appointmentId: appointment.id,
      status: 'reception'
    });

    const encounterDetailResponse = await apiContext.get(`/encounters/${encounter.id}`);
    const encounterDetail = await expectJsonResponse<typeof encounter>(
      encounterDetailResponse,
      200
    );
    expect(encounterDetail).toMatchObject(encounter);
  });

  test('lista tutores com envelope canônico', async ({ apiContext }) => {
    const response = await apiContext.get('/owners');
    const payload = await expectJsonResponse<{ items: unknown[] }>(response, 200);
    expect(payload.items).toEqual(expect.any(Array));
  });

  test('lista pacientes com envelope canônico', async ({ apiContext }) => {
    const response = await apiContext.get('/patients');
    const payload = await expectJsonResponse<{ items: unknown[] }>(response, 200);
    expect(payload.items).toEqual(expect.any(Array));
  });
});
