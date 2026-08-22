import { getTenantTransactionContext } from '@cvg-his-v2/shared-database';
import type { TenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

import type {
  CreateEncounterCashReceiptInput,
  EncounterCashReceiptRecord,
  EncounterCashReceiptRepository
} from '../encounter-cash-receipt-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
}

function validate(input: CreateEncounterCashReceiptInput): CreateEncounterCashReceiptInput {
  requireUuid(input.accountId, 'accountId');
  requireUuid(input.encounterId, 'encounterId');
  requireUuid(input.actorUserId, 'actorUserId');
  requireUuid(input.cashRegisterId, 'cashRegisterId');
  if (
    !Number.isFinite(input.expectedAmount)
    || input.expectedAmount <= 0
    || Math.abs(input.expectedAmount * 100 - Math.round(input.expectedAmount * 100)) > 1e-8
  ) {
    throw new ValidationError('expectedAmount must be a positive amount with at most two decimals');
  }
  const notes = input.notes?.trim();
  if (notes && notes.length > 500) throw new ValidationError('notes must contain at most 500 characters');
  return Object.freeze({
    ...input,
    expectedAmount: Number(input.expectedAmount.toFixed(2)),
    notes: notes || undefined
  });
}

export class EncounterCashReceiptCommand {
  public constructor(
    private readonly repository: EncounterCashReceiptRepository,
    private readonly transactionProvider: () => TenantTransactionContext | undefined =
      getTenantTransactionContext
  ) {}

  public async execute(
    input: CreateEncounterCashReceiptInput
  ): Promise<EncounterCashReceiptRecord> {
    const validated = validate(input);
    const transaction = this.transactionProvider();
    if (!transaction) {
      throw new AppError(
        'CASH_RECEIPT_TRANSACTION_REQUIRED',
        'Cash receipt must execute inside the tenant unit of work',
        503
      );
    }
    return this.repository.create(transaction, validated);
  }
}
