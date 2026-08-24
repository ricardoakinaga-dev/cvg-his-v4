import { and, asc, desc, eq } from 'drizzle-orm';
import { getPool, type DatabaseClient } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import { webhookDeliveries, webhooks } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import type {
  ClaimPendingWebhookDeliveriesInput,
  RetryWebhookDeliveryInput,
  WebhookDeliveryClaim,
  WebhookRepository
} from './webhook-repository.interface.js';

export type {
  ClaimPendingWebhookDeliveriesInput,
  RetryWebhookDeliveryInput,
  WebhookDeliveryClaim,
  WebhookRepository
} from './webhook-repository.interface.js';

export class DatabaseWebhookRepository implements WebhookRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(webhook: WebhookSummary): Promise<void> {
    await this.#db.insert(webhooks).values({
      id: webhook.id,
      accountId: webhook.accountId,
      url: webhook.url,
      events: [...webhook.events],
      secret: webhook.secret ?? null,
      isActive: webhook.isActive,
      createdAt: new Date(webhook.createdAt),
      updatedAt: new Date(webhook.updatedAt)
    });
  }

  public async update(webhook: WebhookSummary): Promise<void> {
    await this.#db
      .update(webhooks)
      .set({
        url: webhook.url,
        events: [...webhook.events],
        isActive: webhook.isActive,
        updatedAt: new Date(webhook.updatedAt)
      })
      .where(and(eq(webhooks.id, webhook.id), eq(webhooks.accountId, webhook.accountId)));
  }

  public async delete(accountId: AccountId, webhookId: WebhookId): Promise<void> {
    await this.#db
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.accountId, accountId)));
  }

  public async findById(accountId: AccountId, id: WebhookId): Promise<WebhookSummary | null> {
    const result = await this.#db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.accountId, accountId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToWebhook(result[0]);
  }

  public async findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    const result = await this.#db
      .select()
      .from(webhooks)
      .where(eq(webhooks.accountId, accountId))
      .orderBy(desc(webhooks.createdAt));

    return result.map((row) => this.mapRowToWebhook(row));
  }

  public async findActiveByEvent(
    accountId: AccountId,
    event: string
  ): Promise<readonly WebhookSummary[]> {
    const all = await this.#db.select().from(webhooks).where(eq(webhooks.accountId, accountId));

    return all
      .map((row) => this.mapRowToWebhook(row))
      .filter((w) => w.isActive && w.events.includes(event));
  }

  public async createDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    await this.#db.insert(webhookDeliveries).values({
      id: delivery.id,
      accountId: delivery.accountId,
      webhookId: delivery.webhookId,
      event: delivery.event,
      payload: delivery.payload,
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts ?? 4,
      lastAttemptAt: delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
      responseStatus: delivery.responseStatus ?? null,
      responseBody: delivery.responseBody ?? null,
      responseError: delivery.responseError ?? null,
      nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null,
      deadLetteredAt: delivery.deadLetteredAt ? new Date(delivery.deadLetteredAt) : null,
      createdAt: new Date(delivery.createdAt)
    });
  }

  public async updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    await this.#db
      .update(webhookDeliveries)
      .set({
        status: delivery.status,
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts ?? 4,
        lastAttemptAt: delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
        responseStatus: delivery.responseStatus ?? null,
        responseBody: delivery.responseBody ?? null,
        responseError: delivery.responseError ?? null,
        nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null,
        deadLetteredAt: delivery.deadLetteredAt ? new Date(delivery.deadLetteredAt) : null
      })
      .where(
        and(
          eq(webhookDeliveries.id, delivery.id),
          eq(webhookDeliveries.accountId, delivery.accountId)
        )
      );
  }

  public async deleteDeliveriesByWebhook(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<void> {
    await this.#db
      .delete(webhookDeliveries)
      .where(
        and(eq(webhookDeliveries.webhookId, webhookId), eq(webhookDeliveries.accountId, accountId))
      );
  }

  public async findDeliveriesByWebhook(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]> {
    const result = await this.#db
      .select()
      .from(webhookDeliveries)
      .where(
        and(eq(webhookDeliveries.webhookId, webhookId), eq(webhookDeliveries.accountId, accountId))
      )
      .orderBy(desc(webhookDeliveries.createdAt));

    return result.map((row) => this.mapRowToDelivery(row));
  }

  public async findPendingDeliveries(
    accountId: AccountId,
    limit: number
  ): Promise<readonly WebhookDeliverySummary[]> {
    const result = await this.#db
      .select()
      .from(webhookDeliveries)
      .where(
        and(eq(webhookDeliveries.accountId, accountId), eq(webhookDeliveries.status, 'pending'))
      )
      .orderBy(asc(webhookDeliveries.createdAt))
      .limit(limit);

    return result.map((row) => this.mapRowToDelivery(row));
  }

  public async claimPending(
    accountId: AccountId,
    input: ClaimPendingWebhookDeliveriesInput
  ): Promise<readonly WebhookDeliveryClaim[]> {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      throw new Error('Webhook claim limit must be between 1 and 100');
    }
    if (!Number.isInteger(input.leaseMs) || input.leaseMs < 1_000 || input.leaseMs > 900_000) {
      throw new Error('Webhook lease duration must be between 1000 and 900000 milliseconds');
    }
    if (
      input.leaseOwner !== input.leaseOwner.trim() ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(input.leaseOwner) ||
      Buffer.byteLength(input.leaseOwner, 'utf8') > 160
    ) {
      throw new Error('Webhook worker id is invalid');
    }

    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      await client.query(
        `UPDATE webhook_deliveries
            SET status = 'failed',
                response_error = COALESCE(response_error, 'lease expired after final attempt'),
                dead_lettered_at = COALESCE(dead_lettered_at, now()),
                lease_owner = NULL,
                lease_token = NULL,
                lease_expires_at = NULL
          WHERE account_id = $1
            AND status = 'processing'
            AND lease_expires_at <= now()
            AND attempts >= max_attempts`,
        [accountId]
      );

      const result = await client.query(
        `WITH candidates AS (
           SELECT id
             FROM webhook_deliveries
            WHERE account_id = $1
              AND attempts < max_attempts
              AND (
                (status IN ('pending', 'retrying')
                  AND (next_retry_at IS NULL OR next_retry_at <= now()))
                OR
                (status = 'processing' AND lease_expires_at <= now())
              )
            ORDER BY COALESCE(next_retry_at, created_at) ASC, created_at ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $2
         )
         UPDATE webhook_deliveries AS delivery
            SET status = 'processing',
                attempts = delivery.attempts + 1,
                lease_owner = $3,
                lease_token = gen_random_uuid(),
                lease_version = delivery.lease_version + 1,
                lease_expires_at = now() + ($4::text || ' milliseconds')::interval,
                last_attempt_at = now(),
                response_error = NULL,
                dead_lettered_at = NULL
           FROM candidates
          WHERE delivery.id = candidates.id
            AND delivery.account_id = $1
        RETURNING delivery.*`,
        [accountId, input.limit, input.leaseOwner, input.leaseMs]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapClaim(row));
    });
  }

  public async renewClaim(claim: WebhookDeliveryClaim, leaseMs: number): Promise<boolean> {
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 900_000) {
      throw new Error('Webhook lease duration must be between 1000 and 900000 milliseconds');
    }
    return withTenantQueryExplicit(getPool(), claim.delivery.accountId, async (client) => {
      const result = await client.query(
        `UPDATE webhook_deliveries
            SET lease_expires_at = now() + ($6::text || ' milliseconds')::interval
          WHERE id = $1
            AND account_id = $2
            AND status = 'processing'
            AND lease_owner = $3
            AND lease_token = $4::uuid
            AND lease_version = $5
            AND lease_expires_at > now()`,
        [
          claim.delivery.id,
          claim.delivery.accountId,
          claim.leaseOwner,
          claim.leaseToken,
          claim.leaseVersion,
          leaseMs
        ]
      );
      return result.rowCount === 1;
    });
  }

  public async completeClaim(
    claim: WebhookDeliveryClaim,
    result: WebhookDeliverySummary
  ): Promise<boolean> {
    return this.transitionClaim(claim, {
      status: 'delivered',
      lastAttemptAt: result.lastAttemptAt,
      responseStatus: result.responseStatus,
      responseBody: result.responseBody,
      responseError: undefined,
      nextRetryAt: undefined,
      deadLetteredAt: undefined
    });
  }

  public async retryClaim(
    claim: WebhookDeliveryClaim,
    input: RetryWebhookDeliveryInput,
    result: WebhookDeliverySummary
  ): Promise<boolean> {
    return this.transitionClaim(
      claim,
      {
        status: 'retrying',
        lastAttemptAt: result.lastAttemptAt,
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        responseError: input.error,
        nextRetryAt: input.scheduledAt,
        deadLetteredAt: undefined
      },
      input.scheduledAt
    );
  }

  public async failClaim(
    claim: WebhookDeliveryClaim,
    result: WebhookDeliverySummary
  ): Promise<boolean> {
    return this.transitionClaim(claim, {
      status: 'failed',
      lastAttemptAt: result.lastAttemptAt,
      responseStatus: result.responseStatus,
      responseBody: result.responseBody,
      responseError: result.responseError,
      nextRetryAt: undefined,
      deadLetteredAt: result.deadLetteredAt
    });
  }

  public async requeueDelivery(
    accountId: AccountId,
    deliveryId: WebhookDeliveryId
  ): Promise<boolean> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `UPDATE webhook_deliveries
            SET status = 'pending',
                attempts = 0,
                response_status = NULL,
                response_body = NULL,
                response_error = NULL,
                next_retry_at = NULL,
                dead_lettered_at = NULL,
                lease_owner = NULL,
                lease_token = NULL,
                lease_expires_at = NULL
          WHERE account_id = $1
            AND id = $2
            AND status = 'failed'`,
        [accountId, deliveryId]
      );
      return result.rowCount === 1;
    });
  }

  private async transitionClaim(
    claim: WebhookDeliveryClaim,
    values: {
      readonly status: 'delivered' | 'retrying' | 'failed';
      readonly lastAttemptAt?: string;
      readonly responseStatus?: number;
      readonly responseBody?: string;
      readonly responseError?: string;
      readonly nextRetryAt?: string;
      readonly deadLetteredAt?: string;
    },
    scheduledAt?: string
  ): Promise<boolean> {
    return withTenantQueryExplicit(getPool(), claim.delivery.accountId, async (client) => {
      const result = await client.query(
        `UPDATE webhook_deliveries
            SET status = $6,
                last_attempt_at = $7,
                response_status = $8,
                response_body = $9,
                response_error = $10,
                next_retry_at = $11,
                dead_lettered_at = $12,
                lease_owner = NULL,
                lease_token = NULL,
                lease_expires_at = NULL
          WHERE id = $1
            AND account_id = $2
            AND status = 'processing'
            AND lease_owner = $3
            AND lease_token = $4::uuid
            AND lease_version = $5
            AND lease_expires_at > now()`,
        [
          claim.delivery.id,
          claim.delivery.accountId,
          claim.leaseOwner,
          claim.leaseToken,
          claim.leaseVersion,
          values.status,
          values.lastAttemptAt ? new Date(values.lastAttemptAt) : new Date(),
          values.responseStatus ?? null,
          values.responseBody ?? null,
          values.responseError ?? null,
          scheduledAt ?? (values.nextRetryAt ? new Date(values.nextRetryAt) : null),
          values.deadLetteredAt ? new Date(values.deadLetteredAt) : null
        ]
      );
      return result.rowCount === 1;
    });
  }

  private mapRowToWebhook(row: typeof webhooks.$inferSelect): WebhookSummary {
    return {
      id: row.id as WebhookId,
      accountId: row.accountId as AccountId,
      url: row.url,
      events: row.events as string[],
      secret: row.secret ?? undefined,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private mapRowToDelivery(row: typeof webhookDeliveries.$inferSelect): WebhookDeliverySummary {
    return {
      id: row.id as WebhookDeliveryId,
      accountId: row.accountId as AccountId,
      webhookId: row.webhookId as WebhookId,
      event: row.event,
      payload: row.payload as Record<string, unknown>,
      status: row.status as WebhookDeliverySummary['status'],
      attempts: row.attempts,
      lastAttemptAt: row.lastAttemptAt?.toISOString(),
      responseStatus: row.responseStatus ?? undefined,
      responseBody: row.responseBody ?? undefined,
      maxAttempts: row.maxAttempts,
      responseError: row.responseError ?? undefined,
      nextRetryAt: row.nextRetryAt?.toISOString(),
      deadLetteredAt: row.deadLetteredAt?.toISOString(),
      createdAt: row.createdAt.toISOString()
    };
  }

  private mapClaim(row: Record<string, unknown>): WebhookDeliveryClaim {
    const delivery = this.mapRawRowToDelivery(row);
    const leaseOwner = typeof row.lease_owner === 'string' ? row.lease_owner : '';
    const leaseToken = typeof row.lease_token === 'string' ? row.lease_token : '';
    const leaseExpiresAt = row.lease_expires_at instanceof Date
      ? row.lease_expires_at.toISOString()
      : String(row.lease_expires_at ?? '');
    const leaseVersion = Number(row.lease_version ?? 0);
    if (!leaseOwner || !leaseToken || !leaseExpiresAt || !Number.isSafeInteger(leaseVersion)) {
      throw new Error('Webhook claim returned an invalid lease');
    }
    return Object.freeze({ delivery, leaseOwner, leaseToken, leaseVersion, leaseExpiresAt });
  }

  private mapRawRowToDelivery(row: Record<string, unknown>): WebhookDeliverySummary {
    return {
      id: String(row.id) as WebhookDeliveryId,
      accountId: String(row.account_id) as AccountId,
      webhookId: String(row.webhook_id) as WebhookId,
      event: String(row.event),
      payload: (row.payload as Record<string, unknown>) ?? {},
      status: String(row.status) as WebhookDeliverySummary['status'],
      attempts: Number(row.attempts ?? 0),
      maxAttempts: Number(row.max_attempts ?? 4),
      lastAttemptAt: row.last_attempt_at instanceof Date
        ? row.last_attempt_at.toISOString()
        : undefined,
      responseStatus: typeof row.response_status === 'number' ? row.response_status : undefined,
      responseBody: typeof row.response_body === 'string' ? row.response_body : undefined,
      responseError: typeof row.response_error === 'string' ? row.response_error : undefined,
      nextRetryAt: row.next_retry_at instanceof Date ? row.next_retry_at.toISOString() : undefined,
      deadLetteredAt: row.dead_lettered_at instanceof Date
        ? row.dead_lettered_at.toISOString()
        : undefined,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(String(row.created_at)).toISOString()
    };
  }
}
