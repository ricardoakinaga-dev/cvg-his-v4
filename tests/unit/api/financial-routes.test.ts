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
    expect(getSummary).toHaveBeenCalledWith('enc-1', 'acc-1');
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ encounterId: string }>().encounterId).toBe('enc-1');
  });

  it('closes encounter financial account with normalized payload', async () => {
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
        paidAmount: 50,
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
    expect(closeEncounterFinancial).toHaveBeenCalledWith(
      'enc-1',
      'user-1',
      {
        paidAmount: 50,
        notes: 'Fechamento administrativo',
        installments: [
          {
            label: 'Entrada',
            amount: 100,
            dueAt: '2026-04-20T00:00:00.000Z',
            notes: 'Primeira parcela'
          }
        ]
      },
      'acc-1'
    );
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ financialClosed: boolean }>().financialClosed).toBe(true);
  });

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
    expect(getOrThrow).toHaveBeenCalledWith('bill-1', 'acc-1');
    expect(getSummary).toHaveBeenCalledWith('enc-1', 'acc-1');
    expect(response.statusCode).toBe(200);
    expect(
      response.bodyJson<{
        total: number;
        reconciledCount: number;
        data: Array<{ transactionId: string; reconciliationState: string; receivableIds: string[] }>;
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

  it('settles a receivable from JSON payload', async () => {
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
    expect(settleReceivable).toHaveBeenCalledWith(
      'rec-1',
      {
        amountPaid: 90,
        notes: 'PIX manual',
        paidByUserId: 'user-1'
      },
      'acc-1'
    );
    expect(response.statusCode).toBe(200);
    expect(response.bodyJson<{ status: string }>().status).toBe('settled');
  });

  it('normalizes payable filters, payload defaults and every supported payment method', async () => {
    const listPayables = vi.fn(async () => ({ data: [], total: 0 }));
    const getIncomeStatement = vi.fn(async () => ({
      period: { dateFrom: '2026-01-01', dateTo: '2026-12-31' }
    }));
    const listPayableReconciliation = vi.fn(async () => ({ data: [], total: 0 }));
    const createPayable = vi.fn(async (_accountId, _userId, payload) => ({
      id: 'payable-created',
      supplierName: payload.supplierName
    }));
    const payPayable = vi.fn(async (_accountId, _userId, id) => ({ id }));
    const cancelPayable = vi.fn(async (_accountId, _userId, id) => ({ id }));
    const reconcilePayablePayment = vi.fn(async (_accountId, _userId, id) => ({ id }));
    const handlers = {
      encounterFinancial: {} as never,
      financialPayables: {
        listPayables,
        listPayableReconciliation,
        createPayable,
        payPayable,
        cancelPayable,
        reconcilePayablePayment
      } as never,
      financialStatements: { getIncomeStatement } as never,
      billing: {} as never,
      audit: { write: vi.fn() } as never,
      pixTransactions: { list: vi.fn() } as never,
      cardTransactions: { list: vi.fn() } as never,
      requirePrincipal: vi.fn(() => createPrincipal() as never)
    };

    await handleFinancialRoutes(
      '/financial/payables',
      { method: 'GET', url: '/financial/payables?status=invalid&page=NaN&pageSize=bad' } as never,
      new MockResponse() as never,
      'corr-payable-defaults-1',
      handlers
    );
    expect(listPayables).toHaveBeenCalledWith('acc-1', {
      status: undefined,
      search: undefined,
      page: 1,
      pageSize: 20
    });

    await handleFinancialRoutes(
      '/financial/income-statement',
      { method: 'GET', url: '/financial/income-statement' } as never,
      new MockResponse() as never,
      'corr-payable-defaults-2',
      handlers
    );
    expect(getIncomeStatement).toHaveBeenCalledWith('acc-1', { dateFrom: null, dateTo: null });

    await handleFinancialRoutes(
      '/financial/reconciliation/payables',
      {
        method: 'GET',
        url: '/financial/reconciliation/payables?status=invalid&page=oops&pageSize=oops'
      } as never,
      new MockResponse() as never,
      'corr-payable-defaults-3',
      handlers
    );
    expect(listPayableReconciliation).toHaveBeenCalledWith('acc-1', {
      status: undefined,
      search: undefined,
      page: 1,
      pageSize: 20
    });

    await handleFinancialRoutes(
      '/financial/payables',
      createJsonRequest('POST', '/financial/payables', {
        supplierName: 'Fornecedor Premium',
        description: 'Contrato enterprise',
        category: 'Servicos',
        costCenterCode: 'ADM',
        costCenterName: 'Administrativo',
        issuedAt: 42,
        dueAt: '2026-08-31',
        totalAmount: 500,
        sourceExpenseId: 42,
        notes: false
      }) as never,
      new MockResponse() as never,
      'corr-payable-defaults-4',
      handlers
    );
    expect(createPayable).toHaveBeenCalledWith('acc-1', 'user-1', expect.objectContaining({
      issuedAt: undefined,
      sourceExpenseId: null,
      notes: null
    }));

    const methods = ['pix', 'card', 'cheque', 'other', 'unsupported'] as const;
    for (const method of methods) {
      await handleFinancialRoutes(
        `/financial/payables/payable-${method}/pay`,
        createJsonRequest('POST', `/financial/payables/payable-${method}/pay`, {
          amountPaid: 10,
          paymentMethod: method,
          paymentReference: 42,
          notes: false
        }) as never,
        new MockResponse() as never,
        `corr-payable-method-${method}`,
        handlers
      );
    }
    expect(payPayable.mock.calls.map((call) => call[3]?.paymentMethod)).toEqual([
      'pix',
      'card',
      'cheque',
      'other',
      null
    ]);
    expect(payPayable.mock.calls.every((call) => call[3]?.paymentReference === null)).toBe(true);
    expect(payPayable.mock.calls.every((call) => call[3]?.notes === null)).toBe(true);

    await handleFinancialRoutes(
      '/financial/payables/payable-created/cancel',
      createJsonRequest('POST', '/financial/payables/payable-created/cancel', { notes: 42 }) as never,
      new MockResponse() as never,
      'corr-payable-defaults-5',
      handlers
    );
    expect(cancelPayable).toHaveBeenCalledWith('acc-1', 'user-1', 'payable-created', null);

    await handleFinancialRoutes(
      '/financial/payables/payable-created/reconcile',
      createJsonRequest('POST', '/financial/payables/payable-created/reconcile', {}) as never,
      new MockResponse() as never,
      'corr-payable-defaults-6',
      handlers
    );
    expect(reconcilePayablePayment).toHaveBeenCalledWith('acc-1', 'user-1', 'payable-created', {
      reconciliationReference: null,
      notes: null
    });
  });

  it('covers every aging bucket and normalizes optional receivable and close fields', async () => {
    const now = new Date();
    const daysFromNow = (days: number) => {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString();
    };
    const dueDates = [null, 'invalid-date', daysFromNow(-10), daysFromNow(-70), daysFromNow(-100)];
    const listReceivables = vi.fn(async (params) => ({
      data: params.status === 'open'
        ? dueDates.map((dueAt, index) => ({
            id: `aging-${index}`,
            encounterId: `enc-${index}`,
            installmentLabel: `Parcela ${index + 1}`,
            dueAt,
            amountOutstanding: 10,
            patientName: `Paciente ${index}`,
            ownerName: `Tutor ${index}`,
            financialStatus: 'pending'
          }))
        : [],
      page: 1,
      pageSize: 100,
      total: params.status === 'open' ? dueDates.length : 0
    }));
    const closeEncounterFinancial = vi.fn(async () => ({ financialClosed: true }));
    const settleReceivable = vi.fn(async () => ({ id: 'rec-defaults', status: 'settled' }));
    const handlers = {
      encounterFinancial: { listReceivables, closeEncounterFinancial, settleReceivable } as never,
      financialPayables: {} as never,
      financialStatements: {} as never,
      billing: {} as never,
      audit: { write: vi.fn() } as never,
      pixTransactions: { list: vi.fn() } as never,
      cardTransactions: { list: vi.fn() } as never,
      requirePrincipal: vi.fn(() => createPrincipal() as never)
    };

    const agingResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/aging',
      { method: 'GET', url: '/financial/aging' } as never,
      agingResponse as never,
      'corr-aging-buckets',
      handlers
    );
    const aging = agingResponse.bodyJson<{
      buckets: Array<{ bucket: string; count: number }>;
      data: Array<{ dueAt: string | null }>;
    }>();
    expect(aging.buckets).toEqual([
      expect.objectContaining({ bucket: 'current', count: 2 }),
      expect.objectContaining({ bucket: '1_30', count: 1 }),
      expect.objectContaining({ bucket: '31_60', count: 0 }),
      expect.objectContaining({ bucket: '61_90', count: 1 }),
      expect.objectContaining({ bucket: '91_plus', count: 1 })
    ]);
    expect(aging.data.slice(-2).map((row) => row.dueAt)).toEqual([null, 'invalid-date']);

    await handleFinancialRoutes(
      '/financial/receivables',
      {
        method: 'GET',
        url: '/financial/receivables?status=invalid&encounterId=&page=bad&pageSize=bad'
      } as never,
      new MockResponse() as never,
      'corr-receivable-defaults',
      handlers
    );
    expect(listReceivables).toHaveBeenLastCalledWith({
      accountId: 'acc-1',
      status: undefined,
      encounterId: undefined,
      search: undefined,
      page: 1,
      pageSize: 20
    });

    await handleFinancialRoutes(
      '/encounters/enc-defaults/financial-close',
      createJsonRequest('POST', '/encounters/enc-defaults/financial-close', {
        paidAmount: 'invalid',
        notes: 42,
        installments: [null, 'invalid', { amount: '25' }]
      }) as never,
      new MockResponse() as never,
      'corr-close-defaults',
      handlers
    );
    expect(closeEncounterFinancial).toHaveBeenCalledWith(
      'enc-defaults',
      'user-1',
      {
        paidAmount: undefined,
        notes: null,
        installments: [{ label: undefined, amount: 25, dueAt: null, notes: null }]
      },
      'acc-1'
    );

    await handleFinancialRoutes(
      '/financial/receivables/rec-defaults/settle',
      createJsonRequest('POST', '/financial/receivables/rec-defaults/settle', { amountPaid: 25 }) as never,
      new MockResponse() as never,
      'corr-settle-defaults',
      handlers
    );
    expect(settleReceivable).toHaveBeenCalledWith(
      'rec-defaults',
      {
        amountPaid: 25,
        notes: null,
        paidByUserId: 'user-1'
      },
      'acc-1'
    );

    const ignored = await handleFinancialRoutes(
      '/encounters/enc-defaults/not-financial',
      { method: 'GET', url: '/encounters/enc-defaults/not-financial' } as never,
      new MockResponse() as never,
      'corr-financial-fallthrough',
      handlers
    );
    expect(ignored).toBe(false);
  });

  it('reports PIX and card reconciliation states even when linked records are unavailable', async () => {
    const pixTransactions = [
      {
        transactionId: 'pix-pending',
        provider: 'mock',
        status: 'pending',
        amount: 10,
        currency: 'BRL',
        description: 'Pendente',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        expiresAt: '2026-08-01T11:00:00.000Z',
        billingSettlementStatus: 'pending',
        cashReconciliationStatus: 'pending'
      },
      {
        transactionId: 'pix-direct',
        provider: 'pagarme',
        status: 'completed',
        amount: 20,
        currency: 'BRL',
        description: 'Direto',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        expiresAt: '2026-08-01T11:00:00.000Z',
        billingRecordId: 'bill-ok',
        billingSettlementStatus: 'applied',
        cashReconciliationStatus: 'applied'
      },
      {
        transactionId: 'pix-attention',
        provider: 'local-pix',
        status: 'completed',
        amount: 30,
        currency: 'BRL',
        description: 'Atenção',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        expiresAt: '2026-08-01T11:00:00.000Z',
        billingRecordId: 'bill-missing',
        billingSettlementStatus: 'pending',
        cashReconciliationStatus: 'pending'
      },
      {
        transactionId: 'pix-no-link',
        provider: 'mock',
        status: 'completed',
        amount: 40,
        currency: 'BRL',
        description: 'Sem cobrança',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        expiresAt: '2026-08-01T11:00:00.000Z',
        billingSettlementStatus: 'not_applicable',
        cashReconciliationStatus: 'skipped_no_open_register'
      }
    ];
    const cardTransactions = [
      {
        transactionId: 'card-pending',
        provider: 'local-card',
        status: 'pending',
        amount: 10,
        currency: 'BRL',
        description: 'Pendente',
        installments: 1,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        billingSettlementStatus: 'pending'
      },
      {
        transactionId: 'card-reconciled',
        provider: 'pagarme-card',
        status: 'captured',
        amount: 20,
        currency: 'BRL',
        description: 'Capturada',
        installments: 2,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        billingRecordId: 'bill-ok',
        billingSettlementStatus: 'applied'
      },
      {
        transactionId: 'card-attention',
        provider: 'local-card',
        status: 'captured',
        amount: 30,
        currency: 'BRL',
        description: 'Requer atenção',
        installments: 1,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        billingRecordId: 'bill-missing',
        billingSettlementStatus: 'pending'
      },
      {
        transactionId: 'card-summary-missing',
        provider: 'local-card',
        status: 'authorized_pending_capture',
        amount: 40,
        currency: 'BRL',
        description: 'Resumo ausente',
        installments: 1,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:05:00.000Z',
        billingRecordId: 'bill-summary-missing',
        billingSettlementStatus: 'pending'
      }
    ];
    const getOrThrow = vi.fn((id: string) => {
      if (id === 'bill-missing') throw new Error('billing unavailable');
      return { encounterId: id === 'bill-summary-missing' ? 'enc-missing' : 'enc-ok' };
    });
    const getSummary = vi.fn(async (encounterId: string) => {
      if (encounterId === 'enc-missing') throw new Error('summary unavailable');
      return {
        encounterStatus: 'closed',
        financialStatus: 'paid',
        patientId: 'patient-1',
        patientName: 'Luna',
        ownerId: 'owner-1',
        ownerName: 'Maria',
        receivables: [{ id: 'rec-1', installmentLabel: 'Entrada', status: 'settled' }],
        payments: [
          {
            id: 'payment-pix',
            receivableId: 'rec-1',
            amountPaid: 20,
            externalReferenceType: 'pix_transaction',
            externalReferenceId: 'pix-direct',
            notes: null
          },
          {
            id: 'payment-card',
            receivableId: 'rec-1',
            amountPaid: 20,
            externalReferenceType: 'other',
            externalReferenceId: 'card-reconciled',
            notes: null
          }
        ]
      };
    });
    const handlers = {
      encounterFinancial: { getSummary } as never,
      financialPayables: {} as never,
      financialStatements: {} as never,
      billing: { getOrThrow } as never,
      audit: { write: vi.fn() } as never,
      pixTransactions: { list: vi.fn(async () => pixTransactions) } as never,
      cardTransactions: { list: vi.fn(async () => cardTransactions) } as never,
      requirePrincipal: vi.fn(() => createPrincipal() as never)
    };

    const pixResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/reconciliation',
      {
        method: 'GET',
        url: '/financial/reconciliation?status=invalid&provider=invalid&page=0&pageSize=200'
      } as never,
      pixResponse as never,
      'corr-pix-degraded',
      handlers
    );
    const pix = pixResponse.bodyJson<{
      page: number;
      pageSize: number;
      reconciledCount: number;
      attentionCount: number;
      pendingCount: number;
      data: Array<{ transactionId: string; reconciliationState: string }>;
    }>();
    expect(pix).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 100,
      reconciledCount: 2,
      attentionCount: 1,
      pendingCount: 1
    }));
    expect(pix.data.find((row) => row.transactionId === 'pix-direct')?.reconciliationState).toBe('reconciled');

    const filteredPixResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/reconciliation',
      { method: 'GET', url: '/financial/reconciliation?search=does-not-exist' } as never,
      filteredPixResponse as never,
      'corr-pix-filtered',
      handlers
    );
    expect(filteredPixResponse.bodyJson<{ total: number }>().total).toBe(0);

    const cardResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/reconciliation/cards',
      {
        method: 'GET',
        url: '/financial/reconciliation/cards?status=invalid&provider=invalid&page=0&pageSize=200'
      } as never,
      cardResponse as never,
      'corr-card-degraded',
      handlers
    );
    const cards = cardResponse.bodyJson<{
      page: number;
      pageSize: number;
      reconciledCount: number;
      attentionCount: number;
      pendingCount: number;
      data: Array<{ transactionId: string; reconciliationState: string }>;
    }>();
    expect(cards).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 100,
      reconciledCount: 1,
      attentionCount: 1,
      pendingCount: 2
    }));
    expect(cards.data.find((row) => row.transactionId === 'card-attention')?.reconciliationState).toBe(
      'attention_required'
    );

    const filteredCardResponse = new MockResponse();
    await handleFinancialRoutes(
      '/financial/reconciliation/cards',
      { method: 'GET', url: '/financial/reconciliation/cards?search=does-not-exist' } as never,
      filteredCardResponse as never,
      'corr-card-filtered',
      handlers
    );
    expect(filteredCardResponse.bodyJson<{ total: number }>().total).toBe(0);

    for (const status of ['pending', 'completed', 'expired', 'cancelled']) {
      await handleFinancialRoutes(
        '/financial/reconciliation',
        { method: 'GET', url: `/financial/reconciliation?status=${status}` } as never,
        new MockResponse() as never,
        `corr-pix-status-${status}`,
        handlers
      );
    }
    for (const provider of ['local-pix', 'mock', 'pagarme']) {
      await handleFinancialRoutes(
        '/financial/reconciliation',
        { method: 'GET', url: `/financial/reconciliation?provider=${provider}` } as never,
        new MockResponse() as never,
        `corr-pix-provider-${provider}`,
        handlers
      );
    }
    for (const status of [
      'pending',
      'authorized_pending_capture',
      'captured',
      'not_authorized',
      'failed',
      'voided'
    ]) {
      await handleFinancialRoutes(
        '/financial/reconciliation/cards',
        { method: 'GET', url: `/financial/reconciliation/cards?status=${status}` } as never,
        new MockResponse() as never,
        `corr-card-status-${status}`,
        handlers
      );
    }
    for (const provider of ['local-card', 'pagarme-card']) {
      await handleFinancialRoutes(
        '/financial/reconciliation/cards',
        { method: 'GET', url: `/financial/reconciliation/cards?provider=${provider}` } as never,
        new MockResponse() as never,
        `corr-card-provider-${provider}`,
        handlers
      );
    }
  });
});
