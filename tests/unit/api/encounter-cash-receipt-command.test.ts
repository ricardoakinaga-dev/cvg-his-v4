import { describe, expect, it, vi } from 'vitest';

import { EncounterCashReceiptCommand } from '../../../apps/api/src/commands/encounter-cash-receipt.js';
import type {
  EncounterCashReceiptRecord,
  EncounterCashReceiptRepository
} from '../../../apps/api/src/encounter-cash-receipt-repository.js';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

const accountId = '00000000-0000-0000-0000-000000000001';
const encounterId = '00000000-0000-0000-0000-000000000002';
const registerId = '00000000-0000-0000-0000-000000000003';
const actorUserId = '00000000-0000-0000-0000-000000000004';
const receipt: EncounterCashReceiptRecord = {
  id: '00000000-0000-0000-0000-000000000005',
  accountId,
  encounterId,
  billingRecordId: 'bill-1',
  financialAccountId: '00000000-0000-0000-0000-000000000006',
  receivableId: '00000000-0000-0000-0000-000000000007',
  receivablePaymentId: '00000000-0000-0000-0000-000000000008',
  cashRegisterId: registerId,
  cashMovementId: '00000000-0000-0000-0000-000000000009',
  journalEntryId: '00000000-0000-0000-0000-000000000010',
  amount: 125.5,
  currency: 'BRL',
  receivedAt: '2026-08-22T12:00:00.000Z',
  receivedByUserId: actorUserId,
  notes: 'Pagamento integral'
};

function createRepository() {
  const create = vi.fn<EncounterCashReceiptRepository['create']>().mockResolvedValue(receipt);
  return {
    repository: { create, findById: vi.fn() } as EncounterCashReceiptRepository,
    create
  };
}

describe('EncounterCashReceiptCommand', () => {
  it('requires an active tenant transaction and delegates a normalized immutable input', async () => {
    const { repository, create } = createRepository();
    const transaction = { accountId, actorUserId } as never;
    const command = new EncounterCashReceiptCommand(repository, () => transaction);

    await expect(command.execute({
      accountId,
      encounterId,
      actorUserId,
      cashRegisterId: registerId,
      expectedAmount: 125.5,
      notes: '  Pagamento integral  '
    })).resolves.toEqual(receipt);
    expect(create).toHaveBeenCalledWith(transaction, {
      accountId,
      encounterId,
      actorUserId,
      cashRegisterId: registerId,
      expectedAmount: 125.5,
      notes: 'Pagamento integral'
    });
  });

  it('fails closed outside the tenant unit of work', async () => {
    const { repository } = createRepository();
    const command = new EncounterCashReceiptCommand(repository, () => undefined);

    await expect(command.execute({
      accountId,
      encounterId,
      actorUserId,
      cashRegisterId: registerId,
      expectedAmount: 125.5
    })).rejects.toMatchObject<AppError>({
      code: 'CASH_RECEIPT_TRANSACTION_REQUIRED',
      statusCode: 503
    });
  });

  it.each([
    { accountId: 'wrong', encounterId, actorUserId, cashRegisterId: registerId, expectedAmount: 1 },
    { accountId, encounterId: 'wrong', actorUserId, cashRegisterId: registerId, expectedAmount: 1 },
    { accountId, encounterId, actorUserId: 'wrong', cashRegisterId: registerId, expectedAmount: 1 },
    { accountId, encounterId, actorUserId, cashRegisterId: 'wrong', expectedAmount: 1 },
    { accountId, encounterId, actorUserId, cashRegisterId: registerId, expectedAmount: 0 },
    { accountId, encounterId, actorUserId, cashRegisterId: registerId, expectedAmount: 1.001 },
    {
      accountId,
      encounterId,
      actorUserId,
      cashRegisterId: registerId,
      expectedAmount: 1,
      notes: 'x'.repeat(501)
    }
  ])('rejects invalid boundary input %#', async (input) => {
    const { repository } = createRepository();
    const command = new EncounterCashReceiptCommand(repository, () => ({} as never));
    await expect(command.execute(input)).rejects.toBeInstanceOf(ValidationError);
  });
});
