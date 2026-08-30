import { describe, expect, it, vi } from 'vitest';

import { EncounterCashReceiptReversalCommand } from '../../../apps/api/src/commands/encounter-cash-receipt-reversal.js';
import type {
  EncounterCashReceiptReversal,
  EncounterCashReceiptReversalRepository
} from '../../../apps/api/src/encounter-cash-receipt-reversal-repository.js';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

const accountId = '00000000-0000-0000-0000-000000000001';
const encounterId = '00000000-0000-0000-0000-000000000002';
const receiptId = '00000000-0000-0000-0000-000000000003';
const actorUserId = '00000000-0000-0000-0000-000000000004';

const reversal: EncounterCashReceiptReversal = {
  id: '00000000-0000-0000-0000-000000000005',
  accountId,
  receiptId,
  encounterId,
  billingRecordId: 'billing-1',
  financialAccountId: '00000000-0000-0000-0000-000000000006',
  receivableId: '00000000-0000-0000-0000-000000000007',
  receivablePaymentId: '00000000-0000-0000-0000-000000000008',
  originalCashRegisterId: '00000000-0000-0000-0000-000000000009',
  reversalCashRegisterId: '00000000-0000-0000-0000-000000000010',
  originalCashMovementId: '00000000-0000-0000-0000-000000000011',
  reversalCashMovementId: '00000000-0000-0000-0000-000000000012',
  originalJournalEntryId: '00000000-0000-0000-0000-000000000013',
  reversalJournalEntryId: '00000000-0000-0000-0000-000000000014',
  amount: 125.5,
  currency: 'BRL',
  reason: 'Correção de recebimento',
  reversedByUserId: actorUserId,
  reversedAt: '2026-08-26T23:20:00.000Z'
};

function createRepository() {
  const reverse = vi
    .fn<EncounterCashReceiptReversalRepository['reverse']>()
    .mockResolvedValue(reversal);
  return {
    repository: { reverse } as EncounterCashReceiptReversalRepository,
    reverse
  };
}

describe('EncounterCashReceiptReversalCommand', () => {
  it('requires a tenant transaction and delegates a normalized immutable input', async () => {
    const { repository, reverse } = createRepository();
    const transaction = { accountId, actorUserId } as never;
    const command = new EncounterCashReceiptReversalCommand(repository, () => transaction);

    await expect(
      command.execute({
        accountId,
        encounterId,
        receiptId,
        actorUserId,
        reason: '  Correção de recebimento  '
      })
    ).resolves.toEqual(reversal);
    expect(reverse).toHaveBeenCalledWith(transaction, {
      accountId,
      encounterId,
      receiptId,
      actorUserId,
      reason: 'Correção de recebimento'
    });
  });

  it('fails closed outside the tenant unit of work', async () => {
    const { repository } = createRepository();
    const command = new EncounterCashReceiptReversalCommand(repository, () => undefined);

    await expect(
      command.execute({
        accountId,
        encounterId,
        receiptId,
        actorUserId,
        reason: 'Correção'
      })
    ).rejects.toMatchObject<AppError>({
      code: 'CASH_RECEIPT_REVERSAL_TRANSACTION_REQUIRED',
      statusCode: 503
    });
  });

  it.each([
    { accountId: 'bad' },
    { encounterId: 'bad' },
    { receiptId: 'bad' },
    { actorUserId: 'bad' },
    { reason: ' ' },
    { reason: 'x'.repeat(501) }
  ])('rejects invalid boundary input %#', async (override) => {
    const { repository, reverse } = createRepository();
    const command = new EncounterCashReceiptReversalCommand(
      repository,
      () => ({ accountId, actorUserId }) as never
    );

    await expect(
      command.execute({
        accountId,
        encounterId,
        receiptId,
        actorUserId,
        reason: 'Correção',
        ...override
      })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reverse).not.toHaveBeenCalled();
  });
});
