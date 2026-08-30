import { randomUUID } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import type { PixProviderWebhookClaims } from './pix-provider-webhook-payload.js';
import {
  PixProviderWebhookPayloadValidationError,
  parsePixProviderWebhookPayload
} from './pix-provider-webhook-payload.js';
import {
  canonicalizePixProviderWebhookClaims,
  fingerprintPixProviderWebhookBody,
  fingerprintPixProviderWebhookClaims
} from './pix-provider-event-fingerprints.js';

export interface PixProviderEventIngressInput {
  readonly rawBody: Buffer;
  readonly claims: PixProviderWebhookClaims;
  readonly providerEventId: string;
  readonly correlationId: string;
  readonly receivedAt?: string;
}

export interface PixProviderEventIngressResult {
  readonly status: 'created' | 'replayed';
  readonly eventId: string;
  readonly deliveryId: string;
}

export interface PixProviderEventIngressRepository {
  persist(input: PixProviderEventIngressInput): Promise<PixProviderEventIngressResult>;
}

export type PixProviderEventIngressCheckpoint = 'after_receipt_insert' | 'after_delivery_insert';

export interface PixProviderEventIngressRepositoryOptions {
  readonly onCheckpoint?: (checkpoint: PixProviderEventIngressCheckpoint) => void | Promise<void>;
  readonly nowSeconds?: () => number;
}

interface ReceiptRow {
  readonly id: string;
  readonly body_fingerprint: string;
  readonly claims_fingerprint: string;
  readonly received_at: string | Date;
}

interface DeliveryRow {
  readonly id: string;
}

interface NormalizedPixProviderEventIngress {
  readonly accountId: string;
  readonly provider: 'local-pix';
  readonly providerEventId: string;
  readonly eventType: 'pix.payment.confirmed.v1';
  readonly paymentAttemptId: string;
  readonly providerTransactionId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly confirmedAt: string;
  readonly bodyFingerprint: string;
  readonly claimsFingerprint: string;
  readonly correlationId: string;
  readonly receivedAt: string;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function isAttemptConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === '23503' || error.code === '23514')
  );
}

function conflict(): never {
  throw new AppError(
    'PIX_PROVIDER_EVENT_CONFLICT',
    'Authenticated PIX provider event conflicts with an existing receipt',
    409
  );
}

export class DatabasePixProviderEventIngressRepository implements PixProviderEventIngressRepository {
  readonly #pool: Pool;
  readonly #onCheckpoint?: PixProviderEventIngressRepositoryOptions['onCheckpoint'];
  readonly #nowSeconds: () => number;

  constructor(pool: Pool = getPool(), options: PixProviderEventIngressRepositoryOptions = {}) {
    this.#pool = pool;
    this.#onCheckpoint = options.onCheckpoint;
    this.#nowSeconds = options.nowSeconds ?? (() => Math.floor(Date.now() / 1_000));
  }

  async persist(input: PixProviderEventIngressInput): Promise<PixProviderEventIngressResult> {
    if (!Buffer.isBuffer(input.rawBody)) {
      throw new AppError('PIX_PROVIDER_EVENT_INVALID_INPUT', 'Invalid PIX provider event', 400);
    }
    const rawBody = Buffer.from(input.rawBody);
    const claims = input.claims;
    let parsedClaims: PixProviderWebhookClaims;
    try {
      parsedClaims = parsePixProviderWebhookPayload(rawBody, claims.accountId, {
        nowSeconds: this.#nowSeconds
      });
    } catch (error) {
      if (error instanceof PixProviderWebhookPayloadValidationError) {
        throw new AppError('PIX_PROVIDER_EVENT_INVALID_INPUT', 'Invalid PIX provider event', 400);
      }
      throw error;
    }
    if (
      canonicalizePixProviderWebhookClaims(parsedClaims) !==
      canonicalizePixProviderWebhookClaims(claims)
    ) {
      throw new AppError('PIX_PROVIDER_EVENT_INVALID_INPUT', 'Invalid PIX provider event', 400);
    }
    const accountId = claims.accountId;
    const provider = 'local-pix' as const;
    const eventType = 'pix.payment.confirmed.v1' as const;
    const bodyFingerprint = fingerprintPixProviderWebhookBody(rawBody);
    const claimsFingerprint = fingerprintPixProviderWebhookClaims(claims);
    const receivedAt = input.receivedAt ?? new Date().toISOString();

    try {
      return await withTenantQueryExplicit(this.#pool, accountId, async (client) => {
        const normalizedInput = {
          accountId,
          provider,
          providerEventId: input.providerEventId,
          eventType,
          paymentAttemptId: claims.attemptId,
          providerTransactionId: claims.providerTransactionId,
          amountCents: claims.amountCents,
          currency: claims.currency,
          confirmedAt: claims.confirmedAt,
          bodyFingerprint,
          claimsFingerprint,
          correlationId: input.correlationId,
          receivedAt
        };
        const existing = await this.#findReceipt(client, normalizedInput);
        if (existing) {
          return this.#replayExisting(client, existing, normalizedInput);
        }

        const receiptId = randomUUID();
        try {
          await client.query('SAVEPOINT pix_provider_event_insert');
          await client.query(
            `INSERT INTO pix_provider_events (
               id, account_id, provider, provider_event_id, event_type,
               payment_attempt_id, provider_transaction_id, amount_cents, currency,
               confirmed_at, body_fingerprint, claims_fingerprint, correlation_id, received_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              receiptId,
              normalizedInput.accountId,
              normalizedInput.provider,
              normalizedInput.providerEventId,
              normalizedInput.eventType,
              normalizedInput.paymentAttemptId,
              normalizedInput.providerTransactionId,
              normalizedInput.amountCents,
              normalizedInput.currency,
              normalizedInput.confirmedAt,
              normalizedInput.bodyFingerprint,
              normalizedInput.claimsFingerprint,
              normalizedInput.correlationId,
              normalizedInput.receivedAt
            ]
          );
          await client.query('RELEASE SAVEPOINT pix_provider_event_insert');
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          await client.query('ROLLBACK TO SAVEPOINT pix_provider_event_insert');
          await client.query('RELEASE SAVEPOINT pix_provider_event_insert');
          const raced = await this.#findReceipt(client, normalizedInput);
          if (!raced) throw error;
          return this.#replayExisting(client, raced, normalizedInput);
        }

        await this.#onCheckpoint?.('after_receipt_insert');
        const deliveryId = await this.#createDelivery(
          client,
          normalizedInput.accountId,
          receiptId,
          normalizedInput.receivedAt
        );
        await this.#onCheckpoint?.('after_delivery_insert');

        return { status: 'created', eventId: receiptId, deliveryId };
      });
    } catch (error) {
      if (isAttemptConflict(error)) {
        throw new AppError(
          'PIX_PROVIDER_ATTEMPT_CONFLICT',
          'PIX provider event target is unavailable',
          409
        );
      }
      throw error;
    }
  }

  async #findReceipt(
    client: PoolClient,
    input: NormalizedPixProviderEventIngress
  ): Promise<ReceiptRow | null> {
    // Receipts and deliveries are append-only. The unique constraints plus
    // savepoints serialize duplicate webhook races without requiring a row
    // lock, which would also require UPDATE privilege on the API role.
    const result = await client.query<ReceiptRow>(
      `SELECT id, body_fingerprint, claims_fingerprint, received_at
         FROM pix_provider_events
        WHERE account_id = $1
          AND provider = $2
          AND provider_event_id = $3`,
      [input.accountId, input.provider, input.providerEventId]
    );
    return result.rows[0] ?? null;
  }

  async #replayExisting(
    client: PoolClient,
    receipt: ReceiptRow,
    input: NormalizedPixProviderEventIngress
  ): Promise<PixProviderEventIngressResult> {
    if (
      receipt.body_fingerprint !== input.bodyFingerprint ||
      receipt.claims_fingerprint !== input.claimsFingerprint
    ) {
      conflict();
    }

    const existingDelivery = await client.query<DeliveryRow>(
      `SELECT id
         FROM pix_provider_event_deliveries
        WHERE account_id = $1 AND event_id = $2`,
      [input.accountId, receipt.id]
    );
    const deliveryId =
      existingDelivery.rows[0]?.id ??
      (await this.#createDelivery(client, input.accountId, receipt.id, receipt.received_at));

    return { status: 'replayed', eventId: receipt.id, deliveryId };
  }

  async #createDelivery(
    client: PoolClient,
    accountId: string,
    eventId: string,
    receivedAt: string | Date
  ): Promise<string> {
    const deliveryId = randomUUID();
    try {
      await client.query('SAVEPOINT pix_provider_delivery_insert');
      await client.query(
        `INSERT INTO pix_provider_event_deliveries (
           id, account_id, event_id, state, attempts, max_attempts, next_attempt_at
         ) VALUES ($1, $2, $3, 'pending', 0, 8, $4)`,
        [deliveryId, accountId, eventId, receivedAt]
      );
      await client.query('RELEASE SAVEPOINT pix_provider_delivery_insert');
      return deliveryId;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      await client.query('ROLLBACK TO SAVEPOINT pix_provider_delivery_insert');
      await client.query('RELEASE SAVEPOINT pix_provider_delivery_insert');
      const existing = await client.query<DeliveryRow>(
        `SELECT id
           FROM pix_provider_event_deliveries
          WHERE account_id = $1 AND event_id = $2`,
        [accountId, eventId]
      );
      if (!existing.rows[0]) throw error;
      return existing.rows[0].id;
    }
  }
}
