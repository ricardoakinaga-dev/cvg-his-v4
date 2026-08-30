import {
  getTenantTransactionContext,
  type TenantTransactionContext
} from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

import type {
  ApplyConfirmedPixSettlementInput,
  ConfirmedPixSettlementRecord,
  ConfirmedPixSettlementRepository
} from './confirmed-pix-settlement-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AMOUNT_CENTS = 999_999_999_999;
const PIX_PROVIDERS = new Set(['local-pix', 'mock', 'pagarme']);
const SYNTHETIC_PIX_PROVIDERS = new Set(['local-pix', 'mock']);
const CLAIMS_FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

export interface ConfirmedPixSettlementCommandOptions {
  readonly allowSyntheticProviders?: boolean;
}

function requireUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
}

function requireIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) {
    throw new ValidationError(`${field} must contain 1 to 255 characters`);
  }
  return normalized;
}

function validate(input: ApplyConfirmedPixSettlementInput): ApplyConfirmedPixSettlementInput {
  requireUuid(input.accountId, 'accountId');
  requireUuid(input.actorUserId, 'actorUserId');
  if (input.attemptId !== undefined) requireUuid(input.attemptId, 'attemptId');
  if (!PIX_PROVIDERS.has(input.provider)) {
    throw new ValidationError('provider is not supported for PIX settlement');
  }
  if (
    input.claimsFingerprint !== undefined
    && !CLAIMS_FINGERPRINT_PATTERN.test(input.claimsFingerprint)
  ) {
    throw new ValidationError('claimsFingerprint must be a lowercase SHA-256 hex digest');
  }
  if (input.currency !== 'BRL') {
    throw new ValidationError('currency must be BRL');
  }
  if (
    !Number.isSafeInteger(input.amountCents)
    || input.amountCents <= 0
    || input.amountCents > MAX_AMOUNT_CENTS
  ) {
    throw new ValidationError('amountCents must be a positive safe integer within BRL limits');
  }

  const confirmedAt = new Date(input.confirmedAt);
  if (!Number.isFinite(confirmedAt.getTime())) {
    throw new ValidationError('confirmedAt must be a valid date-time');
  }

  return Object.freeze({
    ...input,
    providerEventId: requireIdentifier(input.providerEventId, 'providerEventId'),
    transactionId: requireIdentifier(input.transactionId, 'transactionId'),
    billingRecordId: requireIdentifier(input.billingRecordId, 'billingRecordId'),
    confirmedAt: confirmedAt.toISOString()
  });
}

export class ConfirmedPixSettlementCommand {
  public constructor(
    private readonly repository: ConfirmedPixSettlementRepository,
    private readonly options: ConfirmedPixSettlementCommandOptions = {},
    private readonly transactionProvider: () => TenantTransactionContext | undefined =
      getTenantTransactionContext
  ) {}

  public async execute(
    input: ApplyConfirmedPixSettlementInput
  ): Promise<ConfirmedPixSettlementRecord> {
    const validated = validate(input);
    if (
      SYNTHETIC_PIX_PROVIDERS.has(validated.provider)
      && this.options.allowSyntheticProviders !== true
    ) {
      throw new AppError(
        'SYNTHETIC_PIX_PROVIDER_DISABLED',
        'Synthetic PIX settlement requires an explicit non-production capability',
        503
      );
    }
    const transaction = this.transactionProvider();
    if (!transaction) {
      throw new AppError(
        'CONFIRMED_PIX_TRANSACTION_REQUIRED',
        'Confirmed PIX settlement must execute inside the tenant unit of work',
        503
      );
    }
    if (
      transaction.accountId !== validated.accountId
      || transaction.actorUserId !== validated.actorUserId
    ) {
      throw new AppError(
        'CONFIRMED_PIX_CONTEXT_MISMATCH',
        'Confirmed PIX settlement context does not match the active transaction',
        403
      );
    }
    return this.repository.apply(transaction, validated);
  }
}
