import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookPayload
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  UserId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export { DatabaseWebhookRepository } from './repositories/database-webhook.repository.js';

import type { WebhookRepository as IWebhookRepository } from './repositories/database-webhook.repository.js';
export type { WebhookRepository } from './repositories/database-webhook.repository.js';

export interface WebhooksServiceOptions {
  readonly repository?: IWebhookRepository;
  readonly onDeliver?: (delivery: WebhookDeliverySummary) => Promise<void>;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5000, 30000, 90000];

export class WebhooksService {
  readonly #repository?: IWebhookRepository;
  readonly #onDeliver?: (delivery: WebhookDeliverySummary) => Promise<void>;

  public constructor(options?: WebhooksServiceOptions) {
    this.#repository = options?.repository;
    this.#onDeliver = options?.onDeliver;
  }

  public async register(
    _actorUserId: UserId,
    accountId: AccountId,
    payload: CreateWebhookRequest
  ): Promise<WebhookSummary> {
    const url = requireNonEmptyString(payload.url, 'url');
    requireNonEmptyString(payload.events.length > 0 ? payload.events[0] : 'events', 'events');

    const now = nowIso();
    const webhook: WebhookSummary = {
      id: createCorrelationId('wh') as WebhookId,
      accountId,
      url,
      events: [...payload.events],
      secret: payload.secret,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    if (this.#repository) {
      await this.#repository.create(webhook);
    }

    return webhook;
  }

  public async list(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    if (!this.#repository) {
      return [];
    }
    return this.#repository.findByAccount(accountId);
  }

  /**
   * Send a test event to a registered webhook.
   * Returns the delivery result without storing in delivery history.
   */
  public async test(
    webhookId: WebhookId,
    accountId: AccountId
  ): Promise<{ success: boolean; statusCode?: number; body?: string } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(webhookId);
    if (!webhook || webhook.accountId !== accountId) {
      return null;
    }

    const payload: WebhookPayload = {
      id: createCorrelationId('whpay'),
      event: 'webhook.test',
      timestamp: nowIso(),
      accountId,
      data: {
        message: 'This is a test webhook delivery from CVG HIS',
        webhookId: webhook.id,
        accountId
      }
    };

    return this.#attemptDelivery(webhook, payload, {
      id: createCorrelationId('whdel') as WebhookDeliveryId,
      webhookId,
      event: 'webhook.test',
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
      attempts: 0,
      createdAt: nowIso()
    });
  }

  public async get(webhookId: WebhookId): Promise<WebhookSummary | null> {
    if (!this.#repository) {
      return null;
    }
    return this.#repository.findById(webhookId);
  }

  public async update(
    webhookId: WebhookId,
    payload: UpdateWebhookRequest
  ): Promise<WebhookSummary | null> {
    if (!this.#repository) {
      return null;
    }

    const existing = await this.#repository.findById(webhookId);
    if (!existing) {
      return null;
    }

    const updated: WebhookSummary = {
      ...existing,
      url: payload.url ?? existing.url,
      events: payload.events ?? existing.events,
      isActive: payload.isActive ?? existing.isActive,
      updatedAt: nowIso()
    };

    await this.#repository.update(updated);
    return updated;
  }

  public async delete(webhookId: WebhookId): Promise<boolean> {
    if (!this.#repository) {
      return false;
    }

    const existing = await this.#repository.findById(webhookId);
    if (!existing) {
      return false;
    }

    await this.#repository.update({ ...existing, isActive: false, updatedAt: nowIso() });
    await this.#repository.deleteDeliveriesByWebhook(webhookId);
    return true;
  }

  public async listDeliveries(webhookId: WebhookId): Promise<readonly WebhookDeliverySummary[]> {
    if (!this.#repository) {
      return [];
    }
    return this.#repository.findDeliveriesByWebhook(webhookId);
  }

  /**
   * Retest a specific webhook delivery by re-attempting delivery.
   * Resets the delivery status to 'pending' and triggers async retry.
   */
  public async retestDelivery(
    webhookId: WebhookId,
    deliveryId: WebhookDeliveryId,
    accountId: AccountId
  ): Promise<{ success: boolean; message: string } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(webhookId);
    if (!webhook || webhook.accountId !== accountId) {
      return null;
    }

    const deliveries = await this.#repository.findDeliveriesByWebhook(webhookId);
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) {
      return null;
    }

    // Reset delivery to pending for retry
    const resetDelivery: WebhookDeliverySummary = {
      ...delivery,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: undefined,
      responseStatus: undefined,
      responseBody: undefined,
      nextRetryAt: undefined
    };
    await this.#repository.updateDelivery(resetDelivery);

    // Trigger async retry
    void this.#deliverWithRetry(webhook, resetDelivery, delivery.payload as unknown as WebhookPayload);

    return { success: true, message: 'Delivery re-queued for retry' };
  }

  /**
   * Return delivery statistics for a webhook: breakdown by status and totals.
   */
  public async getDeliveryStats(webhookId: WebhookId): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
  } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(webhookId);
    if (!webhook) return null;

    const deliveries = await this.#repository.findDeliveriesByWebhook(webhookId);
    const stats = { total: deliveries.length, pending: 0, delivered: 0, failed: 0 };
    for (const d of deliveries) {
      if (d.status === 'pending') stats.pending++;
      else if (d.status === 'delivered') stats.delivered++;
      else if (d.status === 'failed') stats.failed++;
    }
    return stats;
  }

  public async dispatch(
    accountId: AccountId,
    event: string,
    data: Record<string, unknown>
  ): Promise<number> {
    if (!this.#repository) {
      return 0;
    }

    const webhooks = await this.#repository.findActiveByEvent(accountId, event);
    if (webhooks.length === 0) {
      return 0;
    }

    const payload: WebhookPayload = {
      id: createCorrelationId('whpay'),
      event,
      timestamp: nowIso(),
      accountId,
      data
    };

    let dispatched = 0;

    for (const webhook of webhooks) {
      const delivery: WebhookDeliverySummary = {
        id: createCorrelationId('whdel') as WebhookDeliveryId,
        webhookId: webhook.id,
        event,
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        createdAt: nowIso()
      };

      await this.#repository.createDelivery(delivery);
      dispatched++;
      await this.#deliverWithRetry(webhook, delivery, payload);
    }

    return dispatched;
  }

  async #deliverWithRetry(
    webhook: WebhookSummary,
    delivery: WebhookDeliverySummary,
    payload: WebhookPayload
  ): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const result = await this.#attemptDelivery(webhook, payload, delivery);

      if (result.success) {
        const updated: WebhookDeliverySummary = {
          ...delivery,
          status: 'delivered',
          attempts: attempt + 1,
          lastAttemptAt: nowIso(),
          responseStatus: result.statusCode,
          responseBody: result.body
        };

        await this.#updateDelivery(updated);
        return;
      }

      if (attempt === MAX_RETRY_ATTEMPTS) {
        const updated: WebhookDeliverySummary = {
          ...delivery,
          status: 'failed',
          attempts: attempt + 1,
          lastAttemptAt: nowIso(),
          responseStatus: result.statusCode,
          responseBody: result.body
        };

        await this.#updateDelivery(updated);
        return;
      }

      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      const nextRetry = new Date(Date.now() + delay);

      const updated: WebhookDeliverySummary = {
        ...delivery,
        status: 'pending',
        attempts: attempt + 1,
        lastAttemptAt: nowIso(),
        responseStatus: result.statusCode,
        responseBody: result.body,
        nextRetryAt: nextRetry.toISOString()
      };

      await this.#updateDelivery(updated);
    }
  }

  async #attemptDelivery(
    webhook: WebhookSummary,
    payload: WebhookPayload,
    delivery: WebhookDeliverySummary
  ): Promise<{ success: boolean; statusCode?: number; body?: string }> {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery-ID': delivery.id
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      const body = await response.text().catch(() => undefined);
      return {
        success: response.ok,
        statusCode: response.status,
        body
      };
    } catch {
      return { success: false };
    }
  }

  async #updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    if (this.#repository) {
      await this.#repository.updateDelivery(delivery);
    }

    if (this.#onDeliver) {
      await this.#onDeliver(delivery);
    }
  }
}
