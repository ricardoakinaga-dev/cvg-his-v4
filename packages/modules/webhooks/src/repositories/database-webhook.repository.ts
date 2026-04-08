import { and, asc, desc, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { webhookDeliveries, webhooks } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import type { WebhookRepository } from './webhook-repository.interface.js';

export type { WebhookRepository } from './webhook-repository.interface.js';

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
      .where(eq(webhooks.id, webhook.id));
  }

  public async findById(id: WebhookId): Promise<WebhookSummary | null> {
    const result = await this.#db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);

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
      webhookId: delivery.webhookId,
      event: delivery.event,
      payload: delivery.payload,
      status: delivery.status,
      attempts: delivery.attempts,
      lastAttemptAt: delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
      responseStatus: delivery.responseStatus ?? null,
      responseBody: delivery.responseBody ?? null,
      nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null,
      createdAt: new Date(delivery.createdAt)
    });
  }

  public async updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    await this.#db
      .update(webhookDeliveries)
      .set({
        status: delivery.status,
        attempts: delivery.attempts,
        lastAttemptAt: delivery.lastAttemptAt ? new Date(delivery.lastAttemptAt) : null,
        responseStatus: delivery.responseStatus ?? null,
        responseBody: delivery.responseBody ?? null,
        nextRetryAt: delivery.nextRetryAt ? new Date(delivery.nextRetryAt) : null
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  }

  public async findDeliveriesByWebhook(
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]> {
    const result = await this.#db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt));

    return result.map((row) => this.mapRowToDelivery(row));
  }

  public async findPendingDeliveries(limit: number): Promise<readonly WebhookDeliverySummary[]> {
    const result = await this.#db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'pending'))
      .orderBy(asc(webhookDeliveries.createdAt))
      .limit(limit);

    return result.map((row) => this.mapRowToDelivery(row));
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
      webhookId: row.webhookId as WebhookId,
      event: row.event,
      payload: row.payload as Record<string, unknown>,
      status: row.status as 'pending' | 'delivered' | 'failed',
      attempts: row.attempts,
      lastAttemptAt: row.lastAttemptAt?.toISOString(),
      responseStatus: row.responseStatus ?? undefined,
      responseBody: row.responseBody ?? undefined,
      nextRetryAt: row.nextRetryAt?.toISOString(),
      createdAt: row.createdAt.toISOString()
    };
  }
}
