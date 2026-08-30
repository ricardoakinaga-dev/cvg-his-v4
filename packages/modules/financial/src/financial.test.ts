import assert from 'node:assert/strict';
import { test } from 'vitest';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import {
  EncounterFinancialService,
  FinancialIncomeStatementService,
  FinancialPayablesService,
  InMemoryEncounterFinancialRepository,
  InMemoryFinancialPayablesRepository,
  FinancialLedgerService,
  InMemoryFinancialLedgerRepository,
  type EncounterFinancialAccountRecord,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord
} from './index.js';

test('financial module exposes the shared advance-payment report source boundary', async () => {
  const financialModule = await import('./index.js');
  assert.equal('DatabaseAdvancePaymentsReportSource' in financialModule, true);
});

test('FinancialLedgerService validates, normalizes, persists and deduplicates balanced entries', async () => {
  const repository = new InMemoryFinancialLedgerRepository();
  const service = new FinancialLedgerService(repository);

  const entry = await service.postEntry({
    accountId: 'acc_cvg_demo' as never,
    sourceType: 'receivable_payment',
    sourceId: 'payment_1',
    description: '  Recebimento de consulta  ',
    occurredAt: '2026-04-13T10:00:00.000Z',
    lines: [
      { accountCode: '1.1.1', debit: 100.004, credit: 0, memo: ' Caixa ' },
      { accountCode: '4.1.1', debit: 0, credit: 100.004 }
    ]
  });

  assert.equal(entry.description, 'Recebimento de consulta');
  assert.equal(entry.lines[0]?.debit, 100);
  assert.equal(entry.lines[0]?.memo, 'Caixa');
  assert.equal(entry.lines[1]?.credit, 100);

  const replay = await service.postEntry({
    accountId: 'acc_cvg_demo' as never,
    sourceType: 'receivable_payment',
    sourceId: 'payment_1',
    description: 'Replay idempotente',
    lines: [
      { accountCode: '1.1.1', debit: 100, credit: 0 },
      { accountCode: '4.1.1', debit: 0, credit: 100 }
    ]
  });
  assert.equal(replay.id, entry.id);
  assert.equal(
    (await service.findBySource('acc_cvg_demo' as never, 'receivable_payment', 'payment_1')) !==
      null,
    true
  );
  assert.equal(
    (await service.listByAccount('acc_cvg_demo' as never, '2026-04-01', '2026-04-30')).length,
    1
  );
  assert.equal((await service.listByAccount('acc_other' as never)).length, 0);

  const generated = await repository.postEntry({
    ...entry,
    id: undefined as never,
    sourceId: 'payment_2'
  });
  assert.ok(generated.id);
  assert.equal(
    await repository.findBySource('acc_cvg_demo' as never, 'receivable_payment', 'missing'),
    null
  );
});

test('FinancialLedgerService uses the repository transaction when available', async () => {
  const calls: string[] = [];
  class TransactionalLedgerRepository extends InMemoryFinancialLedgerRepository {
    async withTransaction<T>(accountId: never, operation: () => Promise<T>): Promise<T> {
      calls.push(String(accountId));
      return operation();
    }
  }
  const service = new FinancialLedgerService(new TransactionalLedgerRepository());

  await service.postEntry({
    accountId: 'acc_tx' as never,
    sourceType: 'expense',
    sourceId: 'expense_1',
    description: 'Despesa',
    lines: [
      { accountCode: '5.1', debit: 50, credit: 0 },
      { accountCode: '2.1', debit: 0, credit: 50 }
    ]
  });

  assert.deepEqual(calls, ['acc_tx']);
});

test('FinancialLedgerService rejects malformed journal entries', async () => {
  const service = new FinancialLedgerService(new InMemoryFinancialLedgerRepository());
  const balancedLines = [
    { accountCode: '1.1', debit: 10, credit: 0 },
    { accountCode: '4.1', debit: 0, credit: 10 }
  ];

  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: []
      }),
    /at least two lines/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: [
          { accountCode: '1.1', debit: -1, credit: 0 },
          { accountCode: '4.1', debit: 0, credit: 1 }
        ]
      }),
    /finite and non-negative/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: [
          { accountCode: '1.1', debit: 1, credit: 1 },
          { accountCode: '4.1', debit: 0, credit: 2 }
        ]
      }),
    /either debit or credit/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: [
          { accountCode: '1.1', debit: 0, credit: 0 },
          { accountCode: '4.1', debit: 0, credit: 1 }
        ]
      }),
    /either debit or credit/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: [
          { accountCode: '1.1', debit: 10, credit: 0 },
          { accountCode: '4.1', debit: 0, credit: 9 }
        ]
      }),
    /must balance/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: 'acc' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        occurredAt: 'not-a-date',
        lines: balancedLines
      }),
    /valid ISO date/
  );
  await assert.rejects(
    () =>
      service.postEntry({
        accountId: ' ' as never,
        sourceType: 'x',
        sourceId: 'x',
        description: 'x',
        lines: balancedLines
      }),
    /accountId/
  );
});

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
      async getByEncounterOrThrow(accountId: string, encounterId: string) {
        assert.equal(accountId, encounter.accountId);
        assert.equal(encounterId, encounter.id);
        return billingRecord;
      },
      async listItems(accountId: string, encounterId: string) {
        assert.equal(accountId, encounter.accountId);
        assert.equal(encounterId, encounter.id);
        return billingItems;
      },
      getOrThrow(accountId: string, recordId: string) {
        assert.equal(accountId, encounter.accountId);
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
  const { service, encounter } = createFinancialService();

  await service.syncEncounter(encounter.id);
  const summary = await service.getSummary(encounter.id);

  assert.equal(summary.total, 190);
  assert.equal(summary.financialStatus, 'pending');
  assert.equal(summary.patientName, 'Luna');
  assert.equal(summary.ownerName, 'Maria Silva');
  assert.equal(summary.receivables.length, 1);
  assert.equal(summary.receivables[0]?.amountOutstanding, 190);
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
  assert.equal(paid.length, 2);
});

test('EncounterFinancialService rejects inconsistent close and overpayment attempts', async () => {
  const { service, encounter, repository } = createFinancialService();

  await assert.rejects(
    () =>
      service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
        installments: [{ amount: 100 }, { amount: 50 }]
      }),
    /Installment total must match encounter financial total/
  );

  await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    installments: [{ amount: 100 }, { amount: 90 }]
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

test('EncounterFinancialService omits orphaned receivables instead of failing the worklist', async () => {
  const repository = new InMemoryEncounterFinancialRepository();
  await repository.upsertFinancialAccount({
    id: 'efa_orphan',
    accountId: 'acc_cvg_demo' as never,
    encounterId: 'enc_missing' as never,
    financialStatus: 'pending',
    subtotalSnapshot: 100,
    discountTotalSnapshot: 0,
    totalSnapshot: 100,
    paidAmount: 0,
    balanceDue: 100,
    closedByUserId: null,
    closedAt: null,
    notes: null,
    snapshotJson: '{}',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  });
  await repository.replaceReceivables('efa_orphan', [
    {
      id: 'er_orphan',
      accountId: 'acc_cvg_demo' as never,
      encounterId: 'enc_missing' as never,
      financialAccountId: 'efa_orphan',
      installmentNumber: 1,
      installmentLabel: 'Parcela 1/1',
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
    }
  ]);

  const service = new EncounterFinancialService(
    {
      getOrThrow() {
        throw new NotFoundError('Encounter not found');
      }
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { repository }
  );

  const result = await service.listReceivables({ accountId: 'acc_cvg_demo' as never });
  assert.equal(result.total, 0);
  assert.deepEqual(result.data, []);
});

test('EncounterFinancialService records payment by billing record and settles receivables in order', async () => {
  const { service, encounter, billingRecord } = createFinancialService();

  await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
    installments: [
      { label: 'Entrada', amount: 100 },
      { label: 'Saldo', amount: 90 }
    ]
  });

  const summary = await service.recordPaymentForBillingRecord(
    encounter.accountId,
    billingRecord.id,
    {
      amountPaid: 190,
      paidByUserId: 'user_finance' as never,
      externalReferenceType: 'billing_record',
      externalReferenceId: billingRecord.id
    }
  );

  assert.equal(summary.financialStatus, 'paid');
  assert.equal(summary.balanceDue, 0);
  assert.equal(
    summary.receivables.every((item) => item.status === 'settled'),
    true
  );
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
  assert.equal(
    (await service.listPayables('acc_cvg_demo' as never, { search: 'medicamentos' })).data.length,
    1
  );

  const partial = await service.payPayable(
    'acc_cvg_demo' as never,
    'user_finance' as never,
    payable.id,
    {
      amountPaid: 250,
      paymentMethod: 'cash',
      paymentReference: 'gaveta-principal',
      notes: 'Parcial'
    }
  );
  assert.equal(partial.status, 'partial');
  assert.equal(partial.paidAmount, 250);
  assert.equal(partial.outstandingAmount, 350);
  assert.equal(partial.paymentMethod, 'cash');
  assert.equal(partial.paymentReference, 'gaveta-principal');

  const paid = await service.payPayable(
    'acc_cvg_demo' as never,
    'user_finance' as never,
    payable.id,
    {
      amountPaid: 350,
      paymentMethod: 'bank_transfer',
      paymentReference: 'ted-123',
      notes: 'Quitacao'
    }
  );
  assert.equal(paid.status, 'paid');
  assert.equal(paid.paidAmount, 600);
  assert.equal(paid.outstandingAmount, 0);
  assert.ok(paid.paidAt);
  assert.equal(paid.paymentMethod, 'bank_transfer');
  assert.equal(paid.paymentReference, 'ted-123');
  assert.equal(paidEvents.length, 2);
  assert.deepEqual(
    paidEvents.map((event) => (event as { amountPaid: number }).amountPaid),
    [250, 350]
  );
  assert.deepEqual(
    paidEvents.map((event) => (event as { paymentMethod: string }).paymentMethod),
    ['cash', 'bank_transfer']
  );

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
    () =>
      service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
        amountPaid: 101
      }),
    /Payment exceeds outstanding payable balance/
  );

  const cancelled = await service.cancelPayable(
    'acc_cvg_demo' as never,
    'user_finance' as never,
    payable.id,
    'Duplicado'
  );
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelledByUserId, 'user_finance');
  assert.equal(cancelled.notes, 'Duplicado');

  await assert.rejects(
    () =>
      service.payPayable('acc_cvg_demo' as never, 'user_finance' as never, payable.id, {
        amountPaid: 10
      }),
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

  const paid = await service.payPayable(
    'acc_cvg_demo' as never,
    'user_finance' as never,
    payable.id,
    {
      amountPaid: 300,
      paymentMethod: 'bank_transfer',
      paymentReference: 'extrato-123',
      notes: 'TED fornecedor'
    }
  );
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

  const inventory = await new FinancialPayablesService(payables).createPayable(
    accountId,
    'user_finance' as never,
    {
      supplierName: 'Fornecedor Estoque',
      description: 'Compra mensal',
      category: 'Estoque',
      costCenterCode: 'EST',
      costCenterName: 'Estoque',
      issuedAt: '2026-05-02',
      dueAt: '2026-05-15',
      totalAmount: 500
    }
  );
  await new FinancialPayablesService(payables).payPayable(
    accountId,
    'user_finance' as never,
    inventory.id,
    {
      amountPaid: 300
    }
  );
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
