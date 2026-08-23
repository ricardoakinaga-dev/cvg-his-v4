import {
  ConfirmedPixSettlementCommand,
  DatabaseConfirmedPixSettlementRepository,
  type ApplyConfirmedPixSettlementInput
} from '@cvg-his-v2/module-pix';
import type { TenantTransactionContext } from '@cvg-his-v2/shared-database';

import type {
  PixProviderEventDeliveryClaim,
  PixProviderEventDeliveryFailure,
  PixProviderEventDeliveryRepository
} from './pix-provider-event-delivery-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LEASE_MS = 60 * 60 * 1_000;
const RETRYABLE_CODES = new Set([
  'PIX_SETTLEMENT_PRINCIPAL_NOT_FOUND',
  'PIX_SETTLEMENT_PRINCIPAL_INVALID',
  'PIX_NOT_CORRELATED'
]);

export interface ConfirmedPixSettlementExecutor {
  execute(input: ApplyConfirmedPixSettlementInput): Promise<unknown>;
}

export interface PixProviderSettlementConsumerOptions {
  readonly workerId: string;
  readonly leaseMs: number;
  readonly allowSyntheticProviders?: boolean;
  readonly createSettlementExecutor?: (
    transaction: TenantTransactionContext
  ) => ConfirmedPixSettlementExecutor;
}

export type PixProviderSettlementConsumerResult =
  | { readonly status: 'idle' }
  | {
      readonly status: 'applied' | 'lease_lost' | 'reconciliation_required' | 'retry_scheduled';
      readonly deliveryId: string;
    };

export function pixProviderSettlementBackoffSeconds(attempts: number): number {
  if (!Number.isSafeInteger(attempts) || attempts <= 0) {
    throw new Error('PIX settlement attempts must be a positive safe integer');
  }
  const exponent = Math.min(attempts - 1, 30);
  return Math.min(5 * 2 ** exponent, 900);
}

function assertOptions(options: PixProviderSettlementConsumerOptions): void {
  if (
    options.workerId !== options.workerId.trim() ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(options.workerId) ||
    Buffer.byteLength(options.workerId, 'utf8') > 160
  ) {
    throw new Error('PIX settlement worker id is invalid');
  }
  if (
    !Number.isSafeInteger(options.leaseMs) ||
    options.leaseMs <= 0 ||
    options.leaseMs > MAX_LEASE_MS
  ) {
    throw new Error('PIX settlement lease duration is invalid');
  }
}

function safeErrorCode(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? (error as { readonly code?: unknown }).code
      : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)
    ? code
    : 'PIX_SETTLEMENT_UNEXPECTED';
}

function failureFor(
  error: unknown,
  claim: PixProviderEventDeliveryClaim
): PixProviderEventDeliveryFailure {
  const code = safeErrorCode(error);
  if (RETRYABLE_CODES.has(code)) {
    return Object.freeze({
      code,
      errorClass: 'retryable',
      retryDelaySeconds: pixProviderSettlementBackoffSeconds(claim.attempts)
    });
  }
  return Object.freeze({ code, errorClass: 'terminal', retryDelaySeconds: 0 });
}

export class PixProviderSettlementConsumer {
  readonly #repository: PixProviderEventDeliveryRepository;
  readonly #options: PixProviderSettlementConsumerOptions;

  public constructor(
    repository: PixProviderEventDeliveryRepository,
    options: PixProviderSettlementConsumerOptions
  ) {
    assertOptions(options);
    this.#repository = repository;
    this.#options = Object.freeze({ ...options });
  }

  public async processNext(accountId: string): Promise<PixProviderSettlementConsumerResult> {
    if (!UUID_PATTERN.test(accountId)) {
      throw new Error('PIX settlement account id must be a valid UUID');
    }
    const claim = await this.#repository.claimNext({
      accountId,
      leaseOwner: this.#options.workerId,
      leaseMs: this.#options.leaseMs
    });
    if (!claim) return Object.freeze({ status: 'idle' });

    try {
      const execution = await this.#repository.executeSettlement(
        claim,
        async (input, transaction) => {
          const executor = this.#options.createSettlementExecutor
            ? this.#options.createSettlementExecutor(transaction)
            : new ConfirmedPixSettlementCommand(
                new DatabaseConfirmedPixSettlementRepository(),
                { allowSyntheticProviders: this.#options.allowSyntheticProviders === true },
                () => transaction
              );
          await executor.execute(input);
        }
      );
      return Object.freeze({ status: execution, deliveryId: claim.deliveryId });
    } catch (error) {
      const status = await this.#repository.completeFailure(claim, failureFor(error, claim));
      return Object.freeze({
        status: status ?? 'lease_lost',
        deliveryId: claim.deliveryId
      });
    }
  }
}

export async function runPixProviderSettlementTick(
  consumer: Pick<PixProviderSettlementConsumer, 'processNext'>,
  accountIds: readonly string[]
): Promise<
  readonly Readonly<{
    accountId: string;
    result?: PixProviderSettlementConsumerResult;
    error?: Error;
  }>[]
> {
  return Object.freeze(
    await Promise.all(
      accountIds.map(async (accountId) => {
        try {
          return Object.freeze({ accountId, result: await consumer.processNext(accountId) });
        } catch (error) {
          return Object.freeze({
            accountId,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      })
    )
  );
}
