import {
  ConfirmedPixSettlementCommand,
  DatabaseConfirmedPixSettlementRepository,
  type ApplyConfirmedPixSettlementInput,
  type ConfirmedPixSettlementCheckpoint,
  type ConfirmedPixSettlementRecord
} from '@cvg-his-v2/module-pix';
import type { TenantTransactionContext } from '@cvg-his-v2/shared-database';

import { recordPixProviderSettlementMetric } from '../worker-metrics.js';
import type {
  PixProviderEventDeliveryClaim,
  PixProviderEventDeliveryClaimNextResult,
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
const TRANSIENT_INFRASTRUCTURE_CODES = new Set([
  // PostgreSQL serialization, deadlock, lock contention and connection failures.
  '40001',
  '40P01',
  '55P03',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '53300',
  '57P01',
  '57P02',
  '57P03',
  // Node transport and undici provider failures.
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT'
]);
const OBSERVABLE_FAILURE_CODES = new Set([
  ...RETRYABLE_CODES,
  ...TRANSIENT_INFRASTRUCTURE_CODES,
  'PIX_SETTLEMENT_ATTEMPT_TERMINAL',
  'PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED',
  'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
  'PIX_SETTLEMENT_UNEXPECTED'
]);

export interface ConfirmedPixSettlementExecutor {
  execute(input: ApplyConfirmedPixSettlementInput): Promise<unknown>;
}

export type PixProviderSettlementCheckpoint =
  | 'after_claim_commit'
  | 'before_b1'
  | 'after_b1_before_cas'
  | 'after_applied_cas';

export interface PixProviderSettlementCheckpointContext {
  readonly deliveryId: string;
  readonly accountId: string;
  readonly leaseVersion: number;
}

export interface PixProviderSettlementConsumerOptions {
  readonly workerId: string;
  readonly leaseMs: number;
  readonly allowSyntheticProviders?: boolean;
  readonly createSettlementExecutor?: (
    transaction: TenantTransactionContext
  ) => ConfirmedPixSettlementExecutor;
  /**
   * Test/operations failpoints for proving process recovery around durable
   * settlement boundaries. The callback receives only immutable identifiers.
   */
  readonly onCheckpoint?: (
    checkpoint: PixProviderSettlementCheckpoint,
    context: PixProviderSettlementCheckpointContext
  ) => void | Promise<void>;
  /**
   * Test/operations failpoints for proving process recovery inside the
   * transaction-owned B1 settlement writes. The callback receives only
   * immutable identifiers and the named internal checkpoint.
   */
  readonly onSettlementCheckpoint?: (
    checkpoint: ConfirmedPixSettlementCheckpoint,
    context: PixProviderSettlementCheckpointContext
  ) => void | Promise<void>;
  /**
   * Best-effort hook for structured operational events. It receives only
   * bounded state and safe error codes; tenant and payment data are omitted.
   */
  readonly telemetry?: PixProviderSettlementTelemetry;
}

export type PixProviderSettlementOutcome =
  | 'idle'
  | 'applied'
  | 'lease_lost'
  | 'retry_scheduled'
  | 'reconciliation_required';

export interface PixProviderSettlementTelemetryEvent {
  readonly name: 'pix_provider_settlement.delivery_outcome';
  readonly outcome: PixProviderSettlementOutcome;
  readonly failureClass?: 'retryable' | 'terminal';
  readonly failureCode?: string;
  readonly attempts?: number;
  readonly maxAttempts?: number;
  readonly reconciliationRequiredPromotions?: number;
  readonly promotionSource?: 'attempts_exhausted';
}

export interface PixProviderSettlementTelemetry {
  record(event: PixProviderSettlementTelemetryEvent): void;
}

interface PixProviderSettlementPromotionObservation {
  readonly reconciliationRequiredPromotions?: number;
}

export type PixProviderSettlementConsumerResult = PixProviderSettlementPromotionObservation &
  (
    | { readonly status: 'idle' }
    | {
        readonly status: 'applied' | 'lease_lost';
        readonly deliveryId: string;
      }
    | {
        readonly status: 'reconciliation_required' | 'retry_scheduled';
        readonly deliveryId: string;
        readonly failureCode?: string;
        readonly failureClass?: 'retryable' | 'terminal';
      }
  );

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

function errorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 3) return undefined;
  if (!error || typeof error !== 'object') return undefined;
  const code = 'code' in error ? (error as { readonly code?: unknown }).code : undefined;
  if (typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)) return code;
  const cause = 'cause' in error ? (error as { readonly cause?: unknown }).cause : undefined;
  return cause && cause !== error ? errorCode(cause, depth + 1) : undefined;
}

function safeErrorCode(error: unknown): string {
  return errorCode(error) ?? 'PIX_SETTLEMENT_UNEXPECTED';
}

function observableFailureCode(code: string): string {
  // New or provider-specific codes remain persisted for reconciliation, but
  // must be explicitly approved here before reaching operational event/log sinks.
  return OBSERVABLE_FAILURE_CODES.has(code) ? code : 'PIX_SETTLEMENT_UNEXPECTED';
}

function assertPromotionCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('PIX settlement reconciliation promotion count is invalid');
  }
}

function isTransientInfrastructureError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const code = errorCode(current);
    if (code && TRANSIENT_INFRASTRUCTURE_CODES.has(code)) return true;
    if (!current || typeof current !== 'object' || !('cause' in current)) return false;
    current = (current as { readonly cause?: unknown }).cause;
  }
  return false;
}

function failureFor(
  error: unknown,
  claim: PixProviderEventDeliveryClaim
): PixProviderEventDeliveryFailure {
  const code = safeErrorCode(error);
  if (RETRYABLE_CODES.has(code) || isTransientInfrastructureError(error)) {
    return Object.freeze({
      code,
      errorClass: 'retryable',
      retryDelaySeconds: pixProviderSettlementBackoffSeconds(claim.attempts)
    });
  }
  return Object.freeze({ code, errorClass: 'terminal', retryDelaySeconds: 0 });
}

function isCanonicalReplay(
  value: unknown,
  input: ApplyConfirmedPixSettlementInput
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<ConfirmedPixSettlementRecord>;
  return record.accountId === input.accountId
    && record.provider === input.provider
    && record.providerEventId !== undefined
    && record.providerEventId !== input.providerEventId
    && record.transactionId === input.transactionId
    && record.billingRecordId === input.billingRecordId
    && record.amountCents === input.amountCents
    && record.currency === input.currency
    && record.confirmedAt === input.confirmedAt;
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
    const claimNextInput = {
      accountId,
      leaseOwner: this.#options.workerId,
      leaseMs: this.#options.leaseMs
    };
    const claimResult = await this.#claimNext(claimNextInput);
    const promotionObservation =
      claimResult.reconciliationRequiredPromotions > 0
        ? { reconciliationRequiredPromotions: claimResult.reconciliationRequiredPromotions }
        : {};
    if (claimResult.reconciliationRequiredPromotions > 0) {
      this.#recordExhaustedPromotions(claimResult.reconciliationRequiredPromotions);
    }
    const claim = claimResult.claim;
    if (!claim) {
      return this.#recordOutcome(Object.freeze({ status: 'idle', ...promotionObservation }));
    }

    try {
      await this.#checkpoint('after_claim_commit', claim);
      const execution = await this.#repository.executeSettlement(
        claim,
        async (input, transaction) => {
          const executor = this.#options.createSettlementExecutor
            ? this.#options.createSettlementExecutor(transaction)
            : new ConfirmedPixSettlementCommand(
                new DatabaseConfirmedPixSettlementRepository({
                  onCheckpoint: async (checkpoint) => {
                    await this.#settlementCheckpoint(checkpoint, claim);
                  }
                }),
                { allowSyntheticProviders: this.#options.allowSyntheticProviders === true },
                () => transaction
              );
          await this.#checkpoint('before_b1', claim);
          const settlement = await executor.execute(input);
          await this.#checkpoint('after_b1_before_cas', claim);
          return isCanonicalReplay(settlement, input) ? 'canonical_replay' : undefined;
        }
      );
      if (execution === 'applied') await this.#checkpoint('after_applied_cas', claim);
      return this.#recordOutcome(
        Object.freeze({ status: execution, deliveryId: claim.deliveryId, ...promotionObservation }),
        claim
      );
    } catch (error) {
      const failure = failureFor(error, claim);
      const status = await this.#repository.completeFailure(claim, failure);
      if (!status) {
        return this.#recordOutcome(
          Object.freeze({
            status: 'lease_lost',
            deliveryId: claim.deliveryId,
            ...promotionObservation
          }),
          claim
        );
      }
      return this.#recordOutcome(
        Object.freeze({
          status,
          deliveryId: claim.deliveryId,
          failureCode: observableFailureCode(failure.code),
          failureClass: failure.errorClass,
          ...promotionObservation
        }),
        claim
      );
    }
  }

  async #checkpoint(
    checkpoint: PixProviderSettlementCheckpoint,
    claim: PixProviderEventDeliveryClaim
  ): Promise<void> {
    const context = Object.freeze({
      deliveryId: claim.deliveryId,
      accountId: claim.accountId,
      leaseVersion: claim.leaseVersion
    });
    await this.#options.onCheckpoint?.(checkpoint, context);
  }

  async #settlementCheckpoint(
    checkpoint: ConfirmedPixSettlementCheckpoint,
    claim: PixProviderEventDeliveryClaim
  ): Promise<void> {
    const context = Object.freeze({
      deliveryId: claim.deliveryId,
      accountId: claim.accountId,
      leaseVersion: claim.leaseVersion
    });
    await this.#options.onSettlementCheckpoint?.(checkpoint, context);
  }

  async #claimNext(input: {
    readonly accountId: string;
    readonly leaseOwner: string;
    readonly leaseMs: number;
  }): Promise<PixProviderEventDeliveryClaimNextResult> {
    const result = this.#repository.claimNextWithPromotion
      ? await this.#repository.claimNextWithPromotion(input)
      : Object.freeze({
          claim: await this.#repository.claimNext(input),
          reconciliationRequiredPromotions: 0
        });
    assertPromotionCount(result.reconciliationRequiredPromotions);
    return result;
  }

  #recordExhaustedPromotions(reconciliationRequiredPromotions: number): void {
    this.#recordTelemetry(
      Object.freeze({
        name: 'pix_provider_settlement.delivery_outcome' as const,
        outcome: 'reconciliation_required' as const,
        failureClass: 'terminal' as const,
        failureCode: 'PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED',
        reconciliationRequiredPromotions,
        promotionSource: 'attempts_exhausted' as const
      }),
      reconciliationRequiredPromotions
    );
  }

  #recordOutcome(
    result: PixProviderSettlementConsumerResult,
    claim?: PixProviderEventDeliveryClaim
  ): PixProviderSettlementConsumerResult {
    const event = Object.freeze({
      name: 'pix_provider_settlement.delivery_outcome' as const,
      outcome: result.status,
      ...('failureClass' in result && result.failureClass
        ? {
            failureClass: result.failureClass,
            failureCode: result.failureCode
          }
        : {}),
      ...(result.reconciliationRequiredPromotions
        ? { reconciliationRequiredPromotions: result.reconciliationRequiredPromotions }
        : {}),
      ...(claim
        ? {
            attempts: claim.attempts,
            maxAttempts: claim.maxAttempts
          }
        : {})
    });
    this.#recordTelemetry(event);
    return result;
  }

  #recordTelemetry(event: PixProviderSettlementTelemetryEvent, count = 1): void {
    // Observability must not alter settlement durability or the fenced result.
    try {
      recordPixProviderSettlementMetric({
        outcome: event.outcome,
        failureClass: event.failureClass,
        count
      });
      this.#options.telemetry?.record(event);
    } catch {
      // Metrics/logging exporter failures are intentionally best effort.
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
