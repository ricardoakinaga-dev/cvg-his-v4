import type { APIRequestContext, APIResponse } from '@playwright/test';

import { test, expect } from '../fixtures/cvg-his.fixture';

type ClinicalFixture = {
  ownerId: string;
  patientId: string;
  encounterId: string;
};

type DiagnosticOrder = {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  examType: string;
  examCatalogId?: string;
  reason: string;
  status: 'requested' | 'collected' | 'resulted' | 'cancelled';
  collectedAt?: string;
  collectedByUserId?: string;
  resultSummary?: string;
  resultedAt?: string;
  releasedByUserId?: string;
  signedByUserId?: string;
  signatureHash?: string;
};

type ExamCatalogEntry = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type ClinicalTimelineEvent = {
  encounterId: string;
  eventType: string;
  summary: string;
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

async function createClinicalFixture(
  apiContext: APIRequestContext,
  marker: string
): Promise<ClinicalFixture> {
  const ownerName = `Tutor E2E Exames ${marker}`;
  const ownerResponse = await apiContext.post('/owners', {
    data: {
      fullName: ownerName,
      contacts: [
        {
          label: 'Celular',
          value: '+55 11 98888-7766',
          type: 'whatsapp',
          primary: true
        }
      ],
      financialResponsible: true
    }
  });
  const owner = await expectJsonResponse<{ id: string; fullName: string }>(ownerResponse, 201);
  expect(owner).toMatchObject({ fullName: ownerName });
  expect(owner.id).toEqual(expect.any(String));

  const patientName = `Paciente E2E Exames ${marker}`;
  const patientResponse = await apiContext.post('/patients', {
    data: {
      primaryOwnerId: owner.id,
      name: patientName,
      species: 'canine',
      breed: 'Labrador',
      sex: 'male'
    }
  });
  const patient = await expectJsonResponse<{
    id: string;
    name: string;
    primaryOwnerId: string;
  }>(patientResponse, 201);
  expect(patient).toMatchObject({ name: patientName, primaryOwnerId: owner.id });
  expect(patient.id).toEqual(expect.any(String));

  const encounterReason = `Investigação diagnóstica E2E ${marker}`;
  const encounterResponse = await apiContext.post('/encounters', {
    data: {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: encounterReason
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
    reason: encounterReason
  });
  expect(encounter.id).toEqual(expect.any(String));

  return {
    ownerId: owner.id,
    patientId: patient.id,
    encounterId: encounter.id
  };
}

test.describe('Fluxo: Exame → Resultado → Prontuário', () => {
  test('solicita, coleta, libera e registra o exame no prontuário', async ({
    apiContext,
    testUser
  }) => {
    const fixture = await createClinicalFixture(apiContext, 'Hemograma');

    const catalogResponse = await apiContext.get('/diagnostics/catalog');
    const catalog = await expectJsonResponse<{ items: ExamCatalogEntry[] }>(catalogResponse, 200);
    expect(catalog.items).toEqual(expect.any(Array));
    const hemogram = catalog.items.find((item) => item.code === 'HEM')!;
    expect(hemogram).toMatchObject({ code: 'HEM', category: 'Laboratorial' });

    const createOrderResponse = await apiContext.post('/diagnostics/orders', {
      data: {
        encounterId: fixture.encounterId,
        patientId: fixture.patientId,
        examType: hemogram.name,
        examCatalogId: hemogram.id,
        reason: 'Check-up hematológico E2E'
      }
    });
    const order = await expectJsonResponse<DiagnosticOrder>(createOrderResponse, 201);
    expect(order).toMatchObject({
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      examType: hemogram.name,
      examCatalogId: hemogram.id,
      reason: 'Check-up hematológico E2E',
      status: 'requested'
    });
    expect(order.id).toEqual(expect.any(String));

    const listOrdersResponse = await apiContext.get('/diagnostics/orders', {
      params: { encounterId: fixture.encounterId }
    });
    const listedOrders = await expectJsonResponse<{ items: DiagnosticOrder[] }>(
      listOrdersResponse,
      200
    );
    expect(listedOrders.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: order.id, status: 'requested' })])
    );

    const collectResponse = await apiContext.post(`/diagnostics/orders/${order.id}/result`, {
      data: {
        status: 'collected',
        collectedByUserId: testUser.userId
      }
    });
    const collected = await expectJsonResponse<DiagnosticOrder>(collectResponse, 200);
    expect(collected).toMatchObject({
      id: order.id,
      status: 'collected',
      collectedByUserId: testUser.userId
    });
    expect(collected.collectedAt).toEqual(expect.any(String));

    const resultSummary = 'Hemácias, leucócitos e plaquetas dentro dos parâmetros de referência.';
    const releaseResponse = await apiContext.post(`/diagnostics/orders/${order.id}/result`, {
      data: {
        status: 'resulted',
        resultSummary,
        signedByUserId: testUser.userId
      }
    });
    const released = await expectJsonResponse<DiagnosticOrder>(releaseResponse, 200);
    expect(released).toMatchObject({
      id: order.id,
      status: 'resulted',
      resultSummary,
      releasedByUserId: testUser.userId,
      signedByUserId: testUser.userId
    });
    expect(released.resultedAt).toEqual(expect.any(String));
    expect(released.signatureHash).toMatch(/^[a-f0-9]{64}$/);

    const resultsResponse = await apiContext.get('/diagnostics/results', {
      params: {
        patientId: fixture.patientId,
        examType: hemogram.name
      }
    });
    const results = await expectJsonResponse<{ items: DiagnosticOrder[] }>(resultsResponse, 200);
    expect(results.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: order.id, status: 'resulted', resultSummary })
      ])
    );

    const printableResponse = await apiContext.get(`/laboratory/reports/${order.id}/print`);
    const printable = await expectJsonResponse<{ html: string }>(printableResponse, 200);
    expect(printable.html).toContain('Laudo Laboratorial');
    expect(printable.html).toContain(resultSummary);
    expect(printable.html).toContain(released.signatureHash);

    const timelineResponse = await apiContext.get('/medical-records/timeline', {
      params: { encounterId: fixture.encounterId }
    });
    const timeline = await expectJsonResponse<{ items: ClinicalTimelineEvent[] }>(
      timelineResponse,
      200
    );
    expect(timeline.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'diagnostic_requested'
        }),
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'diagnostic_collected'
        }),
        expect.objectContaining({
          encounterId: fixture.encounterId,
          eventType: 'diagnostic_resulted'
        })
      ])
    );

    const summaryResponse = await apiContext.get('/diagnostics/summary');
    const summary = await expectJsonResponse<{
      totalOrders: number;
      pendingOrders: number;
      pendingResults: number;
      releasedResults: number;
      equipmentActive: number;
    }>(summaryResponse, 200);
    expect(summary.totalOrders).toBeGreaterThanOrEqual(1);
    expect(summary.releasedResults).toBeGreaterThanOrEqual(1);
    expect(summary.equipmentActive).toBeGreaterThanOrEqual(1);
  });

  test('solicita exame de imagem pelo catálogo atual', async ({ apiContext }) => {
    const fixture = await createClinicalFixture(apiContext, 'Radiografia');

    const catalogResponse = await apiContext.get('/diagnostics/catalog');
    const catalog = await expectJsonResponse<{ items: ExamCatalogEntry[] }>(catalogResponse, 200);
    expect(catalog.items).toEqual(expect.any(Array));
    const radiography = catalog.items.find((item) => item.code === 'RX')!;
    expect(radiography).toMatchObject({ code: 'RX', category: 'Imagem' });

    const createOrderResponse = await apiContext.post('/diagnostics/orders', {
      data: {
        encounterId: fixture.encounterId,
        patientId: fixture.patientId,
        examType: radiography.name,
        examCatalogId: radiography.id,
        reason: 'Suspeita de pneumonia; avaliação urgente.'
      }
    });
    const order = await expectJsonResponse<DiagnosticOrder>(createOrderResponse, 201);
    expect(order).toMatchObject({
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      examType: radiography.name,
      examCatalogId: radiography.id,
      reason: 'Suspeita de pneumonia; avaliação urgente.',
      status: 'requested'
    });
    expect(order.id).toEqual(expect.any(String));

    const detailResponse = await apiContext.get(`/diagnostics/orders/${order.id}`);
    const detail = await expectJsonResponse<DiagnosticOrder>(detailResponse, 200);
    expect(detail).toMatchObject({
      id: order.id,
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      examCatalogId: radiography.id,
      status: 'requested'
    });
  });
});
