import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { handleFinancialRoutes } from '../../../apps/api/src/routes/financial-routes.ts';

class MockResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  end(payload?: string): this {
    this.body = payload ?? '';
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(this.body) as T;
  }
}

function createPrincipal() {
  return {
    user: {
      id: 'user-1',
      accountId: 'acc-1',
      email: 'finance@example.com'
    }
  };
}

function createJsonRequest(method: string, url: string, body?: unknown) {
  return Object.assign(Readable.from(body === undefined ? [] : [JSON.stringify(body)]), {
    method,
    url,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' }
  });
}

describe('financial-routes', () => {
  it('ignores unrelated paths', async () => {
    const response = new MockResponse();

    const handled = await handleFinancialRoutes(
      '/inventory',
      { method: 'GET', url: '/inventory' } as never,
      response as never,
      'corr-financial-1',
      {
        encounterFinancial: {} as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal: vi.fn(() => createPrincipal() as never)
      }
    );

    expect(handled).toBe(false);
    expect(response.body).toBe('');
  });

  it('lists receivables with parsed filters and permission checks', async () => {
    const response = new MockResponse();
    const listReceivables = vi.fn(async () => ({
      data: [
        {
          id: 'rec-1',
          installmentLabel: 'Parcela 1',
          amountOutstanding: 120
        }
      ],
      page: 2,
      pageSize: 5,
      total: 1,
      openCount: 1,
      settledCount: 0,
      totalOutstanding: 120,
      totalSettled: 0
    }));
    const requirePrincipal = vi.fn(() => createPrincipal() as never);

    const handled = await handleFinancialRoutes(
      '/financial/receivables',
      {
        method: 'GET',
        url: '/financial/receivables?status=open&encounterId=enc-1&search=tutor&page=2&pageSize=5'
      } as never,
      response as never,
      'corr-financial-2',
      {
        encounterFinancial: { listReceivables } as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal
      }
    );

    expect(handled).toBe(true);
    expect(requirePrincipal).toHaveBeenCalledWith(expect.anything(), 'billing.read');
    expect(listReceivables).toHaveBeenCalledWith({
      accountId: 'acc-1',
      status: 'open',
      encounterId: 'enc-1',
      search: 'tutor',
      page: 2,
      pageSize: 5
    });
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ totalOutstanding: number }>().totalOutstanding).toBe(120);
  });

  it('returns encounter financial summary with billing.read permission', async () => {
    const response = new MockResponse();
    const getSummary = vi.fn(async () => ({
      encounterId: 'enc-1',
      accountId: 'acc-1',
      financialStatus: 'pending',
      receivables: [],
      payments: []
    }));
    const requirePrincipal = vi.fn(() => createPrincipal() as never);

    const handled = await handleFinancialRoutes(
      '/encounters/enc-1/financial-summary',
      {
        method: 'GET',
        url: '/encounters/enc-1/financial-summary'
      } as never,
      response as never,
      'corr-financial-summary-1',
      {
        encounterFinancial: { getSummary } as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal
      }
    );

    expect(handled).toBe(true);
    expect(requirePrincipal).toHaveBeenCalledWith(expect.anything(), 'billing.read');
    expect(getSummary).toHaveBeenCalledWith('acc-1', 'enc-1');
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ encounterId: string }>().encounterId).toBe('enc-1');
  });

  it('closes encounter financial account without recording a payment', async () => {
    const response = new MockResponse();
    const closeEncounterFinancial = vi.fn(async () => ({
      encounterId: 'enc-1',
      financialStatus: 'partial',
      financialClosed: true
    }));
    const requirePrincipal = vi.fn(() => createPrincipal() as never);

    const handled = await handleFinancialRoutes(
      '/encounters/enc-1/financial-close',
      createJsonRequest('POST', '/encounters/enc-1/financial-close', {
        notes: 'Fechamento administrativo',
        installments: [
          {
            label: 'Entrada',
            amount: 100,
            dueAt: '2026-04-20T00:00:00.000Z',
            notes: 'Primeira parcela'
          }
        ]
      }) as never,
      response as never,
      'corr-financial-close-1',
      {
        encounterFinancial: { closeEncounterFinancial } as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal
      }
    );

    expect(handled).toBe(true);
    expect(requirePrincipal).toHaveBeenCalledWith(expect.anything(), 'billing.manage');
    expect(closeEncounterFinancial).toHaveBeenCalledWith('acc-1', 'enc-1', 'user-1', {
      notes: 'Fechamento administrativo',
      installments: [
        {
          label: 'Entrada',
          amount: 100,
          dueAt: '2026-04-20T00:00:00.000Z',
          notes: 'Primeira parcela'
        }
      ]
    });
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ financialClosed: boolean }>().financialClosed).toBe(true);
  });

  it.each([50, 0, null, '50'])(
    'rejects manual paidAmount %j during financial close',
    async (paidAmount) => {
      const response = new MockResponse();
      const closeEncounterFinancial = vi.fn();

      const handled = await handleFinancialRoutes(
        '/encounters/enc-1/financial-close',
        createJsonRequest('POST', '/encounters/enc-1/financial-close', {
          paidAmount,
          installments: [{ amount: 50 }]
        }) as never,
        response as never,
        'corr-financial-close-manual-payment',
        {
          encounterFinancial: { closeEncounterFinancial } as never,
          billing: {} as never,
          audit: { write: vi.fn() } as never,
          pixTransactions: { list: vi.fn() } as never,
          requirePrincipal: vi.fn(() => createPrincipal() as never)
        }
      );

      expect(handled).toBe(true);
      expect(closeEncounterFinancial).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(409);
      expect(response.bodyJson()).toEqual({
        code: 'MANUAL_SETTLEMENT_DISABLED',
        message:
          'Manual settlement is disabled. Record the receipt through the cash-receipts endpoint.',
        details: { receiptPath: '/encounters/:id/cash-receipts' },
        correlationId: 'corr-financial-close-manual-payment'
      });
    }
  );

  it('builds an aging report from open receivables across pages', async () => {
    const response = new MockResponse();
    const now = new Date();
    const futureDueAt = new Date(now);
    futureDueAt.setUTCDate(futureDueAt.getUTCDate() + 5);
    const overdueDueAt = new Date(now);
    overdueDueAt.setUTCDate(overdueDueAt.getUTCDate() - 40);
    const listReceivables = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: 'rec-current',
            encounterId: 'enc-1',
            installmentLabel: 'Entrada',
            dueAt: futureDueAt.toISOString(),
            amountOutstanding: 80,
            patientName: 'Belinha',
            ownerName: 'Ana',
            financialStatus: 'pending'
          }
        ],
        page: 1,
        pageSize: 100,
        total: 2,
        openCount: 2,
        settledCount: 0,
        totalOutstanding: 200,
        totalSettled: 0
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'rec-overdue',
            encounterId: 'enc-2',
            installmentLabel: 'Saldo',
            dueAt: overdueDueAt.toISOString(),
            amountOutstanding: 120,
            patientName: 'Thor',
            ownerName: 'Bruno',
            financialStatus: 'partial'
          }
        ],
        page: 2,
        pageSize: 100,
        total: 2,
        openCount: 2,
        settledCount: 0,
        totalOutstanding: 200,
        totalSettled: 0
      });

    const handled = await handleFinancialRoutes(
      '/financial/aging',
      {
        method: 'GET',
        url: '/financial/aging?search=pet'
      } as never,
      response as never,
      'corr-financial-3',
      {
        encounterFinancial: { listReceivables } as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal: vi.fn(() => createPrincipal() as never)
      }
    );

    expect(handled).toBe(true);
    expect(listReceivables).toHaveBeenNthCalledWith(1, {
      accountId: 'acc-1',
      status: 'open',
      search: 'pet',
      page: 1,
      pageSize: 100
    });
    expect(listReceivables).toHaveBeenNthCalledWith(2, {
      accountId: 'acc-1',
      status: 'open',
      search: 'pet',
      page: 2,
      pageSize: 100
    });

    const payload = response.bodyJson<{
      totalOpenCount: number;
      totalOpenAmount: number;
      currentAmount: number;
      overdueAmount: number;
      buckets: Array<{ bucket: string; count: number; amount: number }>;
    }>();
    expect(payload.totalOpenCount).toBe(2);
    expect(payload.totalOpenAmount).toBe(200);
    expect(payload.currentAmount).toBe(80);
    expect(payload.overdueAmount).toBe(120);
    expect(payload.buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bucket: 'current', count: 1, amount: 80 }),
        expect.objectContaining({ bucket: '31_60', count: 1, amount: 120 })
      ])
    );
  });

  it('builds reconciliation rows from PIX, billing and receivable links', async () => {
    const response = new MockResponse();
    const pixList = vi.fn(async () => [
      {
        transactionId: 'pix-1',
        provider: 'pagarme',
        status: 'completed',
        amount: 150,
        currency: 'BRL',
        description: 'Pagamento PIX',
        createdAt: '2026-04-13T10:00:00.000Z',
        updatedAt: '2026-04-13T10:05:00.000Z',
        expiresAt: '2026-04-13T11:00:00.000Z',
        completedAt: '2026-04-13T10:05:00.000Z',
        providerTransactionId: 'pagarme_qr_cash_123',
        providerConfirmationId: 'confirm-1',
        providerWebhookEventId: 'wh-1',
        billingRecordId: 'bill-1',
        billingSettlementStatus: 'applied',
        billingSettledAt: '2026-04-13T10:05:00.000Z',
        billingSettlementError: null,
        cashReconciliationStatus: 'applied',
        cashReconciledAt: '2026-04-13T10:05:00.000Z',
        cashReconciliationError: null,
        cashRegisterId: 'register-1',
        cashMovementId: 'movement-1'
      }
    ]);
    const getOrThrow = vi.fn(() => ({ encounterId: 'enc-1' }));
    const getSummary = vi.fn(async () => ({
      encounterStatus: 'closed',
      financialStatus: 'paid',
      patientId: 'pet-1',
      patientName: 'Belinha',
      ownerId: 'owner-1',
      ownerName: 'Ana',
      receivables: [{ id: 'rec-1', installmentLabel: 'Entrada', status: 'settled' }],
      payments: [
        {
          id: 'payment-1',
          receivableId: 'rec-1',
          amountPaid: 150,
          externalReferenceType: 'pix_transaction',
          externalReferenceId: 'pix-1',
          notes: 'pagarme_qr_cash_123'
        }
      ]
    }));

    const handled = await handleFinancialRoutes(
      '/financial/reconciliation',
      {
        method: 'GET',
        url: '/financial/reconciliation?status=completed&provider=pagarme&search=Belinha'
      } as never,
      response as never,
      'corr-financial-4',
      {
        encounterFinancial: { getSummary } as never,
        billing: { getOrThrow } as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: pixList } as never,
        requirePrincipal: vi.fn(() => createPrincipal() as never)
      }
    );

    expect(handled).toBe(true);
    expect(pixList).toHaveBeenCalledWith({
      accountId: 'acc-1',
      status: 'completed',
      provider: 'pagarme'
    });
    expect(getOrThrow).toHaveBeenCalledWith('acc-1', 'bill-1');
    expect(getSummary).toHaveBeenCalledWith('acc-1', 'enc-1');
    expect(response.statusCode).toBe(200);
    expect(
      response.bodyJson<{
        total: number;
        reconciledCount: number;
        data: Array<{
          transactionId: string;
          reconciliationState: string;
          receivableIds: string[];
        }>;
      }>()
    ).toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
      completedCount: 1,
      reconciledCount: 1,
      attentionCount: 0,
      pendingCount: 0,
      data: [
        expect.objectContaining({
          transactionId: 'pix-1',
          reconciliationState: 'reconciled',
          receivableIds: ['rec-1']
        })
      ]
    });
  });

  it('rejects the legacy manual receivable settlement route without tenant disclosure', async () => {
    const response = new MockResponse();
    const settleReceivable = vi.fn(async () => ({
      id: 'rec-1',
      status: 'settled',
      amountPaid: 90
    }));

    const handled = await handleFinancialRoutes(
      '/financial/receivables/rec-1/settle',
      createJsonRequest('POST', '/financial/receivables/rec-1/settle', {
        amountPaid: 90,
        notes: 'PIX manual'
      }) as never,
      response as never,
      'corr-financial-5',
      {
        encounterFinancial: { settleReceivable } as never,
        billing: {} as never,
        audit: { write: vi.fn() } as never,
        pixTransactions: { list: vi.fn() } as never,
        requirePrincipal: vi.fn(() => createPrincipal() as never)
      }
    );

    expect(handled).toBe(true);
    expect(settleReceivable).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(409);
    expect(response.bodyJson()).toEqual({
      code: 'MANUAL_SETTLEMENT_DISABLED',
      message:
        'Manual settlement is disabled. Record the receipt through the cash-receipts endpoint.',
      details: { receiptPath: '/encounters/:id/cash-receipts' },
      correlationId: 'corr-financial-5'
    });
    expect(response.body).not.toContain('acc-1');
  });
});
