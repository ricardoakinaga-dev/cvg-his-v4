import { describe, expect, it } from 'vitest';

import {
  EncounterFinancialService,
  InMemoryEncounterFinancialRepository,
  type EncounterFinancialAccountRecord,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord
} from '../../../packages/modules/financial/src/index.ts';

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
      getOrThrow() {
        return encounter;
      }
    } as never,
    {
      async getByEncounterOrThrow() {
        return billingRecord;
      },
      async listItems() {
        return billingItems;
      },
      getOrThrow() {
        return billingRecord;
      }
    } as never,
    {
      getOrThrow() {
        return {
          id: encounter.patientId,
          name: 'Luna',
          species: 'canine'
        };
      }
    } as never,
    {
      getOrThrow() {
        return {
          id: encounter.ownerId,
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
    { repository, onReceivablePaid }
  );

  return { service, repository, encounter, billingRecord };
}

class ReversedReceiptHistoryRepository extends InMemoryEncounterFinancialRepository {
  public replaceCalls = 0;

  public override async listPaymentsByFinancialAccount(): Promise<
    readonly EncounterReceivablePaymentRecord[]
  > {
    return [];
  }

  public async hasReversedCashReceiptForFinancialAccount(): Promise<boolean> {
    return true;
  }

  public override async replaceReceivables(
    financialAccountId: string,
    receivables: readonly EncounterReceivableRecord[]
  ): Promise<void> {
    this.replaceCalls += 1;
    await super.replaceReceivables(financialAccountId, receivables);
  }

  public async listHistoricalPayments(financialAccountId: string) {
    return super.listPaymentsByFinancialAccount(financialAccountId);
  }
}

describe('module-financial / repository', () => {
  it('replaces receivables and clears stale payments for the same financial account', async () => {
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

    expect(await repository.listPaymentsByFinancialAccount(account.id)).toHaveLength(1);

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

    await expect(repository.listReceivablesByFinancialAccount(account.id)).resolves.toHaveLength(2);
    await expect(repository.listPaymentsByFinancialAccount(account.id)).resolves.toHaveLength(0);
  });

  it('filters receivables by account and status while preserving newest-first ordering', async () => {
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
        settledAt: '2026-04-13T00:05:00.000Z',
        createdAt: '2026-04-13T00:05:00.000Z',
        updatedAt: '2026-04-13T00:05:00.000Z'
      },
      {
        ...baseReceivable,
        id: 'er_other_account',
        accountId: 'acc_other' as never,
        encounterId: 'enc_2' as never,
        financialAccountId: 'efa_2',
        createdAt: '2026-04-13T00:10:00.000Z',
        updatedAt: '2026-04-13T00:10:00.000Z'
      }
    ]);

    await expect(
      repository.listReceivables({
        accountId: 'acc_cvg_demo' as never,
        status: 'open'
      })
    ).resolves.toEqual([expect.objectContaining({ id: 'er_base' })]);

    await expect(
      repository.listReceivables({
        accountId: 'acc_cvg_demo' as never
      })
    ).resolves.toEqual([
      expect.objectContaining({ id: 'er_settled' }),
      expect.objectContaining({ id: 'er_base' })
    ]);
  });

  it('syncs encounter summary, closes installments and allocates payments in order', async () => {
    const paid: EncounterReceivablePaymentRecord[] = [];
    const { service, encounter, billingRecord } = createFinancialService(
      new InMemoryEncounterFinancialRepository(),
      async (payment) => {
        paid.push(payment);
      }
    );

    const initial = await service.getSummary(encounter.id);
    expect(initial.total).toBe(190);
    expect(initial.receivables).toHaveLength(1);

    const closed = await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
      paidAmount: 120,
      notes: 'Fechamento administrativo',
      installments: [
        { label: 'Entrada', amount: 100 },
        { label: 'Saldo', amount: 90 }
      ]
    });

    expect(closed.financialClosed).toBe(true);
    expect(closed.balanceDue).toBe(70);
    expect(closed.receivables[0]?.status).toBe('settled');
    expect(closed.receivables[1]?.amountOutstanding).toBe(70);
    expect(paid).toHaveLength(2);

    const settled = await service.recordPaymentForBillingRecord(
      encounter.accountId,
      billingRecord.id,
      {
        amountPaid: 70,
        paidByUserId: 'user_finance' as never,
        externalReferenceType: 'billing_record',
        externalReferenceId: billingRecord.id
      }
    );
    expect(settled.financialStatus).toBe('paid');
    expect(settled.receivables.every((item) => item.status === 'settled')).toBe(true);
  });

  it('does not replace a receipt-linked receivable after a cash reversal', async () => {
    const repository = new ReversedReceiptHistoryRepository();
    const { service, encounter } = createFinancialService(repository);
    await service.getSummary(encounter.id);
    repository.replaceCalls = 0;
    const account = await repository.findFinancialAccountByEncounter(encounter.id);
    const receivable = (await repository.listReceivablesByFinancialAccount(account!.id))[0]!;
    await repository.createPayment({
      id: 'historical-cash-payment',
      accountId: encounter.accountId,
      encounterId: encounter.id,
      financialAccountId: account!.id,
      receivableId: receivable.id,
      amountPaid: 190,
      paidAt: '2026-04-13T00:01:00.000Z',
      paidByUserId: 'user_finance' as never,
      externalReferenceType: 'cash_movement',
      externalReferenceId: 'cash-movement-history',
      notes: null,
      createdAt: '2026-04-13T00:01:00.000Z'
    });

    const closed = await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
      installments: [{ amount: 190, label: 'Parcela reaberta' }]
    });

    expect(closed.financialClosed).toBe(true);
    expect(repository.replaceCalls).toBe(0);
    expect((await repository.listReceivablesByFinancialAccount(account!.id))[0]?.id).toBe(
      receivable.id
    );
    expect(await repository.listHistoricalPayments(account!.id)).toHaveLength(1);
  });

  it('rejects inconsistent installments, per-receivable overpayment and supports searchable receivables', async () => {
    const { service, encounter, repository } = createFinancialService();

    await expect(
      service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
        installments: [{ amount: 100 }, { amount: 50 }]
      })
    ).rejects.toThrow('Installment total must match encounter financial total');

    await service.closeEncounterFinancial(encounter.id, 'user_finance' as never, {
      installments: [
        { label: 'Entrada Luna', amount: 100 },
        { label: 'Saldo Maria', amount: 90 }
      ]
    });

    const account = await repository.findFinancialAccountByEncounter(encounter.id);
    const receivables = await repository.listReceivablesByFinancialAccount(account!.id);

    await expect(
      service.settleReceivable(receivables[0]!.id, {
        amountPaid: 101
      })
    ).rejects.toThrow('Payment exceeds outstanding receivable balance');

    const listed = await service.listReceivables({
      accountId: 'acc_cvg_demo' as never,
      search: 'maria',
      page: 1,
      pageSize: 1
    });

    expect(listed.total).toBe(2);
    expect(listed.data).toHaveLength(1);
    expect(listed.totalOutstanding).toBe(190);
    expect(listed.data[0]?.ownerName).toMatch(/Maria/);
  });
});
