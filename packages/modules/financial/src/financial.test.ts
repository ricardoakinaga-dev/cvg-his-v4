import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EncounterFinancialService,
  InMemoryEncounterFinancialRepository,
  type EncounterFinancialAccountRecord,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord
} from './index.js';

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
