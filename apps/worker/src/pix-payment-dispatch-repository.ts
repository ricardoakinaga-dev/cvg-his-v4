import type { Pool } from 'pg';

import { runInTenantTransaction } from '@cvg-his-v2/shared-database';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const PROVIDER_IDEMPOTENCY_PREFIX = 'cvg:pix:create:v1:';
const ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,64}$/;
const MAX_AMOUNT_CENTS = 999_999_999_999;
const MAX_LEASE_MS = 60 * 60 * 1_000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1_000;
const MAX_QR_PAYLOAD_BYTES = 64 * 1_024;
const MAX_QR_BASE64_BYTES = 256 * 1_024;
const MAX_EXPIRY_DISTANCE_MS = 30 * 24 * 60 * 60 * 1_000;

export interface ClaimPixPaymentDispatchInput {
  readonly accountId: string;
  readonly leaseOwner: string;
  readonly leaseMs: number;
  readonly providerKey?: string;
}

export interface PixPaymentDispatchClaim {
  readonly accountId: string;
  readonly attemptId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly providerKey: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly providerIdempotencyKey: string;
  readonly createdAt: string;
  readonly dispatchAttempt: number;
  readonly maxDispatchAttempts: number;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
  readonly leaseExpiresAt: string;
}

export interface PixPaymentDispatchSuccess {
  readonly providerTransactionId: string;
  readonly qrCodePayload: string;
  readonly qrCodeBase64: string;
  readonly expiresAt: string;
}

export type PixPaymentDispatchFailureClass = 'ambiguous' | 'permanent' | 'transient';

export interface PixPaymentDispatchFailure {
  readonly code: string;
  readonly failureClass: PixPaymentDispatchFailureClass;
  readonly publicMessage: string;
  readonly retryDelayMs: number;
}

export type PixPaymentDispatchFailureStatus =
  | 'dispatch_failed'
  | 'reconciliation_required'
  | 'retry_scheduled';

interface ClaimRow {
  readonly account_id: string;
  readonly amount_cents: string;
  readonly billing_record_id: string;
  readonly created_at: Date;
  readonly currency: string;
  readonly dispatch_attempts: number;
  readonly encounter_id: string;
  readonly id: string;
  readonly lease_expires_at: Date;
  readonly lease_owner: string;
  readonly lease_token: string;
  readonly lease_version: string;
  readonly max_dispatch_attempts: number;
  readonly provider_idempotency_key: string;
  readonly provider_key: string;
}

interface AuthoritativeAttemptRow {
  readonly amount_cents: string;
  readonly billing_record_id: string;
  readonly currency: string;
  readonly provider_idempotency_key: string;
  readonly provider_key: string;
}

interface FailureStateRow {
  readonly state: 'dispatch_failed' | 'pending_dispatch' | 'reconciliation_required';
}

export interface PixPaymentDispatchRepository {
  claimNext(input: ClaimPixPaymentDispatchInput): Promise<PixPaymentDispatchClaim | null>;
  completeSuccess(
    claim: PixPaymentDispatchClaim,
    success: PixPaymentDispatchSuccess
  ): Promise<boolean>;
  completeFailure(
    claim: PixPaymentDispatchClaim,
    failure: PixPaymentDispatchFailure
  ): Promise<PixPaymentDispatchFailureStatus | null>;
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} must be a valid UUID`);
}

function assertBoundedString(value: string, label: string, maximumBytes: number): void {
  if (
    value.length === 0 ||
    value.includes('\0') ||
    Buffer.byteLength(value, 'utf8') > maximumBytes
  ) {
    throw new Error(`${label} must contain 1 to ${maximumBytes} UTF-8 bytes`);
  }
}

function assertPositiveInteger(value: number, label: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${label} must be a positive safe integer no greater than ${maximum}`);
  }
}

function assertClaimInput(input: ClaimPixPaymentDispatchInput): void {
  assertUuid(input.accountId, 'PIX dispatch account id');
  assertBoundedString(input.leaseOwner, 'PIX dispatch lease owner', 160);
  assertPositiveInteger(input.leaseMs, 'PIX dispatch lease duration', MAX_LEASE_MS);
  if (input.providerKey !== undefined && !PROVIDER_KEY_PATTERN.test(input.providerKey)) {
    throw new Error('PIX dispatch provider key is invalid');
  }
}

function assertClaim(claim: PixPaymentDispatchClaim): void {
  assertUuid(claim.accountId, 'PIX dispatch account id');
  assertUuid(claim.attemptId, 'PIX dispatch attempt id');
  assertUuid(claim.encounterId, 'PIX dispatch encounter id');
  assertUuid(claim.leaseToken, 'PIX dispatch lease token');
  assertBoundedString(claim.billingRecordId, 'PIX dispatch billing record id', 255);
  assertBoundedString(claim.leaseOwner, 'PIX dispatch lease owner', 160);
  assertPositiveInteger(claim.amountCents, 'PIX dispatch amount', MAX_AMOUNT_CENTS);
  assertPositiveInteger(claim.dispatchAttempt, 'PIX dispatch attempt number', 2_147_483_647);
  assertPositiveInteger(claim.maxDispatchAttempts, 'PIX dispatch maximum attempts', 2_147_483_647);
  assertPositiveInteger(claim.leaseVersion, 'PIX dispatch lease version', Number.MAX_SAFE_INTEGER);
  if (claim.currency !== 'BRL') throw new Error('PIX dispatch currency must be BRL');
  if (!PROVIDER_KEY_PATTERN.test(claim.providerKey)) {
    throw new Error('PIX dispatch provider key is invalid');
  }
  if (claim.providerIdempotencyKey !== `${PROVIDER_IDEMPOTENCY_PREFIX}${claim.attemptId}`) {
    throw new Error('PIX dispatch provider idempotency key is invalid');
  }
  assertIsoTimestamp(claim.leaseExpiresAt, 'PIX dispatch lease expiry');
  assertIsoTimestamp(claim.createdAt, 'PIX dispatch attempt creation');
}

function assertIsoTimestamp(value: string, label: string): Date {
  assertBoundedString(value, label, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`${label} must use canonical ISO-8601 UTC format`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} must be a valid timestamp`);
  return parsed;
}

export function normalizePixPaymentDispatchSuccess(value: unknown): PixPaymentDispatchSuccess {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('PIX provider result must be an object');
  }
  const success = value as Readonly<Record<string, unknown>>;
  if (
    typeof success['providerTransactionId'] !== 'string' ||
    typeof success['qrCodePayload'] !== 'string' ||
    typeof success['qrCodeBase64'] !== 'string' ||
    typeof success['expiresAt'] !== 'string'
  ) {
    throw new Error('PIX provider result fields are invalid');
  }
  assertBoundedString(success['providerTransactionId'], 'Provider transaction id', 255);
  assertBoundedString(success['qrCodePayload'], 'PIX QR payload', MAX_QR_PAYLOAD_BYTES);
  assertBoundedString(success['qrCodeBase64'], 'PIX QR image', MAX_QR_BASE64_BYTES);
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      success['qrCodeBase64']
    ) ||
    Buffer.from(success['qrCodeBase64'], 'base64').toString('base64') !== success['qrCodeBase64']
  ) {
    throw new Error('PIX QR image must be valid base64');
  }
  const expiresAt = assertIsoTimestamp(success['expiresAt'], 'PIX expiry');
  const distance = expiresAt.getTime() - Date.now();
  if (distance < 1_000 || distance > MAX_EXPIRY_DISTANCE_MS) {
    throw new Error('PIX expiry must be at least one second and no more than 30 days away');
  }
  return Object.freeze({
    providerTransactionId: success['providerTransactionId'],
    qrCodePayload: success['qrCodePayload'],
    qrCodeBase64: success['qrCodeBase64'],
    expiresAt: expiresAt.toISOString()
  });
}

function publicMessageForFailureClass(failureClass: PixPaymentDispatchFailureClass): string {
  if (failureClass === 'transient') return 'PIX provider is temporarily unavailable';
  if (failureClass === 'permanent') return 'PIX request was rejected before creation';
  return 'The PIX provider outcome requires reconciliation';
}

function normalizeFailure(failure: PixPaymentDispatchFailure): PixPaymentDispatchFailure {
  if (!ERROR_CODE_PATTERN.test(failure.code)) throw new Error('PIX error code is invalid');
  if (!['ambiguous', 'permanent', 'transient'].includes(failure.failureClass)) {
    throw new Error('PIX failure class is invalid');
  }
  if (!Number.isSafeInteger(failure.retryDelayMs) || failure.retryDelayMs < 0) {
    throw new Error('PIX retry delay must be a non-negative safe integer');
  }
  return Object.freeze({
    ...failure,
    publicMessage: publicMessageForFailureClass(failure.failureClass),
    retryDelayMs: Math.min(failure.retryDelayMs, MAX_RETRY_DELAY_MS)
  });
}

function mapClaim(row: ClaimRow): PixPaymentDispatchClaim {
  const amountCents = Number(row.amount_cents);
  const leaseVersion = Number(row.lease_version);
  const claim: PixPaymentDispatchClaim = Object.freeze({
    accountId: row.account_id,
    attemptId: row.id,
    encounterId: row.encounter_id,
    billingRecordId: row.billing_record_id,
    providerKey: row.provider_key,
    amountCents,
    currency: row.currency as 'BRL',
    providerIdempotencyKey: row.provider_idempotency_key,
    createdAt: row.created_at.toISOString(),
    dispatchAttempt: row.dispatch_attempts,
    maxDispatchAttempts: row.max_dispatch_attempts,
    leaseOwner: row.lease_owner,
    leaseToken: row.lease_token,
    leaseVersion,
    leaseExpiresAt: row.lease_expires_at.toISOString()
  });
  assertClaim(claim);
  return claim;
}

function claimMatchesRow(claim: PixPaymentDispatchClaim, row: AuthoritativeAttemptRow): boolean {
  return (
    claim.amountCents === Number(row.amount_cents) &&
    claim.billingRecordId === row.billing_record_id &&
    claim.currency === row.currency &&
    claim.providerIdempotencyKey === row.provider_idempotency_key &&
    claim.providerKey === row.provider_key
  );
}

function mapFailureStatus(row: FailureStateRow): PixPaymentDispatchFailureStatus {
  if (row.state === 'pending_dispatch') return 'retry_scheduled';
  return row.state;
}

export class DatabasePixPaymentDispatchRepository implements PixPaymentDispatchRepository {
  readonly #pool: Pool;

  public constructor(pool: Pool) {
    this.#pool = pool;
  }

  public async claimNext(
    input: ClaimPixPaymentDispatchInput
  ): Promise<PixPaymentDispatchClaim | null> {
    assertClaimInput(input);
    return runInTenantTransaction(this.#pool, input.accountId, async (client) => {
      await this.#escalateExpiredExhaustedAttempts(client, input.accountId);
      const result = await client.query<ClaimRow>(
        `WITH candidate AS (
           SELECT attempt.id
             FROM encounter_payment_attempts AS attempt
             JOIN billing_records AS billing
               ON billing.account_id = attempt.account_id
              AND billing.id = attempt.billing_record_id
              AND billing.encounter_id = attempt.encounter_id
             JOIN encounters AS encounter
               ON encounter.account_id = attempt.account_id
              AND encounter.id = attempt.encounter_id
            WHERE attempt.account_id = $1
              AND attempt.state = 'pending_dispatch'
              AND attempt.dispatch_attempts < attempt.max_dispatch_attempts
              AND billing.active_payment_attempt_id = attempt.id
              AND billing.status = 'open'
              AND encounter.status = 'closed'
              AND billing.currency = attempt.currency
              AND (billing.subtotal_amount * 100)::bigint = attempt.amount_cents
              AND EXISTS (
                SELECT 1
                  FROM billing_items AS item
                 WHERE item.account_id = billing.account_id
                   AND item.billing_record_id = billing.id
                   AND item.encounter_id = billing.encounter_id
              )
              AND ($4::text IS NULL OR attempt.provider_key = $4)
              AND (attempt.next_attempt_at IS NULL OR attempt.next_attempt_at <= clock_timestamp())
              AND (attempt.lease_token IS NULL OR attempt.lease_expires_at <= clock_timestamp())
            ORDER BY attempt.next_attempt_at ASC NULLS FIRST,
                     attempt.created_at ASC, attempt.id ASC
            FOR UPDATE OF attempt SKIP LOCKED
            LIMIT 1
         )
         UPDATE encounter_payment_attempts AS attempt
            SET dispatch_attempts = attempt.dispatch_attempts + 1,
                lease_owner = $2,
                lease_token = gen_random_uuid(),
                lease_version = attempt.lease_version + 1,
                lease_expires_at = clock_timestamp() + ($3::bigint * interval '1 millisecond'),
                version = attempt.version + 1,
                updated_at = clock_timestamp()
           FROM candidate
          WHERE attempt.account_id = $1
            AND attempt.id = candidate.id
         RETURNING attempt.id, attempt.account_id, attempt.encounter_id,
                   attempt.billing_record_id, attempt.provider_key,
                   attempt.amount_cents::text, attempt.currency,
                   attempt.provider_idempotency_key, attempt.dispatch_attempts,
                   attempt.max_dispatch_attempts, attempt.lease_owner,
                   attempt.lease_token::text, attempt.lease_version::text,
                   attempt.lease_expires_at, attempt.created_at`,
        [input.accountId, input.leaseOwner, input.leaseMs, input.providerKey ?? null]
      );
      return result.rows[0] ? mapClaim(result.rows[0]) : null;
    });
  }

  public async completeSuccess(
    claim: PixPaymentDispatchClaim,
    success: PixPaymentDispatchSuccess
  ): Promise<boolean> {
    assertClaim(claim);
    const safeSuccess = normalizePixPaymentDispatchSuccess(success);
    const expiresAt = new Date(safeSuccess.expiresAt);
    return runInTenantTransaction(this.#pool, claim.accountId, async (client) => {
      const attempt = await this.#lockActiveAttempt(client, claim);
      if (!attempt || !claimMatchesRow(claim, attempt)) return false;

      const updated = await client.query(
        `UPDATE encounter_payment_attempts
            SET state = 'awaiting_confirmation',
                provider_transaction_id = $6,
                qr_code_payload = $7,
                qr_code_base64 = $8,
                expires_at = $9,
                last_error_code = NULL,
                last_error_class = NULL,
                last_error_public_message = NULL,
                next_attempt_at = NULL,
                lease_owner = NULL,
                lease_token = NULL,
                lease_expires_at = NULL,
                version = version + 1,
                updated_at = clock_timestamp()
          WHERE account_id = $1
            AND id = $2
            AND state = 'pending_dispatch'
            AND lease_owner = $3
            AND lease_token = $4::uuid
            AND lease_version = $5::bigint
            AND lease_expires_at > clock_timestamp()
            AND $9::timestamptz > clock_timestamp()`,
        [
          claim.accountId,
          claim.attemptId,
          claim.leaseOwner,
          claim.leaseToken,
          claim.leaseVersion,
          safeSuccess.providerTransactionId,
          safeSuccess.qrCodePayload,
          safeSuccess.qrCodeBase64,
          expiresAt
        ]
      );
      if (updated.rowCount !== 1) return false;

      await client.query(
        `INSERT INTO pix_transactions (
           transaction_id, provider, account_id, billing_record_id,
           payment_attempt_id, amount, currency, description,
           qr_code_payload, qr_code_base64, expires_at, status,
           provider_transaction_id, billing_settlement_status,
           cash_reconciliation_status, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, 'pending', $12, 'awaiting_payment',
           'pending', clock_timestamp(), clock_timestamp()
         )`,
        [
          claim.attemptId,
          attempt.provider_key,
          claim.accountId,
          attempt.billing_record_id,
          claim.attemptId,
          (Number(attempt.amount_cents) / 100).toFixed(2),
          attempt.currency,
          `PIX payment attempt ${claim.attemptId}`,
          safeSuccess.qrCodePayload,
          safeSuccess.qrCodeBase64,
          expiresAt,
          safeSuccess.providerTransactionId
        ]
      );
      return true;
    });
  }

  public async completeFailure(
    claim: PixPaymentDispatchClaim,
    failure: PixPaymentDispatchFailure
  ): Promise<PixPaymentDispatchFailureStatus | null> {
    assertClaim(claim);
    const safeFailure = normalizeFailure(failure);
    return runInTenantTransaction(this.#pool, claim.accountId, async (client) => {
      if (!(await this.#lockReservedBilling(client, claim))) return null;
      const result = await client.query<FailureStateRow>(
        `UPDATE encounter_payment_attempts
            SET state = CASE
                  WHEN $6 = 'transient' AND dispatch_attempts < max_dispatch_attempts
                    THEN 'pending_dispatch'
                  WHEN $6 = 'permanent' THEN 'dispatch_failed'
                  ELSE 'reconciliation_required'
                END,
                last_error_code = CASE
                  WHEN $6 = 'transient' AND dispatch_attempts >= max_dispatch_attempts
                    THEN 'PIX_DISPATCH_ATTEMPTS_EXHAUSTED'
                  ELSE $7
                END,
                last_error_class = CASE
                  WHEN $6 = 'transient' AND dispatch_attempts >= max_dispatch_attempts
                    THEN 'ambiguous'
                  ELSE $6
                END,
                last_error_public_message = CASE
                  WHEN $6 = 'transient' AND dispatch_attempts >= max_dispatch_attempts
                    THEN 'The PIX provider outcome requires reconciliation'
                  ELSE $8
                END,
                next_attempt_at = CASE
                  WHEN $6 = 'transient' AND dispatch_attempts < max_dispatch_attempts
                    THEN clock_timestamp() + ($9::bigint * interval '1 millisecond')
                  ELSE NULL
                END,
                lease_owner = NULL,
                lease_token = NULL,
                lease_expires_at = NULL,
                version = version + 1,
                updated_at = clock_timestamp()
          WHERE account_id = $1
            AND id = $2
            AND state = 'pending_dispatch'
            AND lease_owner = $3
            AND lease_token = $4::uuid
            AND lease_version = $5::bigint
            AND lease_expires_at > clock_timestamp()
         RETURNING state`,
        [
          claim.accountId,
          claim.attemptId,
          claim.leaseOwner,
          claim.leaseToken,
          claim.leaseVersion,
          safeFailure.failureClass,
          safeFailure.code,
          safeFailure.publicMessage,
          safeFailure.retryDelayMs
        ]
      );
      return result.rows[0] ? mapFailureStatus(result.rows[0]) : null;
    });
  }

  async #lockActiveAttempt(
    client: import('pg').PoolClient,
    claim: PixPaymentDispatchClaim
  ): Promise<AuthoritativeAttemptRow | null> {
    const result = await client.query<AuthoritativeAttemptRow>(
      `SELECT amount_cents::text, billing_record_id, currency,
              provider_idempotency_key, provider_key
         FROM encounter_payment_attempts
        WHERE account_id = $1
          AND id = $2
          AND state = 'pending_dispatch'
          AND lease_owner = $3
          AND lease_token = $4::uuid
          AND lease_version = $5::bigint
          AND lease_expires_at > clock_timestamp()
        FOR UPDATE`,
      [claim.accountId, claim.attemptId, claim.leaseOwner, claim.leaseToken, claim.leaseVersion]
    );
    return result.rows[0] ?? null;
  }

  async #lockReservedBilling(
    client: import('pg').PoolClient,
    claim: PixPaymentDispatchClaim
  ): Promise<boolean> {
    const result = await client.query(
      `SELECT 1
         FROM billing_records
        WHERE account_id = $1
          AND id = $2
          AND active_payment_attempt_id = $3::uuid
        FOR UPDATE`,
      [claim.accountId, claim.billingRecordId, claim.attemptId]
    );
    return result.rowCount === 1;
  }

  async #escalateExpiredExhaustedAttempts(
    client: import('pg').PoolClient,
    accountId: string
  ): Promise<void> {
    await client.query(
      `WITH exhausted AS (
         SELECT id
           FROM encounter_payment_attempts
          WHERE account_id = $1
            AND state = 'pending_dispatch'
            AND dispatch_attempts >= max_dispatch_attempts
            AND (lease_token IS NULL OR lease_expires_at <= clock_timestamp())
          FOR UPDATE SKIP LOCKED
       )
       UPDATE encounter_payment_attempts AS attempt
          SET state = 'reconciliation_required',
              last_error_code = 'PIX_DISPATCH_ATTEMPTS_EXHAUSTED',
              last_error_class = 'ambiguous',
              last_error_public_message =
                'The PIX provider outcome requires reconciliation',
              next_attempt_at = NULL,
              lease_owner = NULL,
              lease_token = NULL,
              lease_expires_at = NULL,
              version = attempt.version + 1,
              updated_at = clock_timestamp()
         FROM exhausted
        WHERE attempt.account_id = $1
          AND attempt.id = exhausted.id`,
      [accountId]
    );
  }
}
