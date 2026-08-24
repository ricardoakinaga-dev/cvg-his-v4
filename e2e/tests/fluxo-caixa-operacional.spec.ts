import { expect, test } from '../fixtures/cvg-his.fixture';
import type { APIRequestContext, APIResponse } from '@playwright/test';

type JsonObject = Record<string, unknown>;

type CashRegister = {
  id: string;
  accountId: string;
  status: 'open' | 'closed';
  openingAmount: number;
  closingAmount: number | null;
  expectedClosingAmount: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
};

type CashMovement = {
  id: string;
  cashRegisterId: string;
  movementType: 'opening' | 'closing' | 'payment' | 'supply' | 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  runningBalance: number;
  reference: string | null;
  notes: string | null;
};

type CashDashboard = {
  openRegister: {
    id: string;
    status: 'open' | 'closed';
    openingAmount: number;
    runningBalance: number;
  } | null;
  lastClosedRegister: {
    id: string;
    closingAmount: number | null;
    expectedClosingAmount: number | null;
    difference: number | null;
  } | null;
  totals: {
    totalEntradas: number;
    totalSaidas: number;
    totalEmGaveta: number;
  };
  movements: CashMovement[];
  recentRegisters: Array<{
    id: string;
    closingAmount: number | null;
    expectedClosingAmount: number | null;
    difference: number | null;
  }>;
};

type CashReconciliation = {
  registerId: string;
  accountId: string;
  status: 'open' | 'closed';
  openingAmount: number;
  expectedAmount: number;
  declaredAmount: number | null;
  difference: number | null;
  totalIn: number;
  totalOut: number;
  movementCount: number;
  reconciledAt: string;
};

type CashReceipt = {
  id: string;
  accountId: string;
  encounterId: string;
  billingRecordId: string;
  cashRegisterId: string;
  cashMovementId: string;
  receivedByUserId: string;
  amount: number;
  currency: string;
  receivedAt: string;
};

async function expectJson<T>(response: APIResponse, operation: string): Promise<T> {
  const raw = await response.text();
  let payload: unknown = raw;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep the raw body in the assertion message when the API did not return JSON.
  }

  expect(
    response.ok(),
    `${operation} failed with HTTP ${response.status()}: ${JSON.stringify(payload)}`
  ).toBeTruthy();

  return payload as T;
}

async function closeRegisterAfterFailure(
  apiContext: APIRequestContext,
  registerId: string | undefined
): Promise<void> {
  if (!registerId) return;

  const dashboardResponse = await apiContext.get('/cash-register/dashboard');
  if (!dashboardResponse.ok()) return;

  const dashboard = (await dashboardResponse.json()) as CashDashboard;
  if (dashboard.openRegister?.id !== registerId) return;

  const reconciliationResponse = await apiContext.get('/cash-register/reconciliation', {
    params: { registerId }
  });
  if (!reconciliationResponse.ok()) return;

  const reconciliation = (await reconciliationResponse.json()) as CashReconciliation;
  if (!Number.isFinite(reconciliation.expectedAmount) || reconciliation.expectedAmount <= 0) return;

  await apiContext.post('/cash-register/close', {
    data: {
      closingAmount: reconciliation.expectedAmount,
      notes: 'Limpeza de segurança do fluxo E2E de caixa'
    }
  });
}

test.describe('Fluxo operacional de caixa e financeiro', () => {
  test('abre, movimenta, recebe, fecha e reconcilia a gaveta com recibo idempotente', async ({
    apiContext,
    testUser,
    createOwner,
    createPatient,
    createEncounter
  }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const openingAmount = 100;
    const supplyAmount = 50;
    const withdrawalAmount = 20;
    const depositAmount = 10;
    const receiptAmount = 40;
    const expectedClosingAmount =
      openingAmount + supplyAmount - withdrawalAmount - depositAmount + receiptAmount;
    let registerId: string | undefined;

    const initialDashboard = await expectJson<CashDashboard>(
      await apiContext.get('/cash-register/dashboard'),
      'Verificar estado inicial da gaveta'
    );
    expect(
      initialDashboard.openRegister,
      'A fixture E2E deve iniciar sem caixa aberto; uma gaveta preexistente torna o saldo não determinístico'
    ).toBeNull();

    try {
      const owner = await createOwner(`Tutor caixa operacional ${suffix}`);
      const patient = await createPatient(owner.id, `Paciente caixa operacional ${suffix}`);
      const encounter = await createEncounter(patient.id, owner.id);

      await expectJson<JsonObject>(
        await apiContext.post('/billing/estimate', {
          data: {
            encounterId: encounter.id,
            administrativeNotes: `Estimativa do fluxo operacional de caixa ${suffix}`
          }
        }),
        'Criar estimativa financeira do atendimento'
      );

      const billingItem = await expectJson<{ id: string; totalAmount: number }>(
        await apiContext.post('/billing/items', {
          data: {
            encounterId: encounter.id,
            itemType: 'service',
            description: `Consulta paga no caixa ${suffix}`,
            quantity: 1,
            unitPriceAmount: receiptAmount
          }
        }),
        'Criar item faturável para o recibo'
      );
      expect(billingItem.totalAmount).toBe(receiptAmount);

      const closedEncounter = await expectJson<{ id: string; status: string }>(
        await apiContext.post(`/encounters/${encounter.id}/close`, {
          data: { closeReason: 'Atendimento concluído para recebimento E2E' }
        }),
        'Fechar atendimento antes do recebimento'
      );
      expect(closedEncounter).toMatchObject({ id: encounter.id, status: 'closed' });

      const openedBilling = await expectJson<{ id: string; status: string }>(
        await apiContext.patch(`/billing/${encounter.id}/status`, {
          data: { status: 'open' }
        }),
        'Abrir cobrança para recebimento no caixa'
      );
      expect(openedBilling.status).toBe('open');

      const opened = await expectJson<CashRegister>(
        await apiContext.post('/cash-register/open', {
          data: {
            openingAmount,
            notes: `Abertura operacional E2E ${suffix}`
          }
        }),
        'Abrir caixa operacional'
      );
      registerId = opened.id;
      expect(opened).toMatchObject({
        accountId: expect.any(String),
        id: expect.any(String),
        status: 'open',
        openingAmount,
        closingAmount: null,
        expectedClosingAmount: null,
        difference: null
      });

      const supplied = await expectJson<CashMovement>(
        await apiContext.post('/cash-register/movements', {
          data: {
            movementType: 'supply',
            amount: supplyAmount,
            reference: `SUP-${suffix}`,
            notes: 'Suprimento de abertura'
          }
        }),
        'Registrar suprimento de caixa'
      );
      expect(supplied).toMatchObject({
        cashRegisterId: registerId,
        movementType: 'supply',
        amount: supplyAmount,
        runningBalance: openingAmount + supplyAmount
      });

      const withdrawal = await expectJson<CashMovement>(
        await apiContext.post('/cash-register/movements', {
          data: {
            movementType: 'withdrawal',
            amount: withdrawalAmount,
            reference: `SANGRIA-${suffix}`,
            notes: 'Sangria operacional'
          }
        }),
        'Registrar sangria de caixa'
      );
      expect(withdrawal).toMatchObject({
        cashRegisterId: registerId,
        movementType: 'withdrawal',
        amount: withdrawalAmount,
        runningBalance: openingAmount + supplyAmount - withdrawalAmount
      });

      const deposit = await expectJson<CashMovement>(
        await apiContext.post('/cash-register/movements', {
          data: {
            movementType: 'deposit',
            amount: depositAmount,
            reference: `DEP-${suffix}`,
            notes: 'Depósito bancário operacional'
          }
        }),
        'Registrar depósito bancário de caixa'
      );
      expect(deposit).toMatchObject({
        cashRegisterId: registerId,
        movementType: 'deposit',
        amount: depositAmount,
        runningBalance: openingAmount + supplyAmount - withdrawalAmount - depositAmount
      });

      const idempotencyKey = `e2e-cash-receipt-${suffix}`;
      const receiptResponse = await apiContext.post(`/encounters/${encounter.id}/cash-receipts`, {
        headers: { 'idempotency-key': idempotencyKey },
        data: {
          cashRegisterId: registerId,
          expectedAmount: receiptAmount,
          notes: `Recebimento em dinheiro ${suffix}`
        }
      });
      const receipt = await expectJson<CashReceipt>(
        receiptResponse,
        'Registrar recibo financeiro no caixa'
      );
      expect(receipt).toMatchObject({
        id: expect.any(String),
        accountId: expect.any(String),
        encounterId: encounter.id,
        billingRecordId: expect.any(String),
        cashRegisterId: registerId,
        cashMovementId: expect.any(String),
        receivedByUserId: testUser.userId ?? expect.any(String),
        amount: receiptAmount,
        currency: 'BRL'
      });

      const retriedReceiptResponse = await apiContext.post(
        `/encounters/${encounter.id}/cash-receipts`,
        {
          headers: { 'idempotency-key': idempotencyKey },
          data: {
            cashRegisterId: registerId,
            expectedAmount: receiptAmount,
            notes: `Recebimento em dinheiro ${suffix}`
          }
        }
      );
      expect(retriedReceiptResponse.status()).toBe(receiptResponse.status());
      const retriedReceipt = await expectJson<CashReceipt>(
        retriedReceiptResponse,
        'Repetir recibo financeiro com a mesma chave de idempotência'
      );
      expect(retriedReceipt).toEqual(receipt);

      const dashboardBeforeClose = await expectJson<CashDashboard>(
        await apiContext.get('/cash-register/dashboard'),
        'Validar saldo da gaveta antes do fechamento'
      );
      expect(dashboardBeforeClose).toMatchObject({
        openRegister: {
          id: registerId,
          status: 'open',
          openingAmount,
          runningBalance: expectedClosingAmount
        },
        totals: {
          totalEntradas: openingAmount + supplyAmount + receiptAmount,
          totalSaidas: withdrawalAmount + depositAmount,
          totalEmGaveta: expectedClosingAmount
        }
      });
      const paymentMovements = dashboardBeforeClose.movements.filter(
        (movement) => movement.movementType === 'payment'
      );
      expect(paymentMovements).toHaveLength(1);
      expect(paymentMovements[0]).toMatchObject({
        id: receipt.cashMovementId,
        amount: receiptAmount,
        runningBalance: expectedClosingAmount
      });

      const reconciliationBeforeClose = await expectJson<CashReconciliation>(
        await apiContext.get('/cash-register/reconciliation', {
          params: { registerId }
        }),
        'Reconciliar saldo antes do fechamento'
      );
      expect(reconciliationBeforeClose).toMatchObject({
        registerId,
        accountId: receipt.accountId,
        status: 'open',
        openingAmount,
        expectedAmount: expectedClosingAmount,
        declaredAmount: null,
        difference: null,
        totalIn: openingAmount + supplyAmount + receiptAmount,
        totalOut: withdrawalAmount + depositAmount,
        movementCount: 5
      });
      expect(reconciliationBeforeClose.reconciledAt).toEqual(expect.any(String));

      const receiptByEncounter = await expectJson<CashReceipt>(
        await apiContext.get(`/encounters/${encounter.id}/cash-receipts`),
        'Recarregar recibo financeiro pelo atendimento'
      );
      expect(receiptByEncounter).toEqual(receipt);

      const receiptById = await expectJson<CashReceipt>(
        await apiContext.get(`/encounters/${encounter.id}/cash-receipts/${receipt.id}`),
        'Recarregar recibo financeiro pelo identificador'
      );
      expect(receiptById).toEqual(receipt);

      const closed = await expectJson<{ register: CashRegister; difference: number }>(
        await apiContext.post('/cash-register/close', {
          data: {
            closingAmount: expectedClosingAmount,
            notes: `Fechamento reconciliado E2E ${suffix}`
          }
        }),
        'Fechar caixa operacional'
      );
      expect(closed).toMatchObject({
        difference: 0,
        register: {
          id: registerId,
          status: 'closed',
          openingAmount,
          closingAmount: expectedClosingAmount,
          expectedClosingAmount,
          difference: 0,
          closedAt: expect.any(String)
        }
      });

      const reconciliationAfterClose = await expectJson<CashReconciliation>(
        await apiContext.get('/cash-register/reconciliation', {
          params: { registerId }
        }),
        'Reconciliar caixa fechado'
      );
      expect(reconciliationAfterClose).toMatchObject({
        registerId,
        accountId: receipt.accountId,
        status: 'closed',
        openingAmount,
        expectedAmount: expectedClosingAmount,
        declaredAmount: expectedClosingAmount,
        difference: 0,
        totalIn: openingAmount + supplyAmount + receiptAmount,
        totalOut: withdrawalAmount + depositAmount,
        movementCount: 6
      });

      const dashboardAfterClose = await expectJson<CashDashboard>(
        await apiContext.get('/cash-register/dashboard'),
        'Validar dashboard após fechamento reconciliado'
      );
      expect(dashboardAfterClose).toMatchObject({
        openRegister: null,
        lastClosedRegister: {
          id: registerId,
          closingAmount: expectedClosingAmount,
          expectedClosingAmount,
          difference: 0
        },
        totals: {
          totalEmGaveta: 0
        }
      });
      expect(dashboardAfterClose.recentRegisters.some((register) => register.id === registerId)).toBe(
        true
      );

    } finally {
      await closeRegisterAfterFailure(apiContext, registerId);
    }
  });
});
