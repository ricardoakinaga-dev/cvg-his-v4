import { getTenantTransactionContext } from '@cvg-his-v2/shared-database';
import type { TenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

import type {
  CreateEncounterCashReceiptReversalInput,
  EncounterCashReceiptReversal,
  EncounterCashReceiptReversalRepository
} from '../encounter-cash-receipt-reversal-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
}

function validate(
  input: CreateEncounterCashReceiptReversalInput
): CreateEncounterCashReceiptReversalInput {
  requireUuid(input.accountId, 'accountId');
  requireUuid(input.encounterId, 'encounterId');
  requireUuid(input.receiptId, 'receiptId');
  requireUuid(input.actorUserId, 'actorUserId');
  if (typeof input.reason !== 'string') throw new ValidationError('reason must be a string');
  const reason = input.reason.trim();
  if (!reason) throw new ValidationError('reason is required');
  if (reason.length > 500) throw new ValidationError('reason must contain at most 500 characters');
  return Object.freeze({ ...input, reason });
}

export class EncounterCashReceiptReversalCommand {
  public constructor(
    private readonly repository: EncounterCashReceiptReversalRepository,
    private readonly transactionProvider: () =>
      | TenantTransactionContext
      | undefined = getTenantTransactionContext
  ) {}

  public async execute(
    input: CreateEncounterCashReceiptReversalInput
  ): Promise<EncounterCashReceiptReversal> {
    const validated = validate(input);
    const transaction = this.transactionProvider();
    if (!transaction) {
      throw new AppError(
        'CASH_RECEIPT_REVERSAL_TRANSACTION_REQUIRED',
        'Cash receipt reversal must execute inside the tenant unit of work',
        503
      );
    }
    return this.repository.reverse(transaction, validated);
  }
}
