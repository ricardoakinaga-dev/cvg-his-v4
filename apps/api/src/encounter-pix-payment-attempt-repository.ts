import { createHash, randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import {
  getPool,
  getTenantTransactionContext,
  IdempotencyConflictError,
  type TenantTransactionContext
} from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

export type EncounterPixPaymentProviderKey = 'local-pix' | 'mock';
export type EncounterPixPaymentAttemptState =
  | 'pending_dispatch'
  | 'awaiting_confirmation'
  | 'confirmed_pending_apply'
  | 'settled'
  | 'expired'
  | 'cancelled'
  | 'dispatch_failed'
  | 'reconciliation_required';

export interface RequestEncounterPixPaymentInput {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly encounterId: string;
  readonly providerKey: EncounterPixPaymentProviderKey;
  readonly requestKey: string;
}

export interface EncounterPixPaymentAttemptRecord {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly requestedByUserId: string;
  readonly paymentMethod: 'pix';
  readonly providerKey: EncounterPixPaymentProviderKey;
  readonly state: EncounterPixPaymentAttemptState;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly providerIdempotencyKey: string;
  readonly providerTransactionId: string | null;
  readonly qrCodePayload: string | null;
  readonly qrCodeBase64: string | null;
  readonly expiresAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorPublicMessage: string | null;
  readonly dispatchAttempts: number;
  readonly maxDispatchAttempts: number;
  readonly nextAttemptAt: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterPixPaymentAttemptRepository {
  create(
    transaction: TenantTransactionContext,
    input: RequestEncounterPixPaymentInput
  ): Promise<EncounterPixPaymentAttemptRecord>;
  findById(accountId: string, attemptId: string): Promise<EncounterPixPaymentAttemptRecord | null>;
  findActiveByEncounter(
    accountId: string,
    encounterId: string
  ): Promise<EncounterPixPaymentAttemptRecord | null>;
}

export async function assertEncounterHasNoActivePixAttempt(
  repository: EncounterPixPaymentAttemptRepository,
  accountId: string,
  encounterId: string
): Promise<void> {
  const transaction = getTenantTransactionContext();
  let attemptId: string | undefined;
  if (transaction) {
    if (transaction.accountId !== accountId) {
      throw new AppError(
        'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH',
        'PIX payment attempt context does not match the active transaction',
        403
      );
    }
    await transaction.client.query(
      `SELECT id
         FROM billing_records
        WHERE account_id = $1 AND encounter_id = $2
        FOR UPDATE`,
      [accountId, encounterId]
    );
    const result = await transaction.client.query<{ readonly id: string }>(
      `SELECT id
         FROM encounter_payment_attempts
        WHERE account_id = $1
          AND encounter_id = $2
          AND state IN (
            'pending_dispatch', 'awaiting_confirmation',
            'confirmed_pending_apply', 'reconciliation_required'
          )
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [accountId, encounterId]
    );
    attemptId = result.rows[0]?.id;
  } else {
    attemptId = (await repository.findActiveByEncounter(accountId, encounterId))?.id;
  }
  if (attemptId) {
    throw new AppError(
      'ENCOUNTER_PAYMENT_RESERVED',
      'Encounter cannot be reopened while a PIX payment attempt is active',
      409
    );
  }
}

export type EncounterPixPaymentAttemptCheckpoint =
  | 'after_attempt_insert'
  | 'after_audit_append'
  | 'after_outbox_append';

export interface DatabaseEncounterPixPaymentAttemptRepositoryOptions {
  readonly pool?: Pool;
  readonly onCheckpoint?: (
    checkpoint: EncounterPixPaymentAttemptCheckpoint
  ) => void | Promise<void>;
}

interface BillingRow {
  readonly id: string;
  readonly status: string;
  readonly currency: string;
  readonly amount_cents: string;
  readonly has_items: boolean;
}

interface AttemptRow {
  readonly id: string;
  readonly account_id: string;
  readonly encounter_id: string;
  readonly billing_record_id: string;
  readonly requested_by_user_id: string;
  readonly payment_method: string;
  readonly provider_key: string;
  readonly state: string;
  readonly amount_cents: string;
  readonly currency: string;
  readonly request_key_hash: string;
  readonly provider_idempotency_key: string;
  readonly provider_transaction_id: string | null;
  readonly qr_code_payload: string | null;
  readonly qr_code_base64: string | null;
  readonly expires_at: string | Date | null;
  readonly last_error_code: string | null;
  readonly last_error_public_message: string | null;
  readonly dispatch_attempts: number;
  readonly max_dispatch_attempts: number;
  readonly next_attempt_at: string | Date | null;
  readonly version: string;
  readonly created_at: string | Date;
  readonly updated_at: string | Date;
}

const ATTEMPT_COLUMNS = `
  id, account_id, encounter_id, billing_record_id, requested_by_user_id,
  payment_method, provider_key, state, amount_cents, currency, request_key_hash,
  provider_idempotency_key, provider_transaction_id, qr_code_payload,
  qr_code_base64, expires_at, last_error_code, last_error_public_message,
  dispatch_attempts, max_dispatch_attempts, next_attempt_at, version,
  created_at, updated_at`;

function fail(code: string, message: string, statusCode: number): never {
  throw new AppError(code, message, statusCode);
}

function asIso(value: string | Date): string {
  return new Date(value).toISOString();
}

function asNullableIso(value: string | Date | null): string | null {
  return value === null ? null : asIso(value);
}

function requestKeyHash(requestKey: string): string {
  return createHash('sha256').update(requestKey, 'utf8').digest('hex');
}

function mapAttempt(row: AttemptRow): EncounterPixPaymentAttemptRecord {
  return Object.freeze({
    id: row.id,
    accountId: row.account_id,
    encounterId: row.encounter_id,
    billingRecordId: row.billing_record_id,
    requestedByUserId: row.requested_by_user_id,
    paymentMethod: 'pix',
    providerKey: row.provider_key as EncounterPixPaymentProviderKey,
    state: row.state as EncounterPixPaymentAttemptState,
    amountCents: Number(row.amount_cents),
    currency: 'BRL',
    providerIdempotencyKey: row.provider_idempotency_key,
    providerTransactionId: row.provider_transaction_id,
    qrCodePayload: row.qr_code_payload,
    qrCodeBase64: row.qr_code_base64,
    expiresAt: asNullableIso(row.expires_at),
    lastErrorCode: row.last_error_code,
    lastErrorPublicMessage: row.last_error_public_message,
    dispatchAttempts: row.dispatch_attempts,
    maxDispatchAttempts: row.max_dispatch_attempts,
    nextAttemptAt: asNullableIso(row.next_attempt_at),
    version: Number(row.version),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at)
  });
}

function isCanonicalReplay(
  row: AttemptRow,
  input: RequestEncounterPixPaymentInput,
  hash: string
): boolean {
  return (
    row.account_id === input.accountId &&
    row.encounter_id === input.encounterId &&
    row.requested_by_user_id === input.actorUserId &&
    row.payment_method === 'pix' &&
    row.provider_key === input.providerKey &&
    row.request_key_hash === hash
  );
}

export class DatabaseEncounterPixPaymentAttemptRepository implements EncounterPixPaymentAttemptRepository {
  public constructor(
    private readonly options: DatabaseEncounterPixPaymentAttemptRepositoryOptions = {}
  ) {}

  public async create(
    transaction: TenantTransactionContext,
    input: RequestEncounterPixPaymentInput
  ): Promise<EncounterPixPaymentAttemptRecord> {
    this.#assertContext(transaction, input);
    const hash = requestKeyHash(input.requestKey);
    const requestReplay = await this.#findByRequestHash(transaction, input.accountId, hash);
    if (requestReplay) return this.#resolveRequestReplay(requestReplay, input, hash);

    const billing = await this.#lockBilling(transaction, input);
    await this.#assertEncounterClosed(transaction, input);
    const existing = await this.#findByBilling(transaction, input.accountId, billing.id);
    if (existing) {
      if (existing.request_key_hash === hash) {
        return this.#resolveRequestReplay(existing, input, hash);
      }
      fail(
        'PIX_PAYMENT_ATTEMPT_ALREADY_EXISTS',
        'A PIX payment attempt already exists for this billing record',
        409
      );
    }

    const attemptId = randomUUID();
    const providerIdempotencyKey = `cvg:pix:create:v1:${attemptId}`;
    const inserted = await transaction.client.query<AttemptRow>(
      `INSERT INTO encounter_payment_attempts (
         id, account_id, encounter_id, billing_record_id, requested_by_user_id,
         payment_method, provider_key, state, amount_cents, currency,
         request_key_hash, provider_idempotency_key
       ) VALUES (
         $1, $2, $3, $4, $5, 'pix', $6, 'pending_dispatch', $7, 'BRL', $8, $9
       )
       ON CONFLICT DO NOTHING
       RETURNING ${ATTEMPT_COLUMNS}`,
      [
        attemptId,
        input.accountId,
        input.encounterId,
        billing.id,
        input.actorUserId,
        input.providerKey,
        billing.amount_cents,
        hash,
        providerIdempotencyKey
      ]
    );
    const created = inserted.rows[0];
    if (!created) {
      const concurrentRequest = await this.#findByRequestHash(transaction, input.accountId, hash);
      if (concurrentRequest) {
        return this.#resolveRequestReplay(concurrentRequest, input, hash);
      }
      const concurrentBilling = await this.#findByBilling(transaction, input.accountId, billing.id);
      if (concurrentBilling) {
        fail(
          'PIX_PAYMENT_ATTEMPT_ALREADY_EXISTS',
          'A PIX payment attempt already exists for this billing record',
          409
        );
      }
      fail(
        'PIX_PAYMENT_ATTEMPT_PERSISTENCE_CONFLICT',
        'PIX payment attempt could not be acquired',
        409
      );
    }

    await this.#checkpoint('after_attempt_insert');
    await transaction.audit.append({
      entityType: 'encounter_payment_attempt',
      entityId: created.id,
      action: 'pix_dispatch_requested',
      metadata: {
        encounterId: created.encounter_id,
        billingRecordId: created.billing_record_id,
        providerKey: created.provider_key,
        state: created.state,
        amountCents: Number(created.amount_cents),
        currency: created.currency
      }
    });
    await this.#checkpoint('after_audit_append');
    await transaction.outbox.append({
      moduleName: 'payments',
      eventType: 'payment.pix.dispatch.requested.v1',
      payload: {
        attemptId: created.id,
        encounterId: created.encounter_id,
        billingRecordId: created.billing_record_id,
        providerKey: created.provider_key,
        amountCents: Number(created.amount_cents),
        currency: created.currency
      }
    });
    await this.#checkpoint('after_outbox_append');

    return mapAttempt(created);
  }

  public async findById(
    accountId: string,
    attemptId: string
  ): Promise<EncounterPixPaymentAttemptRecord | null> {
    return withTenantQueryExplicit(this.options.pool ?? getPool(), accountId, async (client) => {
      const result = await client.query<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS}
           FROM encounter_payment_attempts
          WHERE account_id = $1 AND id = $2
          LIMIT 1`,
        [accountId, attemptId]
      );
      const attempt = result.rows[0];
      return attempt ? mapAttempt(attempt) : null;
    });
  }

  public async findActiveByEncounter(
    accountId: string,
    encounterId: string
  ): Promise<EncounterPixPaymentAttemptRecord | null> {
    return withTenantQueryExplicit(this.options.pool ?? getPool(), accountId, async (client) => {
      const result = await client.query<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS}
           FROM encounter_payment_attempts
          WHERE account_id = $1
            AND encounter_id = $2
            AND state IN (
              'pending_dispatch',
              'awaiting_confirmation',
              'confirmed_pending_apply',
              'reconciliation_required'
            )
          ORDER BY created_at DESC, id DESC
          LIMIT 1`,
        [accountId, encounterId]
      );
      const attempt = result.rows[0];
      return attempt ? mapAttempt(attempt) : null;
    });
  }

  #assertContext(
    transaction: TenantTransactionContext,
    input: RequestEncounterPixPaymentInput
  ): void {
    if (
      transaction.accountId !== input.accountId ||
      transaction.actorUserId !== input.actorUserId
    ) {
      fail(
        'PIX_PAYMENT_ATTEMPT_CONTEXT_MISMATCH',
        'PIX payment request does not match the active transaction',
        403
      );
    }
  }

  async #lockBilling(
    transaction: TenantTransactionContext,
    input: RequestEncounterPixPaymentInput
  ): Promise<BillingRow> {
    const result = await transaction.client.query<BillingRow>(
      `SELECT billing.id, billing.status, billing.currency,
              (billing.subtotal_amount * 100)::bigint::text AS amount_cents,
              EXISTS (
                SELECT 1
                  FROM billing_items AS item
                 WHERE item.account_id = billing.account_id
                   AND item.billing_record_id = billing.id
                   AND item.encounter_id = billing.encounter_id
              ) AS has_items
         FROM billing_records AS billing
        WHERE billing.account_id = $1 AND billing.encounter_id = $2
        FOR UPDATE`,
      [input.accountId, input.encounterId]
    );
    const billing = result.rows[0];
    if (!billing) fail('BILLING_RECORD_NOT_FOUND', 'Billing record not found', 404);
    if (
      billing.status !== 'open' ||
      billing.currency !== 'BRL' ||
      !Number.isSafeInteger(Number(billing.amount_cents)) ||
      Number(billing.amount_cents) <= 0
    ) {
      fail('BILLING_NOT_RECEIVABLE', 'Billing must be open with a positive BRL balance', 409);
    }
    if (!billing.has_items) {
      fail(
        'BILLING_ITEMS_REQUIRED',
        'Billing must contain at least one item before requesting PIX',
        409
      );
    }
    return billing;
  }

  async #assertEncounterClosed(
    transaction: TenantTransactionContext,
    input: RequestEncounterPixPaymentInput
  ): Promise<void> {
    const result = await transaction.client.query<{ readonly status: string }>(
      `SELECT status
         FROM encounters
        WHERE account_id = $1 AND id = $2
        FOR SHARE`,
      [input.accountId, input.encounterId]
    );
    if (result.rows[0]?.status !== 'closed') {
      fail('ENCOUNTER_NOT_CLOSED', 'Encounter must be closed before requesting PIX', 409);
    }
  }

  async #findByRequestHash(
    transaction: TenantTransactionContext,
    accountId: string,
    hash: string
  ): Promise<AttemptRow | undefined> {
    const result = await transaction.client.query<AttemptRow>(
      `SELECT ${ATTEMPT_COLUMNS}
         FROM encounter_payment_attempts
        WHERE account_id = $1
          AND request_key_hash = $2
        LIMIT 1
        FOR UPDATE`,
      [accountId, hash]
    );
    return result.rows[0];
  }

  async #findByBilling(
    transaction: TenantTransactionContext,
    accountId: string,
    billingRecordId: string
  ): Promise<AttemptRow | undefined> {
    const result = await transaction.client.query<AttemptRow>(
      `SELECT ${ATTEMPT_COLUMNS}
         FROM encounter_payment_attempts
        WHERE account_id = $1
          AND billing_record_id = $2
        LIMIT 1
        FOR UPDATE`,
      [accountId, billingRecordId]
    );
    return result.rows[0];
  }

  #resolveRequestReplay(
    existing: AttemptRow,
    input: RequestEncounterPixPaymentInput,
    hash: string
  ): EncounterPixPaymentAttemptRecord {
    if (isCanonicalReplay(existing, input, hash)) return mapAttempt(existing);
    throw new IdempotencyConflictError();
  }

  async #checkpoint(checkpoint: EncounterPixPaymentAttemptCheckpoint): Promise<void> {
    await this.options.onCheckpoint?.(checkpoint);
  }
}
