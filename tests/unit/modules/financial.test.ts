import { describe, expect, it } from 'vitest';

import {
  InMemoryEncounterFinancialRepository,
  type EncounterFinancialAccountRecord,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord
} from '../../../packages/modules/financial/src/index.ts';

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
});
