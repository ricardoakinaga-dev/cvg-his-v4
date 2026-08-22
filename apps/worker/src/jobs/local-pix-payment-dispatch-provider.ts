import {
  PixPaymentDispatchProviderError,
  type PixPaymentDispatchProvider,
  type PixPaymentDispatchProviderInput,
  type PixPaymentDispatchResult
} from './pix-payment-dispatcher.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_IDEMPOTENCY_PREFIX = 'cvg:pix:create:v1:';
const SYNTHETIC_EXPIRY_MS = 15 * 60 * 1_000;
const MAX_AMOUNT_CENTS = 999_999_999_999;

function rejectSyntheticInput(): never {
  throw new PixPaymentDispatchProviderError({
    code: 'SYNTHETIC_REJECTED',
    failureClass: 'permanent',
    publicMessage: 'PIX request was rejected before creation'
  });
}

function assertSyntheticInput(input: PixPaymentDispatchProviderInput): void {
  if (
    !UUID_PATTERN.test(input.accountId) ||
    !UUID_PATTERN.test(input.attemptId) ||
    !UUID_PATTERN.test(input.encounterId) ||
    input.billingRecordId.length === 0 ||
    input.billingRecordId.includes('\0') ||
    Buffer.byteLength(input.billingRecordId, 'utf8') > 255 ||
    !Number.isSafeInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    input.amountCents > MAX_AMOUNT_CENTS ||
    input.currency !== 'BRL' ||
    input.providerIdempotencyKey !== `${PROVIDER_IDEMPOTENCY_PREFIX}${input.attemptId}` ||
    !Number.isFinite(new Date(input.attemptCreatedAt).getTime())
  ) {
    rejectSyntheticInput();
  }
}

export class LocalPixPaymentDispatchProvider implements PixPaymentDispatchProvider {
  public readonly key = 'local-pix' as const;
  public readonly mode = 'synthetic' as const;

  public async createIntent(input: PixPaymentDispatchProviderInput) {
    assertSyntheticInput(input);
    if (input.signal?.aborted) {
      throw new PixPaymentDispatchProviderError({
        code: 'SYNTHETIC_UNAVAILABLE',
        failureClass: 'transient',
        publicMessage: 'PIX provider is temporarily unavailable'
      });
    }

    const qrCodePayload = [
      'CVG-LOCAL-PIX',
      'v1',
      input.attemptId,
      String(input.amountCents),
      input.currency
    ].join('|');
    return Object.freeze({
      providerTransactionId: `local-pix-${input.attemptId}`,
      qrCodePayload,
      qrCodeBase64: Buffer.from(qrCodePayload, 'utf8').toString('base64'),
      expiresAt: new Date(
        new Date(input.attemptCreatedAt).getTime() + SYNTHETIC_EXPIRY_MS
      ).toISOString()
    });
  }
}

export interface PixPaymentDispatchTickTarget {
  processNext(accountId: string): Promise<PixPaymentDispatchResult>;
}

export type PixPaymentDispatchTickOutcome =
  | {
      readonly accountId: string;
      readonly status: 'processed';
      readonly result: PixPaymentDispatchResult;
    }
  | {
      readonly accountId: string;
      readonly status: 'failed';
      readonly error: unknown;
    };

export async function runPixPaymentDispatchTick(
  dispatcher: PixPaymentDispatchTickTarget,
  accountIds: readonly string[]
): Promise<readonly PixPaymentDispatchTickOutcome[]> {
  let outcomes: readonly PixPaymentDispatchTickOutcome[] = Object.freeze([]);
  for (const accountId of accountIds) {
    let outcome: PixPaymentDispatchTickOutcome;
    try {
      outcome = Object.freeze({
        accountId,
        status: 'processed',
        result: await dispatcher.processNext(accountId)
      });
    } catch (error) {
      outcome = Object.freeze({ accountId, status: 'failed', error });
    }
    outcomes = Object.freeze([...outcomes, outcome]);
  }
  return outcomes;
}
