import { expect, test } from '../fixtures/cvg-his.fixture';
import type { APIRequestContext, APIResponse } from '@playwright/test';

type JsonObject = Record<string, unknown>;

type Profession = JsonObject & {
  id: string;
  accountId: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
};

type StaffMember = JsonObject & {
  id: string;
  fullName: string;
  department: string;
  jobTitle: string;
  professionId: string | null;
  status: 'active' | 'inactive';
};

type BillingItem = JsonObject & {
  id: string;
  description: string;
  itemType: string;
  totalAmount: number;
  createdAt: string;
};

type CommissionLine = JsonObject & {
  staffId: string;
  staffName: string;
  department: string | null;
  jobTitle: string | null;
  professionId: string | null;
  professionName: string | null;
  itemKind: string;
  sourceType: string;
  sourceId: string;
  sourceDescription: string;
  baseAmount: number;
};

type CommissionCalculation = JsonObject & {
  id: string;
  status: 'draft' | 'reviewed' | 'paid' | 'cancelled';
  totalBaseAmount: number;
  totalCommissionAmount: number;
  payableId: string | null;
  lines: CommissionLine[];
};

type LaboratoryHistoryEvent = JsonObject & {
  eventType: string;
  status: string;
  attempt: number;
  reason?: string;
};

type LaboratoryOrder = JsonObject & {
  id: string;
  status: 'requested' | 'collected' | 'in_analysis' | 'reported' | 'delivered' | 'cancelled';
  collectionAttempt: number;
  workflowVersion: number;
  history: LaboratoryHistoryEvent[];
  signatureHash?: string;
  signedByUserId?: string;
  resultSummary?: string;
  deliveryChannel?: string;
  recollectionReason?: string;
};

async function expectJson<T extends JsonObject>(
  response: APIResponse,
  operation: string
): Promise<T> {
  const raw = await response.text();
  let payload: unknown = raw;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }

  expect(
    response.ok(),
    `${operation} failed with HTTP ${response.status()}: ${JSON.stringify(payload)}`
  ).toBeTruthy();

  return payload as T;
}

async function readCanonicalLaboratoryOrder(
  apiContext: APIRequestContext,
  orderId: string,
  encounterId: string
): Promise<LaboratoryOrder> {
  const detail = await expectJson<LaboratoryOrder>(
    await apiContext.get(`/laboratory/orders/${orderId}`),
    `Reload laboratory order ${orderId}`
  );

  const list = await expectJson<{ items: LaboratoryOrder[] }>(
    await apiContext.get('/laboratory/orders', { params: { encounterId } }),
    `List laboratory orders for encounter ${encounterId}`
  );
  const listed = list.items.find((item) => item.id === orderId);
  expect(listed, `Laboratory order ${orderId} must remain visible in the list`).toBeDefined();
  expect(listed?.status).toBe(detail.status);
  expect(listed?.collectionAttempt).toBe(detail.collectionAttempt);
  expect(listed?.history).toHaveLength(detail.history.length);

  return detail;
}

async function ensureOpenCashRegister(
  apiContext: APIRequestContext,
  suffix: string
): Promise<string> {
  const dashboard = await expectJson<{
    openRegister?: { id?: string } | null;
  }>(
    await apiContext.get('/cash-register/dashboard'),
    'Read cash register dashboard before billing settlement'
  );

  if (dashboard.openRegister?.id) return dashboard.openRegister.id;

  const opened = await expectJson<{ id: string }>(
    await apiContext.post('/cash-register/open', {
      data: {
        openingAmount: 100,
        notes: `E2E authoritative commission ${suffix}`
      }
    }),
    'Open cash register for billing settlement'
  );
  expect(opened.id).toBeTruthy();
  return opened.id;
}

test.describe('Fluxos canônicos: comissão autoritativa e laboratório', () => {
  test('comissão usa profissão, staff e billing item persistidos antes de pagar o payable', async ({
    apiContext,
    createOwner,
    createPatient,
    createEncounter
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const profession = await expectJson<Profession>(
      await apiContext.post('/professions', {
        data: {
          code: `VET-E2E-${suffix}`,
          name: `Veterinário E2E ${suffix}`,
          description: 'Profissão persistente para o fluxo autoritativo de comissão'
        }
      }),
      'Create persistent profession'
    );
    expect(profession.id).toBeTruthy();
    expect(profession.status).toBe('active');

    const persistedProfessions = await expectJson<{ items: Profession[] }>(
      await apiContext.get('/professions'),
      'Reload persistent professions'
    );
    expect(persistedProfessions.items.some((item) => item.id === profession.id)).toBeTruthy();

    const staff = await expectJson<StaffMember>(
      await apiContext.post('/staff', {
        data: {
          employeeCode: `STAFF-E2E-${suffix}`,
          fullName: `Dra. Autoritativa ${suffix}`,
          department: 'Clinica',
          jobTitle: 'Medico Veterinario',
          professionId: profession.id
        }
      }),
      'Create active staff linked to persistent profession'
    );
    expect(staff.id).toBeTruthy();
    expect(staff.status).toBe('active');
    expect(staff.professionId).toBe(profession.id);

    const persistedStaff = await expectJson<{ items: StaffMember[] }>(
      await apiContext.get('/staff'),
      'Reload staff registry'
    );
    const listedStaff = persistedStaff.items.find((item) => item.id === staff.id);
    expect(listedStaff).toMatchObject({
      id: staff.id,
      status: 'active',
      professionId: profession.id
    });

    const owner = await createOwner(`Tutor Comissão ${suffix}`);
    const patient = await createPatient(owner.id, `Paciente Comissão ${suffix}`);
    const encounter = await createEncounter(patient.id, owner.id);

    const estimate = await expectJson<JsonObject>(
      await apiContext.post('/billing/estimate', {
        data: {
          encounterId: encounter.id,
          administrativeNotes: 'Estimativa do atendimento do fluxo de comissão'
        }
      }),
      'Create encounter billing estimate'
    );
    expect(estimate.encounterId).toBe(encounter.id);
    expect(estimate.status).toBe('estimated');

    const billingItem = await expectJson<BillingItem>(
      await apiContext.post('/billing/items', {
        data: {
          encounterId: encounter.id,
          itemType: 'service',
          description: `Consulta autoritativa ${suffix}`,
          quantity: 1,
          unitPriceAmount: 250
        }
      }),
      'Create persisted billing item for encounter'
    );
    expect(billingItem.id).toBeTruthy();
    expect(billingItem.totalAmount).toBe(250);
    expect(billingItem.createdAt).toEqual(expect.any(String));

    const closedEncounter = await expectJson<JsonObject>(
      await apiContext.post(`/encounters/${encounter.id}/close`, {
        data: { closeReason: 'Atendimento concluído para liquidação E2E' }
      }),
      'Close encounter before cash receipt'
    );
    expect(closedEncounter.status).toBe('closed');

    const openedBilling = await expectJson<JsonObject>(
      await apiContext.patch(`/billing/${encounter.id}/status`, {
        data: { status: 'open' }
      }),
      'Open billing record before cash receipt'
    );
    expect(openedBilling.status).toBe('open');

    const cashRegisterId = await ensureOpenCashRegister(apiContext, suffix);
    const receipt = await expectJson<JsonObject>(
      await apiContext.post(`/encounters/${encounter.id}/cash-receipts`, {
        headers: { 'idempotency-key': `e2e-commission-receipt-${suffix}` },
        data: {
          cashRegisterId,
          expectedAmount: billingItem.totalAmount,
          notes: 'Liquidação do billing item no fluxo autoritativo'
        }
      }),
      'Settle billing item through encounter cash receipt'
    );
    expect(receipt.billingRecordId).toBeTruthy();
    expect(receipt.encounterId).toBe(encounter.id);
    expect(receipt.amount).toBe(billingItem.totalAmount);

    const settledBilling = await expectJson<JsonObject>(
      await apiContext.get(`/billing/${encounter.id}`),
      'Reload settled billing record'
    );
    expect(settledBilling.status).toBe('settled');

    const rule = await expectJson<JsonObject>(
      await apiContext.post('/commission-rules', {
        data: {
          description: `Regra comissão autoritativa ${suffix}`,
          staffId: staff.id,
          itemKind: 'service',
          percentage: 10
        }
      }),
      'Create staff commission rule'
    );
    expect(rule.staffId).toBe(staff.id);
    expect(rule.isActive).toBe(true);

    const periodDate = billingItem.createdAt.slice(0, 10);
    const calculation = await expectJson<CommissionCalculation>(
      await apiContext.post('/commission-calculations', {
        data: {
          periodStart: periodDate,
          periodEnd: periodDate,
          lines: [
            {
              staffId: staff.id,
              staffName: staff.fullName,
              department: staff.department,
              jobTitle: staff.jobTitle,
              itemKind: 'service',
              sourceType: 'billing_item',
              sourceId: billingItem.id,
              sourceDescription: billingItem.description,
              baseAmount: billingItem.totalAmount,
              occurredAt: periodDate
            }
          ],
          notes: 'Snapshot autoritativo validado pelo E2E'
        }
      }),
      'Calculate commission from settled billing item'
    );
    expect(calculation.status).toBe('draft');
    expect(calculation.totalBaseAmount).toBe(billingItem.totalAmount);
    expect(calculation.totalCommissionAmount).toBe(25);
    expect(calculation.lines).toHaveLength(1);

    const authoritativeLine = calculation.lines[0];
    expect(authoritativeLine).toMatchObject({
      staffId: staff.id,
      staffName: staff.fullName,
      department: staff.department,
      jobTitle: staff.jobTitle,
      professionId: profession.id,
      professionName: profession.name,
      itemKind: 'service',
      sourceType: 'billing_item',
      sourceId: billingItem.id,
      sourceDescription: billingItem.description,
      baseAmount: billingItem.totalAmount
    });

    const reloadedCalculation = await expectJson<CommissionCalculation>(
      await apiContext.get(`/commission-calculations/${calculation.id}`),
      'Reload commission calculation and authoritative snapshot'
    );
    expect(reloadedCalculation.lines[0]).toMatchObject({
      professionId: profession.id,
      professionName: profession.name,
      sourceId: billingItem.id,
      baseAmount: billingItem.totalAmount
    });

    const reviewed = await expectJson<CommissionCalculation>(
      await apiContext.post(`/commission-calculations/${calculation.id}/review`),
      'Review commission calculation'
    );
    expect(reviewed.status).toBe('reviewed');

    const paid = await expectJson<CommissionCalculation>(
      await apiContext.post(`/commission-calculations/${calculation.id}/pay`, {
        data: {
          paymentMethod: 'bank_transfer',
          paymentReference: `E2E-COMMISSION-${suffix}`
        }
      }),
      'Pay reviewed commission calculation through payable'
    );
    expect(paid.status).toBe('paid');
    expect(paid.payableId).toBeTruthy();

    const payables = await expectJson<{ data: JsonObject[] }>(
      await apiContext.get('/financial/payables', {
        params: { search: staff.fullName, pageSize: 100 }
      }),
      'Reload financial payables after commission payment'
    );
    const payable = payables.data.find((item) => item.id === paid.payableId);
    expect(payable).toMatchObject({
      id: paid.payableId,
      status: 'paid',
      totalAmount: 25,
      paidAmount: 25,
      outstandingAmount: 0,
      sourceExpenseId: calculation.id
    });
  });

  test('laboratório percorre pedido, coleta, análise, laudo assinado, entrega e recoleta persistida', async ({
    apiContext,
    testUser,
    createOwner,
    createPatient,
    createEncounter
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    expect(testUser.userId, 'The authenticated fixture must expose the actor user id').toBeTruthy();
    const actorUserId = testUser.userId as string;

    const catalog = await expectJson<{
      items: Array<{ id: string; code: string; name: string; category: string }>;
    }>(
      await apiContext.get('/laboratory/catalog'),
      'Read laboratory catalog before creating the order'
    );
    const catalogEntry = catalog.items.find((item) => item.category === 'Laboratorial') ?? catalog.items[0];
    expect(catalogEntry, 'The laboratory catalog must expose a real exam entry').toBeDefined();

    const owner = await createOwner(`Tutor Laboratório ${suffix}`);
    const patient = await createPatient(owner.id, `Paciente Laboratório ${suffix}`);
    const encounter = await createEncounter(patient.id, owner.id);

    const requested = await expectJson<JsonObject & { id: string; status: 'requested' }>(
      await apiContext.post('/laboratory/orders', {
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          examType: catalogEntry?.code ?? `E2E-${suffix}`,
          examCatalogId: catalogEntry?.id,
          reason: `Pedido laboratorial canônico ${suffix}`
        }
      }),
      'Create canonical laboratory order'
    );
    expect(requested.id).toBeTruthy();
    expect(requested.status).toBe('requested');
    const orderId = requested.id;

    const requestedReloaded = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(requestedReloaded.status).toBe('requested');
    expect(requestedReloaded.collectionAttempt).toBe(0);
    expect(requestedReloaded.workflowVersion).toBe(2);
    expect(requestedReloaded.history).toEqual([]);

    const collectedResponse = await expectJson<LaboratoryOrder>(
      await apiContext.post(`/laboratory/orders/${orderId}/result`, {
        data: { status: 'collected' }
      }),
      'Collect laboratory sample'
    );
    expect(collectedResponse.status).toBe('collected');
    const collected = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(collected.status).toBe('collected');
    expect(collected.collectionAttempt).toBe(1);
    expect(collected.history.at(-1)).toMatchObject({ eventType: 'collected', status: 'collected' });

    const analysisResponse = await expectJson<LaboratoryOrder>(
      await apiContext.post(`/laboratory/orders/${orderId}/result`, {
        data: { status: 'in_analysis' }
      }),
      'Move laboratory sample to analysis'
    );
    expect(analysisResponse.status).toBe('in_analysis');
    const inAnalysis = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(inAnalysis.status).toBe('in_analysis');
    expect(inAnalysis.history.at(-1)).toMatchObject({ eventType: 'in_analysis', status: 'in_analysis' });

    const reportSummary = `Laudo assinado E2E ${suffix}: parâmetros dentro da referência.`;
    const reportedResponse = await expectJson<LaboratoryOrder>(
      await apiContext.post(`/laboratory/orders/${orderId}/result`, {
        data: {
          status: 'reported',
          resultSummary: reportSummary,
          signedByUserId: actorUserId
        }
      }),
      'Report and sign laboratory result'
    );
    expect(reportedResponse.status).toBe('reported');
    const reported = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(reported.status).toBe('reported');
    expect(reported.resultSummary).toBe(reportSummary);
    expect(reported.signedByUserId).toBe(actorUserId);
    expect(reported.signatureHash).toEqual(expect.any(String));
    expect(reported.history.at(-1)).toMatchObject({ eventType: 'reported', status: 'reported' });

    const deliveredResponse = await expectJson<LaboratoryOrder>(
      await apiContext.post(`/laboratory/orders/${orderId}/result`, {
        data: {
          status: 'delivered',
          deliveryChannel: 'portal'
        }
      }),
      'Deliver signed laboratory report'
    );
    expect(deliveredResponse.status).toBe('delivered');
    const delivered = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(delivered.status).toBe('delivered');
    expect(delivered.deliveryChannel).toBe('portal');
    expect(delivered.history.at(-1)).toMatchObject({ eventType: 'delivered', status: 'delivered' });

    const recollectionReason = `Recoleta solicitada por amostra insuficiente ${suffix}`;
    const recollectedResponse = await expectJson<LaboratoryOrder>(
      await apiContext.post(`/laboratory/orders/${orderId}/recollect`, {
        data: { reason: recollectionReason }
      }),
      'Recollect laboratory sample with reason'
    );
    expect(recollectedResponse.status).toBe('collected');
    expect(recollectedResponse.collectionAttempt).toBe(2);
    expect(recollectedResponse.recollectionReason).toBe(recollectionReason);

    const recollected = await readCanonicalLaboratoryOrder(apiContext, orderId, encounter.id);
    expect(recollected.status).toBe('collected');
    expect(recollected.collectionAttempt).toBe(2);
    expect(recollected.recollectionReason).toBe(recollectionReason);
    expect(recollected.resultSummary ?? null).toBeNull();
    expect(recollected.signatureHash ?? null).toBeNull();
    expect(recollected.history.at(-1)).toMatchObject({
      eventType: 'recollected',
      status: 'collected',
      attempt: 2,
      reason: recollectionReason
    });
    expect(recollected.history.map((event) => event.eventType)).toEqual([
      'collected',
      'in_analysis',
      'reported',
      'delivered',
      'recollected'
    ]);
  });
});
