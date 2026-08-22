import {
  getTenantTransactionContext,
  type TenantTransactionContext
} from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';

import type {
  EncounterPixPaymentAttemptRecord,
  EncounterPixPaymentAttemptRepository,
  EncounterPixPaymentProviderKey,
  RequestEncounterPixPaymentInput
} from '../encounter-pix-payment-attempt-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const ALLOWED_INPUT_FIELDS = new Set([
  'accountId',
  'actorUserId',
  'encounterId',
  'providerKey',
  'requestKey'
]);
const SYNTHETIC_PIX_PROVIDERS = new Set<EncounterPixPaymentProviderKey>(['local-pix', 'mock']);

export interface RequestEncounterPixPaymentCommandOptions {
  readonly allowSyntheticProviders?: boolean;
}

function requirePlainInput(input: unknown): asserts input is Readonly<Record<string, unknown>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('PIX payment request must be an object');
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ValidationError('PIX payment request must be a plain object');
  }
  for (const field of Object.keys(input)) {
    if (!ALLOWED_INPUT_FIELDS.has(field)) {
      throw new ValidationError(`PIX payment request contains unsupported field: ${field}`);
    }
  }
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID`);
  }
  return value;
}

function requireProviderKey(value: unknown): EncounterPixPaymentProviderKey {
  if (
    typeof value !== 'string' ||
    !SYNTHETIC_PIX_PROVIDERS.has(value as EncounterPixPaymentProviderKey)
  ) {
    throw new ValidationError('providerKey is not a supported synthetic PIX provider');
  }
  return value as EncounterPixPaymentProviderKey;
}

function requireRequestKey(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim().length === 0 ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new ValidationError(
      'requestKey must be an opaque value containing 1 to 255 characters without controls'
    );
  }
  return value;
}

function validate(input: RequestEncounterPixPaymentInput): RequestEncounterPixPaymentInput {
  requirePlainInput(input);
  return Object.freeze({
    accountId: requireUuid(input.accountId, 'accountId'),
    actorUserId: requireUuid(input.actorUserId, 'actorUserId'),
    encounterId: requireUuid(input.encounterId, 'encounterId'),
    providerKey: requireProviderKey(input.providerKey),
    requestKey: requireRequestKey(input.requestKey)
  });
}

export class RequestEncounterPixPaymentCommand {
  public constructor(
    private readonly repository: EncounterPixPaymentAttemptRepository,
    private readonly options: RequestEncounterPixPaymentCommandOptions = {},
    private readonly transactionProvider: () =>
      | TenantTransactionContext
      | undefined = getTenantTransactionContext
  ) {}

  public async execute(
    input: RequestEncounterPixPaymentInput
  ): Promise<EncounterPixPaymentAttemptRecord> {
    const validated = validate(input);
    if (
      SYNTHETIC_PIX_PROVIDERS.has(validated.providerKey) &&
      this.options.allowSyntheticProviders !== true
    ) {
      throw new AppError(
        'SYNTHETIC_PIX_PROVIDER_DISABLED',
        'Synthetic PIX providers require an explicit non-production capability',
        503
      );
    }

    const transaction = this.transactionProvider();
    if (!transaction) {
      throw new AppError(
        'PIX_PAYMENT_ATTEMPT_TRANSACTION_REQUIRED',
        'PIX payment request must execute inside the tenant unit of work',
        503
      );
    }
    if (
      transaction.accountId !== validated.accountId ||
      transaction.actorUserId !== validated.actorUserId
    ) {
      throw new AppError(
        'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH',
        'PIX payment request does not match the active transaction',
        403
      );
    }

    return this.repository.create(transaction, validated);
  }
}
