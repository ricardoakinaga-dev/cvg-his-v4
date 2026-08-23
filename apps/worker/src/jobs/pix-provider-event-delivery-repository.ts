import type { Pool, PoolClient } from 'pg';

import {
  runInTenantTransaction,
  runInTenantTransactionContext,
  type TenantTransactionContext
} from '@cvg-his-v2/shared-database';
import type { ApplyConfirmedPixSettlementInput } from '@cvg-his-v2/module-pix';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,64}$/;
const MAX_LEASE_MS = 60 * 60 * 1_000;

export interface ClaimPixProviderEventDeliveryInput {
  readonly accountId: string;
  readonly leaseOwner: string;
  readonly leaseMs: number;
}

export interface PixProviderEventDeliveryClaim {
  readonly accountId: string;
  readonly deliveryId: string;
  readonly eventId: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
  readonly leaseExpiresAt: string;
}

export interface PixProviderEventDeliveryFailure {
  readonly code: string;
  readonly errorClass: 'retryable' | 'terminal';
  readonly retryDelaySeconds: number;
}

export interface RedrivePixProviderEventDeliveryInput {
  readonly accountId: string;
  readonly deliveryId: string;
  readonly eventId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
  readonly reason: string;
}

export type PixProviderSettlementExecution = 'applied' | 'lease_lost';
export type PixProviderEventDeliveryFailureStatus = 'reconciliation_required' | 'retry_scheduled';

export type ExecuteConfirmedPixSettlement = (
  input: ApplyConfirmedPixSettlementInput,
  transaction: TenantTransactionContext
) => Promise<void>;

export interface PixProviderEventDeliveryRepository {
  claimNext(
    input: ClaimPixProviderEventDeliveryInput
  ): Promise<PixProviderEventDeliveryClaim | null>;
  executeSettlement(
    claim: PixProviderEventDeliveryClaim,
    execute: ExecuteConfirmedPixSettlement
  ): Promise<PixProviderSettlementExecution>;
  completeFailure(
    claim: PixProviderEventDeliveryClaim,
    failure: PixProviderEventDeliveryFailure
  ): Promise<PixProviderEventDeliveryFailureStatus | null>;
  redrive(input: RedrivePixProviderEventDeliveryInput): Promise<boolean>;
}

interface ClaimRow {
  readonly account_id: string;
  readonly attempts: number;
  readonly event_id: string;
  readonly id: string;
  readonly lease_expires_at: Date;
  readonly lease_owner: string;
  readonly lease_token: string;
  readonly lease_version: string;
  readonly max_attempts: number;
}

interface EventRow {
  readonly amount_cents: string;
  readonly confirmed_at: Date;
  readonly correlation_id: string;
  readonly currency: string;
  readonly event_id: string;
  readonly event_type: string;
  readonly payment_attempt_id: string;
  readonly provider: string;
  readonly provider_event_id: string;
  readonly provider_transaction_id: string;
}

interface AttemptRow {
  readonly amount_cents: string;
  readonly billing_record_id: string;
  readonly currency: string;
  readonly provider_key: string;
  readonly provider_transaction_id: string | null;
  readonly state: string;
}

interface PixRow {
  readonly amount_cents: string;
  readonly billing_record_id: string | null;
  readonly currency: string;
  readonly payment_attempt_id: string | null;
  readonly provider: string;
  readonly provider_transaction_id: string | null;
  readonly transaction_id: string;
}

export class PixProviderSettlementDeliveryError extends Error {
  public constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'PixProviderSettlementDeliveryError';
  }
}

class PixProviderSettlementFenceError extends Error {}

function fail(code: string, message: string): never {
  throw new PixProviderSettlementDeliveryError(code, message);
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} must be a valid UUID`);
}

function assertLeaseOwner(value: string): void {
  if (
    value !== value.trim() ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value) ||
    Buffer.byteLength(value, 'utf8') > 160
  ) {
    throw new Error('PIX settlement lease owner is invalid');
  }
}

function assertClaimInput(input: ClaimPixProviderEventDeliveryInput): void {
  assertUuid(input.accountId, 'PIX settlement account id');
  assertLeaseOwner(input.leaseOwner);
  if (!Number.isSafeInteger(input.leaseMs) || input.leaseMs <= 0 || input.leaseMs > MAX_LEASE_MS) {
    throw new Error('PIX settlement lease duration is invalid');
  }
}

function assertClaim(claim: PixProviderEventDeliveryClaim): void {
  assertUuid(claim.accountId, 'PIX settlement account id');
  assertUuid(claim.deliveryId, 'PIX settlement delivery id');
  assertUuid(claim.eventId, 'PIX settlement event id');
  assertUuid(claim.leaseToken, 'PIX settlement lease token');
  assertLeaseOwner(claim.leaseOwner);
  for (const [label, value] of [
    ['attempts', claim.attempts],
    ['maximum attempts', claim.maxAttempts],
    ['lease version', claim.leaseVersion]
  ] as const) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`PIX settlement ${label} is invalid`);
    }
  }
  if (!Number.isFinite(new Date(claim.leaseExpiresAt).getTime())) {
    throw new Error('PIX settlement lease expiry is invalid');
  }
}

function mapClaim(row: ClaimRow): PixProviderEventDeliveryClaim {
  const claim = Object.freeze({
    accountId: row.account_id,
    deliveryId: row.id,
    eventId: row.event_id,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    leaseOwner: row.lease_owner,
    leaseToken: row.lease_token,
    leaseVersion: Number(row.lease_version),
    leaseExpiresAt: row.lease_expires_at.toISOString()
  });
  assertClaim(claim);
  return claim;
}

function assertAttemptMatches(event: EventRow, attempt: AttemptRow): void {
  if (
    !['pending_dispatch', 'awaiting_confirmation', 'confirmed_pending_apply'].includes(
      attempt.state
    )
  ) {
    fail('PIX_SETTLEMENT_ATTEMPT_TERMINAL', 'PIX payment attempt is not eligible for settlement');
  }
  if (
    attempt.provider_key !== event.provider ||
    attempt.amount_cents !== event.amount_cents ||
    attempt.currency !== event.currency
  ) {
    fail(
      'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
      'PIX provider receipt claims diverge from the payment attempt'
    );
  }
  if (attempt.provider_transaction_id === null) {
    fail('PIX_NOT_CORRELATED', 'PIX provider receipt is not correlated');
  }
  if (attempt.provider_transaction_id !== event.provider_transaction_id) {
    fail(
      'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
      'PIX provider receipt claims diverge from the payment attempt'
    );
  }
}

function settlementInput(
  claim: PixProviderEventDeliveryClaim,
  event: EventRow,
  attempt: AttemptRow,
  pix: PixRow,
  actorUserId: string
): ApplyConfirmedPixSettlementInput {
  if (pix.provider_transaction_id === null) {
    fail('PIX_NOT_CORRELATED', 'PIX provider receipt is not correlated');
  }
  if (
    pix.provider !== event.provider ||
    pix.provider_transaction_id !== event.provider_transaction_id ||
    pix.payment_attempt_id !== event.payment_attempt_id ||
    pix.billing_record_id !== attempt.billing_record_id ||
    pix.amount_cents !== event.amount_cents ||
    pix.currency !== event.currency
  ) {
    fail(
      'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
      'PIX provider receipt claims diverge from the PIX transaction'
    );
  }
  return Object.freeze({
    accountId: claim.accountId,
    actorUserId,
    attemptId: event.payment_attempt_id,
    provider: event.provider as 'local-pix',
    providerEventId: event.provider_event_id,
    transactionId: pix.transaction_id,
    billingRecordId: attempt.billing_record_id,
    amountCents: Number(event.amount_cents),
    currency: event.currency as 'BRL',
    confirmedAt: event.confirmed_at.toISOString()
  });
}

export class DatabasePixProviderEventDeliveryRepository implements PixProviderEventDeliveryRepository {
  public constructor(private readonly pool: Pool) {}

  public async claimNext(
    input: ClaimPixProviderEventDeliveryInput
  ): Promise<PixProviderEventDeliveryClaim | null> {
    assertClaimInput(input);
    return runInTenantTransaction(this.pool, input.accountId, async (client) => {
      await client.query(
        `UPDATE pix_provider_event_deliveries
            SET state = 'reconciliation_required', next_attempt_at = NULL,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
                last_error_code = 'PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED',
                last_error_class = 'terminal', updated_at = clock_timestamp()
          WHERE account_id = $1 AND attempts >= max_attempts
            AND ((state = 'pending' AND next_attempt_at <= clock_timestamp())
              OR (state = 'processing' AND lease_expires_at <= clock_timestamp()))`,
        [input.accountId]
      );
      const result = await client.query<ClaimRow>(
        `WITH candidate AS (
           SELECT id
             FROM pix_provider_event_deliveries
            WHERE account_id = $1 AND attempts < max_attempts
              AND ((state = 'pending' AND next_attempt_at <= clock_timestamp())
                OR (state = 'processing' AND lease_expires_at <= clock_timestamp()))
            ORDER BY next_attempt_at ASC NULLS FIRST, created_at ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
         )
         UPDATE pix_provider_event_deliveries AS delivery
            SET state = 'processing', attempts = delivery.attempts + 1,
                next_attempt_at = NULL, lease_owner = $2,
                lease_token = gen_random_uuid(), lease_version = delivery.lease_version + 1,
                lease_expires_at = clock_timestamp() + ($3::bigint * interval '1 millisecond'),
                updated_at = clock_timestamp()
           FROM candidate
          WHERE delivery.account_id = $1 AND delivery.id = candidate.id
         RETURNING delivery.id, delivery.account_id, delivery.event_id, delivery.attempts,
                   delivery.max_attempts, delivery.lease_owner,
                   delivery.lease_token::text, delivery.lease_version::text,
                   delivery.lease_expires_at`,
        [input.accountId, input.leaseOwner, input.leaseMs]
      );
      return result.rows[0] ? mapClaim(result.rows[0]) : null;
    });
  }

  public async executeSettlement(
    claim: PixProviderEventDeliveryClaim,
    execute: ExecuteConfirmedPixSettlement
  ): Promise<PixProviderSettlementExecution> {
    assertClaim(claim);
    try {
      return await runInTenantTransaction(this.pool, claim.accountId, async (client) => {
        const event = await this.lockClaimedEvent(client, claim);
        if (!event) return 'lease_lost';
        const actorUserId = await this.resolveServicePrincipal(client, claim.accountId);
        const attempt = await this.findAttempt(client, claim.accountId, event.payment_attempt_id);
        if (!attempt) fail('PIX_NOT_CORRELATED', 'PIX provider receipt is not correlated');
        assertAttemptMatches(event, attempt);
        const pix = await this.findPix(client, claim.accountId, event.payment_attempt_id);
        if (!pix) fail('PIX_NOT_CORRELATED', 'PIX provider receipt is not correlated');
        const input = settlementInput(claim, event, attempt, pix, actorUserId);
        return runInTenantTransactionContext(
          this.pool,
          {
            accountId: claim.accountId,
            actorUserId,
            correlationId: event.correlation_id
          },
          async (transaction) => {
            await execute(input, transaction);
            const applied = await transaction.client.query(
              `UPDATE pix_provider_event_deliveries
              SET state = 'applied', applied_at = clock_timestamp(), next_attempt_at = NULL,
                  lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
                  last_error_code = NULL, last_error_class = NULL,
                  updated_at = clock_timestamp()
            WHERE account_id = $1 AND id = $2 AND event_id = $3
              AND state = 'processing' AND lease_owner = $4
              AND lease_token = $5::uuid AND lease_version = $6::bigint
              AND lease_expires_at > clock_timestamp()`,
              [
                claim.accountId,
                claim.deliveryId,
                claim.eventId,
                claim.leaseOwner,
                claim.leaseToken,
                claim.leaseVersion
              ]
            );
            if (applied.rowCount !== 1) throw new PixProviderSettlementFenceError();
            return 'applied' as const;
          }
        );
      });
    } catch (error) {
      if (error instanceof PixProviderSettlementFenceError) return 'lease_lost';
      throw error;
    }
  }

  public async completeFailure(
    claim: PixProviderEventDeliveryClaim,
    failure: PixProviderEventDeliveryFailure
  ): Promise<PixProviderEventDeliveryFailureStatus | null> {
    assertClaim(claim);
    if (!ERROR_CODE_PATTERN.test(failure.code))
      throw new Error('PIX settlement error code is invalid');
    if (
      !Number.isSafeInteger(failure.retryDelaySeconds) ||
      failure.retryDelaySeconds < 0 ||
      failure.retryDelaySeconds > 900
    ) {
      throw new Error('PIX settlement retry delay is invalid');
    }
    return runInTenantTransaction(this.pool, claim.accountId, async (client) => {
      const result = await client.query<{ readonly state: string }>(
        `UPDATE pix_provider_event_deliveries
            SET state = CASE
                  WHEN $7 = 'retryable' AND attempts < max_attempts THEN 'pending'
                  ELSE 'reconciliation_required'
                END,
                next_attempt_at = CASE
                  WHEN $7 = 'retryable' AND attempts < max_attempts
                    THEN clock_timestamp() + ($8::bigint * interval '1 second')
                  ELSE NULL
                END,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
                last_error_code = CASE
                  WHEN $7 = 'retryable' AND attempts >= max_attempts
                    THEN 'PIX_SETTLEMENT_ATTEMPTS_EXHAUSTED'
                  ELSE $9
                END,
                last_error_class = CASE
                  WHEN $7 = 'retryable' AND attempts < max_attempts THEN 'retryable'
                  ELSE 'terminal'
                END,
                updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2 AND event_id = $3
            AND state = 'processing' AND lease_owner = $4
            AND lease_token = $5::uuid AND lease_version = $6::bigint
            AND lease_expires_at > clock_timestamp()
         RETURNING state`,
        [
          claim.accountId,
          claim.deliveryId,
          claim.eventId,
          claim.leaseOwner,
          claim.leaseToken,
          claim.leaseVersion,
          failure.errorClass,
          failure.retryDelaySeconds,
          failure.code
        ]
      );
      const state = result.rows[0]?.state;
      if (state === 'pending') return 'retry_scheduled';
      if (state === 'reconciliation_required') return state;
      return null;
    });
  }

  public async redrive(input: RedrivePixProviderEventDeliveryInput): Promise<boolean> {
    assertUuid(input.accountId, 'PIX settlement account id');
    assertUuid(input.deliveryId, 'PIX settlement delivery id');
    assertUuid(input.eventId, 'PIX settlement event id');
    assertUuid(input.actorUserId, 'PIX settlement redrive actor id');
    if (!input.correlationId || input.correlationId.length > 255) {
      throw new Error('PIX settlement redrive correlation id is invalid');
    }
    if (!input.reason || input.reason.trim().length === 0 || input.reason.length > 500) {
      throw new Error('PIX settlement redrive reason is invalid');
    }

    return runInTenantTransactionContext(
      this.pool,
      {
        accountId: input.accountId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId
      },
      async (transaction) => {
        const redriven = await transaction.client.query(
          `UPDATE pix_provider_event_deliveries
              SET state = 'pending', attempts = 0, next_attempt_at = clock_timestamp(),
                  lease_owner = NULL, lease_token = NULL, lease_version = lease_version + 1,
                  lease_expires_at = NULL, last_error_code = NULL, last_error_class = NULL,
                  applied_at = NULL, updated_at = clock_timestamp()
            WHERE account_id = $1 AND id = $2 AND event_id = $3
              AND state = 'reconciliation_required'
           RETURNING id`,
          [input.accountId, input.deliveryId, input.eventId]
        );
        if (redriven.rowCount !== 1) return false;
        await transaction.audit.append({
          entityType: 'pix_provider_event_delivery',
          entityId: input.deliveryId,
          action: 'pix_settlement_redrive',
          metadata: {
            eventId: input.eventId,
            resetAttempts: true,
            redriveReason: input.reason
          },
          reason: input.reason
        });
        return true;
      }
    );
  }

  private async lockClaimedEvent(
    client: PoolClient,
    claim: PixProviderEventDeliveryClaim
  ): Promise<EventRow | null> {
    const result = await client.query<EventRow>(
      `SELECT event.id AS event_id, event.provider, event.provider_event_id,
              event.event_type, event.payment_attempt_id,
              event.provider_transaction_id, event.amount_cents::text,
              event.currency, event.confirmed_at, event.correlation_id
         FROM pix_provider_event_deliveries AS delivery
         JOIN pix_provider_events AS event
           ON event.account_id = delivery.account_id AND event.id = delivery.event_id
        WHERE delivery.account_id = $1 AND delivery.id = $2 AND delivery.event_id = $3
          AND delivery.state = 'processing' AND delivery.lease_owner = $4
          AND delivery.lease_token = $5::uuid AND delivery.lease_version = $6::bigint
          AND delivery.lease_expires_at > clock_timestamp()
        FOR UPDATE OF delivery`,
      [
        claim.accountId,
        claim.deliveryId,
        claim.eventId,
        claim.leaseOwner,
        claim.leaseToken,
        claim.leaseVersion
      ]
    );
    return result.rows[0] ?? null;
  }

  private async resolveServicePrincipal(client: PoolClient, accountId: string): Promise<string> {
    const result = await client.query<{
      readonly user_id: string;
      readonly is_active: boolean;
      readonly principal_kind: string;
      readonly interactive_login_enabled: boolean;
      readonly user_active: boolean;
    }>(
      `SELECT principal.user_id, principal.is_active, users.principal_kind,
              users.interactive_login_enabled, users.is_active AS user_active
        FROM account_service_principals AS principal
         JOIN users
           ON users.account_id = principal.account_id AND users.id = principal.user_id
        WHERE principal.account_id = $1 AND principal.purpose = 'pix-settlement'
        ORDER BY principal.is_active DESC, principal.created_at DESC`,
      [accountId]
    );
    const principal = result.rows[0];
    if (!principal) {
      fail(
        'PIX_SETTLEMENT_PRINCIPAL_NOT_FOUND',
        'PIX settlement service principal is not configured'
      );
    }
    if (
      principal.is_active !== true ||
      principal.user_active !== true ||
      principal.principal_kind !== 'service' ||
      principal.interactive_login_enabled !== false
    ) {
      fail('PIX_SETTLEMENT_PRINCIPAL_INVALID', 'PIX settlement service principal is invalid');
    }
    return principal.user_id;
  }

  private async findAttempt(
    client: PoolClient,
    accountId: string,
    attemptId: string
  ): Promise<AttemptRow | null> {
    const result = await client.query<AttemptRow>(
      `SELECT state, provider_key, provider_transaction_id, amount_cents::text,
              currency, billing_record_id
         FROM encounter_payment_attempts
        WHERE account_id = $1 AND id = $2`,
      [accountId, attemptId]
    );
    return result.rows[0] ?? null;
  }

  private async findPix(
    client: PoolClient,
    accountId: string,
    attemptId: string
  ): Promise<PixRow | null> {
    const result = await client.query<PixRow>(
      `SELECT transaction_id, provider, provider_transaction_id, payment_attempt_id,
              billing_record_id, (amount * 100)::bigint::text AS amount_cents, currency
         FROM pix_transactions
        WHERE account_id = $1 AND payment_attempt_id = $2`,
      [accountId, attemptId]
    );
    return result.rows[0] ?? null;
  }
}
