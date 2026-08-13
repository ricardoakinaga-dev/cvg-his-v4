import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  EncounterFinancialService,
  FinancialIncomeStatementService,
  FinancialPayablesService,
  InMemoryEncounterFinancialRepository,
  InMemoryFinancialPayablesRepository,
  type EncounterFinancialAccountRecord,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord
} from './index.js';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createFinancialService(
  repository = new InMemoryEncounterFinancialRepository(),
  onReceivablePaid?: (payment: EncounterReceivablePaymentRecord) => Promise<void>
) {
  const encounter = {
    id: 'enc_1' as never,
    accountId: 'acc_cvg_demo' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    status: 'in_care' as const
  };
  const billingRecord = {
    id: 'bill_1' as never,
    encounterId: encounter.id,
    accountId: encounter.accountId,
    patientId: encounter.patientId,
    ownerId: encounter.ownerId,
    status: 'estimated' as const,
    subtotalAmount: 190,
    currency: 'BRL' as const,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const billingItems = [
    {
      id: 'bill_item_1' as never,
      billingRecordId: billingRecord.id,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      itemType: 'service' as const,
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 120,
      totalAmount: 120,
      createdByUserId: 'user_finance' as never,
      createdAt: '2026-04-13T00:00:00.000Z'
    },
    {
      id: 'bill_item_2' as never,
      billingRecordId: billingRecord.id,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      itemType: 'exam' as const,
      description: 'Hemograma',
      quantity: 1,
      unitPriceAmount: 70,
      totalAmount: 70,
      createdByUserId: 'user_finance' as never,
      createdAt: '2026-04-13T00:05:00.000Z'
    }
  ];

  const service = new EncounterFinancialService(
    {
      getOrThrow(encounterId: string) {
        assert.equal(encounterId, encounter.id);
        return encounter;
      }
    } as never,
    {
      async getByEncounterOrThrow(encounterId: string) {
        assert.equal(encounterId, encounter.id);
        return billingRecord;
      },
      async listItems(encounterId: string) {
        assert.equal(encounterId, encounter.id);
        return billingItems;
      },
      getOrThrow(recordId: string) {
        assert.equal(recordId, billingRecord.id);
        return billingRecord;
      }
    } as never,
    {
      getOrThrow(patientId: string) {
        assert.equal(patientId, encounter.patientId);
        return {
          id: patientId,
          name: 'Luna',
          species: 'canine'
        };
      }
    } as never,
    {
      getOrThrow(ownerId: string) {
        assert.equal(ownerId, encounter.ownerId);
        return {
          id: ownerId,
          fullName: 'Maria Silva',
          contacts: [
            {
              label: 'WhatsApp',
              value: '+55 11 99999-9999',
              type: 'whatsapp',
              primary: true
            }
          ]
        };
      }
    } as never,
    {
      repository,
      onReceivablePaid
    }
  );

  return { service, repository, encounter, billingRecord };
}

test('InMemoryEncounterFinancialRepository replaces receivables and clears old payments', async () => {
  const repository = new InMemoryEncounterFinancialRepository();
  const account: EncounterFinancialAccountRecord = {
    id: 'efa_1',
    accountId: 'acc_cvg_demo' as never,
    encounterId: 'enc_1' as never,
    financialStatus: 'pending',
    subtotalSnapshot: 150,
    discountTotalSnapshot: 0,
    totalSnapshot: 150,
    paidAmount: 0,
    balanceDue: 150,
    closedByUserId: null,
    closedAt: null,
    notes: null,
    snapshotJson: '{}',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const receivable: EncounterReceivableRecord = {
    id: 'er_1',
    accountId: account.accountId,
    encounterId: account.encounterId,
    financialAccountId: account.id,
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    dueAt: null,
    status: 'open',
    amountOriginal: 150,
    amountPaid: 0,
    amountOutstanding: 150,
    issuedAt: '2026-04-13T00:00:00.000Z',
    settledAt: null,
    notes: null,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const payment: EncounterReceivablePaymentRecord = {
    id: 'erp_1',
    accountId: account.accountId,
    encounterId: account.encounterId,
    financialAccountId: account.id,
    receivableId: receivable.id,
    amountPaid: 50,
    paidAt: '2026-04-13T00:01:00.000Z',
    paidByUserId: 'user_admin' as never,
    externalReferenceType: 'pix_transaction',
    externalReferenceId: 'pix_tx_1',
    notes: 'Initial payment',
    createdAt: '2026-04-13T00:01:00.000Z'
  };

  await repository.upsertFinancialAccount(account);
  await repository.replaceReceivables(account.id, [receivable]);
  await repository.createPayment(payment);
  assert.equal((await repository.listPaymentsByFinancialAccount(account.id)).length, 1);

  await repository.replaceReceivables(account.id, [
    {
      ...receivable,
      id: 'er_2',
      installmentLabel: 'Parcela 1/2'
    },
    {
      ...receivable,
      id: 'er_3',
      installmentNumber: 2,
      installmentLabel: 'Parcela 2/2'
    }
  ]);

  const receivables = await repository.listReceivablesByFinancialAccount(account.id);
  const payments = await repository.listPaymentsByFinancialAccount(account.id);
  assert.equal(receivables.length, 2);
  assert.equal(payments.length, 0);
});

test('InMemoryEncounterFinancialRepository filters receivables by account and status', async () => {
  const repository = new InMemoryEncounterFinancialRepository();
  const baseReceivable: EncounterReceivableRecord = {
    id: 'er_base',
    accountId: 'acc_cvg_demo' as never,
    encounterId: 'enc_1' as never,
    financialAccountId: 'efa_1',
    installmentNumber: 1,
    installmentLabel: 'Parcela',
    dueAt: null,
    status: 'open',
    amountOriginal: 100,
    amountPaid: 0,
    amountOutstanding: 100,
    issuedAt: '2026-04-13T00:00:00.000Z',
    settledAt: null,
    notes: null,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };

  await repository.replaceReceivables('efa_1', [
    baseReceivable,
    {
      ...baseReceivable,
      id: 'er_settled',
      status: 'settled',
      amountPaid: 100,
      amountOutstanding: 0,
      settledAt: '2026-04-13T00:05:00.000Z'
    },
    {
      ...baseReceivable,
      id: 'er_other_account',
      accountId: 'acc_other' as never,
      encounterId: 'enc_2' as never,
      financialAccountId: 'efa_2'
    }
  ]);

  const openDemo = await repository.listReceivables({
    accountId: 'acc_cvg_demo' as never,
    status: 'open'
  });
  assert.equal(openDemo.length, 1);
  assert.equal(openDemo[0]?.id, 'er_base');
});

test('EncounterFinancialService syncs encounter and exposes administrative summary', async () => {
  const { service, repository, encounter } = createFinancialService();

  await service.syncEncounter(encounter.id);
  const summary = await service.getSummary(encounter.id);
  const account = await repository.findFinancialAccountByEncounter(encounter.id);

  assert.ok(account);
  assert.match(account.id, UUID_V4_PATTERN);
  assert.equal(summary.total, 190);
  assert.equal(summary.financialStatus, 'pending');
  assert.equal(summary.patientName, 'Luna');
  assert.equal(summary.ownerName, 'Maria Silva');
  assert.equal(summary.receivables.length, 1);
  assert.match(summary.receivables[0]!.id, UUID_V4_PATTERN);
  assert.equal(summary.receivables[0]?.amountOutstanding, 190);
});

test('EncounterFinancialService rejects cross-account summaries, closes and settlements', async () => {
  const { service, encounter } = createFinancialService();
  const accountId = 'acc_cvg_demo' as never;
  const foreignAccountId = 'acc_other' as never;

  await assert.rejects(() => service.getSummary(encounter.id, foreignAccountId), /not found/i);
  await assert.rejects(
    () =>
      service.closeEncounterFinancial(
        encounter.id,
        'user_foreign' as never,
        { installments: [{ amount: 190 }] },
        foreignAccountId
      ),
    /not found/i
  );

  const closed = await service.closeEncounterFinancial(
    encounter.id,
    'user_finance' as never,
    { installments: [{ amount: 190 }] },
    accountId
  );
  await assert.rejects(
    () =>
      service.settleReceivable(
        closed.receivables[0]!.id,
        { amountPaid: 10 },
        foreignAccountId
      ),
    /not found/i
  );

  const unchanged = await service.getSummary(encounter.id, accountId);
  assert.equal(unchanged.paidAmount, 0);
  assert.equal(unchanged.balanceDue, 190);
});

test('EncounterFinancialService closes encounter with installments and allocates payment across them', async () => {
  const paid: EncounterReceivablePaymentRecord[] = [];
  const { service, encounter } = createFinancialService(
    new InMemoryEncounterFinancialRepository(),
    async (payment) => {
      paid.push(payment);
    }
  );

  const summary = await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    paidAmount: 120,
    notes: 'Fechamento administrativo',
    installments: [
      { label: 'Entrada', amount: 100, dueAt: '2026-04-14T00:00:00.000Z' },
      { label: 'Saldo', amount: 90, dueAt: '2026-04-20T00:00:00.000Z' }
    ]
  });

  assert.equal(summary.financialClosed, true);
  assert.equal(summary.closedByUserId, 'user_finance');
  assert.equal(summary.payments.length, 2);
  assert.equal(summary.balanceDue, 70);
  assert.equal(summary.receivables[0]?.status, 'settled');
  assert.equal(summary.receivables[1]?.status, 'open');
  assert.equal(summary.receivables[1]?.amountOutstanding, 70);
  assert.equal(summary.receivables.every((item) => UUID_V4_PATTERN.test(item.id)), true);
  assert.equal(summary.payments.every((item) => UUID_V4_PATTERN.test(item.id)), true);
  assert.equal(paid.length, 2);
});

test('EncounterFinancialService rejects inconsistent close and overpayment attempts', async () => {
  const { service, encounter, repository } = createFinancialService();

  await assert.rejects(
    () =>
      service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
        installments: [
          { amount: 100 },
          { amount: 50 }
        ]
      }),
    /Installment total must match encounter financial total/
  );

  await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    installments: [
      { amount: 100 },
      { amount: 90 }
    ]
  });

  const account = await repository.findFinancialAccountByEncounter(encounter.id);
  const receivables = await repository.listReceivablesByFinancialAccount(account!.id);

  await assert.rejects(
    () =>
      service.settleReceivable(receivables[0]!.id, {
        amountPaid: 101
      }),
    /amountPaid must be greater than zero|Payment exceeds outstanding receivable balance/
  );
});

test('EncounterFinancialService lists receivables with pagination and search', async () => {
  const { service, encounter } = createFinancialService();

  await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    installments: [
      { label: 'Entrada Luna', amount: 100 },
      { label: 'Saldo Maria', amount: 90 }
    ]
  });

  const firstPage = await service.listReceivables({
    accountId: 'acc_cvg_demo' as never,
    search: 'maria',
    page: 1,
    pageSize: 1
  });

  assert.equal(firstPage.total, 2);
  assert.equal(firstPage.data.length, 1);
  assert.equal(firstPage.openCount, 2);
  assert.equal(firstPage.totalOutstanding, 190);
  assert.match(firstPage.data[0]!.ownerName, /Maria/);
});

test('EncounterFinancialService records payment by billing record and settles receivables in order', async () => {
  const { service, encounter, billingRecord } = createFinancialService();

  await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    installments: [
      { label: 'Entrada', amount: 100 },
      { label: 'Saldo', amount: 90 }
    ]
  });

  const summary = await service.recordPaymentForBillingRecord(billingRecord.id, {
    amountPaid: 190,
    paidByUserId: 'user_finance' as never,
    externalReferenceType: 'billing_record',
    externalReferenceId: billingRecord.id
  });

  assert.equal(summary.financialStatus, 'paid');
  assert.equal(summary.balanceDue, 0);
  assert.equal(summary.receivables.every((item) => item.status === 'settled'), true);
  assert.equal(summary.payments.length, 2);
});

test('FinancialPayablesService creates, lists and pays supplier obligations', async () => {
  const paidEvents: unknown[] = [];
  const service = new FinancialPayablesService(new InMemoryFinancialPayablesRepository(), {
    onPayablePaid: async (event) => {
      paidEvents.push(event);
    }
  });

  const payable = await service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
    supplierName: 'Fornecedor de medicamentos',
    description: 'Compra de antibioticos',
    category: 'Compras',
    costCenterCode: 'EST',
    costCenterName: 'Estoque',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-20',
    totalAmount: 600,
    sourceExpenseId: 'expense-1',
    notes: 'NF 123'
  });

  assert.equal(payable.status, 'open');
  assert.equal(payable.paidAmount, 0);
  assert.equal(payable.outstandingAmount, 600);
  assert.equal((await service.listPayables('acc_cvg_demo' as never, { search: 'medicamentos' })).data.length, 1);

  const partial = await service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
    amountPaid: 250,
    paymentMethod: 'cash',
    paymentReference: 'gaveta-principal',
    notes: 'Parcial'
  });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.paidAmount, 250);
  assert.equal(partial.outstandingAmount, 350);
  assert.equal(partial.paymentMethod, 'cash');
  assert.equal(partial.paymentReference, 'gaveta-principal');

  const paid = await service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
    amountPaid: 350,
    paymentMethod: 'bank_transfer',
    paymentReference: 'ted-123',
    notes: 'Quitacao'
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.paidAmount, 600);
  assert.equal(paid.outstandingAmount, 0);
  assert.ok(paid.paidAt);
  assert.equal(paid.paymentMethod, 'bank_transfer');
  assert.equal(paid.paymentReference, 'ted-123');
  assert.equal(paidEvents.length, 2);
  assert.deepEqual(paidEvents.map((event) => (event as { amountPaid: number }).amountPaid), [250, 350]);
  assert.deepEqual(paidEvents.map((event) => (event as { paymentMethod: string }).paymentMethod), ['cash', 'bank_transfer']);

  const summary = await service.listPayables('acc_cvg_demo' as never);
  assert.equal(summary.total, 1);
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.totalPaid, 600);
});

test('FinancialPayablesService prevents invalid payment and cancellation flows', async () => {
  const service = new FinancialPayablesService(new InMemoryFinancialPayablesRepository());
  const payable = await service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
    supplierName: 'Laboratorio parceiro',
    description: 'Exames terceirizados',
    category: 'Servicos',
    costCenterCode: 'LAB',
    costCenterName: 'Laboratorio',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-15',
    totalAmount: 100
  });

  await assert.rejects(
    () => service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, { amountPaid: 101 }),
    /Payment exceeds outstanding payable balance/
  );

  const cancelled = await service.cancelPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, 'Duplicado');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelledByUserId, 'user_finance');
  assert.equal(cancelled.notes, 'Duplicado');

  await assert.rejects(
    () => service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, { amountPaid: 10 }),
    /Only open or partial payables can be paid/
  );
});

test('FinancialPayablesService reconciles non-cash payable payments', async () => {
  const service = new FinancialPayablesService(new InMemoryFinancialPayablesRepository());
  const payable = await service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
    supplierName: 'Banco fornecedor',
    description: 'NF conciliacao',
    category: 'Servicos',
    costCenterCode: 'ADM',
    costCenterName: 'Administrativo',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-12',
    totalAmount: 300
  });

  const paid = await service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
    amountPaid: 300,
    paymentMethod: 'bank_transfer',
    paymentReference: 'extrato-123',
    notes: 'TED fornecedor'
  });
  assert.equal(paid.reconciliationStatus, 'pending');

  const pending = await service.listPayableReconciliation('acc_cvg_demo' as never, {
    status: 'pending'
  });
  assert.equal(pending.total, 1);
  assert.equal(pending.data[0]?.id, payable.id);

  const reconciled = await service.reconcilePayablePayment(
    'acc_cvg_demo' as never,
    'user_finance' as never,
    payable.id,
    {
      reconciliationReference: 'OFX-0001',
      notes: 'Conferido no extrato'
    }
  );
  assert.equal(reconciled.reconciliationStatus, 'reconciled');
  assert.equal(reconciled.reconciliationReference, 'OFX-0001');
  assert.equal(reconciled.reconciledByUserId, 'user_finance');
  assert.ok(reconciled.reconciledAt);

  const after = await service.listPayableReconciliation('acc_cvg_demo' as never, {
    status: 'reconciled'
  });
  assert.equal(after.total, 1);
});

test('FinancialIncomeStatementService consolidates realized result from receivables and payables', async () => {
  const receivables = new InMemoryEncounterFinancialRepository();
  const payables = new InMemoryFinancialPayablesRepository();
  const accountId = 'acc_cvg_demo' as never;
  const statement = new FinancialIncomeStatementService({
    receivables,
    payables
  });

  await receivables.upsertFinancialAccount({
    id: 'efa_statement_1',
    accountId,
    encounterId: 'enc_statement_1' as never,
    financialStatus: 'paid',
    subtotalSnapshot: 1000,
    discountTotalSnapshot: 0,
    totalSnapshot: 1000,
    paidAmount: 1000,
    balanceDue: 0,
    closedByUserId: null,
    closedAt: null,
    notes: null,
    snapshotJson: '{}',
    createdAt: '2026-05-05T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z'
  });
  await receivables.replaceReceivables('efa_statement_1', [
    {
      id: 'er_statement_paid',
      accountId,
      encounterId: 'enc_statement_1' as never,
      financialAccountId: 'efa_statement_1',
      installmentNumber: 1,
      installmentLabel: 'Parcela 1/1',
      dueAt: '2026-05-10',
      status: 'settled',
      amountOriginal: 1000,
      amountPaid: 1000,
      amountOutstanding: 0,
      issuedAt: '2026-05-05',
      settledAt: '2026-05-08T10:00:00.000Z',
      notes: null,
      createdAt: '2026-05-05T00:00:00.000Z',
      updatedAt: '2026-05-08T10:00:00.000Z'
    },
    {
      id: 'er_statement_open',
      accountId,
      encounterId: 'enc_statement_2' as never,
      financialAccountId: 'efa_statement_1',
      installmentNumber: 2,
      installmentLabel: 'Parcela 2/2',
      dueAt: '2026-05-20',
      status: 'open',
      amountOriginal: 400,
      amountPaid: 100,
      amountOutstanding: 300,
      issuedAt: '2026-05-09',
      settledAt: null,
      notes: null,
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z'
    },
    {
      id: 'er_statement_other_account',
      accountId: 'acc_other' as never,
      encounterId: 'enc_other' as never,
      financialAccountId: 'efa_other',
      installmentNumber: 1,
      installmentLabel: 'Parcela',
      dueAt: '2026-05-10',
      status: 'settled',
      amountOriginal: 999,
      amountPaid: 999,
      amountOutstanding: 0,
      issuedAt: '2026-05-05',
      settledAt: '2026-05-08T10:00:00.000Z',
      notes: null,
      createdAt: '2026-05-05T00:00:00.000Z',
      updatedAt: '2026-05-08T10:00:00.000Z'
    }
  ]);

  const inventory = await new FinancialPayablesService(payables).createPayable(accountId, 'user_finance' as never, {
    supplierName: 'Fornecedor Estoque',
    description: 'Compra mensal',
    category: 'Estoque',
    costCenterCode: 'EST',
    costCenterName: 'Estoque',
    issuedAt: '2026-05-02',
    dueAt: '2026-05-15',
    totalAmount: 500
  });
  await new FinancialPayablesService(payables).payPayable(accountId, 'user_finance' as never, inventory.id, {
    amountPaid: 300
  });
  await new FinancialPayablesService(payables).createPayable(accountId, 'user_finance' as never, {
    supplierName: 'Laboratorio',
    description: 'Exames terceirizados',
    category: 'Laboratorio',
    costCenterCode: 'LAB',
    costCenterName: 'Laboratorio',
    issuedAt: '2026-05-03',
    dueAt: '2026-05-18',
    totalAmount: 200
  });

  const result = await statement.getIncomeStatement(accountId, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.equal(result.revenue.grossRevenue, 1400);
  assert.equal(result.revenue.realizedRevenue, 1000);
  assert.equal(result.revenue.outstandingReceivables, 300);
  assert.equal(result.expenses.accruedExpenses, 700);
  assert.equal(result.expenses.paidExpenses, 300);
  assert.equal(result.expenses.outstandingPayables, 400);
  assert.equal(result.result.realizedNetResult, 700);
  assert.equal(result.result.accrualNetResult, 700);
  assert.deepEqual(result.expenses.byCategory, [
    { category: 'Estoque', accruedAmount: 500, paidAmount: 300, outstandingAmount: 200 },
    { category: 'Laboratorio', accruedAmount: 200, paidAmount: 0, outstandingAmount: 200 }
  ]);
});

test('FinancialPayablesService validates boundaries, tenant ownership and reconciliation eligibility', async () => {
  const repository = new InMemoryFinancialPayablesRepository();
  const service = new FinancialPayablesService(repository);
  const base = {
    supplierName: 'Fornecedor premium',
    description: 'Serviço enterprise',
    category: 'Servicos',
    costCenterCode: 'ADM',
    costCenterName: 'Administrativo',
    issuedAt: '2026-08-01',
    dueAt: '2026-08-31',
    totalAmount: 100
  };

  await assert.rejects(
    () => service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
      ...base,
      supplierName: '   '
    }),
    /supplierName is required/
  );
  await assert.rejects(
    () => service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
      ...base,
      issuedAt: 'invalid-date'
    }),
    /issuedAt must be a valid ISO date/
  );
  await assert.rejects(
    () => service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
      ...base,
      issuedAt: '2026-09-01'
    }),
    /issuedAt must be before or equal to dueAt/
  );
  for (const totalAmount of [0, Number.NaN]) {
    await assert.rejects(
      () => service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
        ...base,
        totalAmount
      }),
      /totalAmount must be greater than zero/
    );
  }

  const payable = await service.createPayable('acc_cvg_demo' as never, 'user_finance' as never, {
    ...base,
    issuedAt: undefined,
    sourceExpenseId: '   ',
    notes: '   '
  });
  assert.equal(payable.sourceExpenseId, null);
  assert.equal(payable.notes, null);
  await assert.rejects(
    () => service.payPayable('acc_other' as never, 'user_finance' as never, payable.id, { amountPaid: 1 }),
    /Financial payable not found/
  );
  await assert.rejects(
    () => service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, { amountPaid: 0 }),
    /amountPaid must be greater than zero/
  );
  await assert.rejects(
    () => service.reconcilePayablePayment('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {}),
    /Only paid payables can be reconciled/
  );

  const cashPaid = await service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
    amountPaid: 100,
    paymentMethod: 'cash'
  });
  assert.equal(cashPaid.reconciliationStatus, 'not_required');
  await assert.rejects(
    () => service.reconcilePayablePayment('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {}),
    /Only non-cash payable payments require reconciliation/
  );
  await assert.rejects(
    () => service.cancelPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id),
    /Paid payables cannot be cancelled/
  );

  const empty = await service.listPayables('acc_cvg_demo' as never, {
    status: 'open',
    search: 'não encontrado',
    page: 0,
    pageSize: 200
  });
  assert.equal(empty.page, 1);
  assert.equal(empty.pageSize, 100);
  assert.equal(empty.total, 0);
  const reconciliation = await service.listPayableReconciliation('acc_cvg_demo' as never, {
    search: 'não encontrado',
    page: 0,
    pageSize: 200
  });
  assert.equal(reconciliation.page, 1);
  assert.equal(reconciliation.pageSize, 100);
  assert.equal(reconciliation.total, 0);
  await assert.rejects(
    () => service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, 'missing', { amountPaid: 1 }),
    /Financial payable not found/
  );
});

test('FinancialIncomeStatementService handles empty defaults and rejects invalid periods', async () => {
  const statement = new FinancialIncomeStatementService({
    receivables: new InMemoryEncounterFinancialRepository(),
    payables: new InMemoryFinancialPayablesRepository()
  });
  const empty = await statement.getIncomeStatement('acc_empty' as never);
  assert.equal(empty.revenue.receivableCount, 0);
  assert.equal(empty.expenses.payableCount, 0);
  assert.equal(empty.result.grossMarginPercent, null);
  assert.equal(empty.result.cashConversionPercent, null);

  await assert.rejects(
    () => statement.getIncomeStatement('acc_empty' as never, {
      dateFrom: '2026-09-01',
      dateTo: '2026-08-01'
    }),
    /dateFrom must be before or equal to dateTo/
  );
  await assert.rejects(
    () => statement.getIncomeStatement('acc_empty' as never, {
      dateFrom: 'not-a-date',
      dateTo: '2026-08-01'
    }),
    /dateFrom must be a valid ISO date/
  );
});
