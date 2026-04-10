import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import type {
  AccountId,
  ApiKeyId,
  ApiKeySummary,
  ApiKeyUsageSummary,
  CorrelationId,
  ModuleName,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import type { ApiKeyRepository } from '@cvg-his-v2/module-api-keys';
import type { OutboxEvent, OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { WebhookRepository } from '@cvg-his-v2/module-webhooks';

class InMemoryApiKeyRepository implements ApiKeyRepository {
  readonly #apiKeys = new Map<ApiKeyId, ApiKeySummary>();
  readonly #usage = new Map<string, number>();
  readonly #usageHistory: ApiKeyUsageSummary[] = [];

  async create(apiKey: ApiKeySummary): Promise<void> {
    this.#apiKeys.set(apiKey.id, apiKey);
  }

  async findById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    return this.#apiKeys.get(id) ?? null;
  }

  async findByAccount(accountId: string): Promise<readonly ApiKeySummary[]> {
    return Array.from(this.#apiKeys.values()).filter((apiKey) => apiKey.accountId === accountId);
  }

  async findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]> {
    return Array.from(this.#apiKeys.values()).filter(
      (apiKey) => apiKey.keyPrefix === keyPrefix && apiKey.isActive
    );
  }

  async findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    const apiKey = this.#apiKeys.get(id);
    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) return null;
    return apiKey;
  }

  async update(apiKey: ApiKeySummary): Promise<void> {
    this.#apiKeys.set(apiKey.id, apiKey);
  }

  async delete(id: ApiKeyId): Promise<void> {
    this.#apiKeys.delete(id);
  }

  async incrementUsage(apiKeyId: string, windowStart: Date): Promise<void> {
    const key = `${apiKeyId}:${windowStart.toISOString()}`;
    this.#usage.set(key, (this.#usage.get(key) ?? 0) + 1);
  }

  async getUsageCount(apiKeyId: string, windowStart: Date): Promise<number> {
    const key = `${apiKeyId}:${windowStart.toISOString()}`;
    return this.#usage.get(key) ?? 0;
  }

  async recordUsage(usage: ApiKeyUsageSummary): Promise<void> {
    this.#usageHistory.push(usage);
  }

  async getUsageHistory(apiKeyId: string, limit = 100): Promise<readonly ApiKeyUsageSummary[]> {
    return this.#usageHistory
      .filter((entry) => entry.apiKeyId === apiKeyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

class InMemoryOutboxRepository implements OutboxRepository {
  readonly #events = new Map<string, OutboxEvent>();

  async create(event: OutboxEvent): Promise<void> {
    this.#events.set(event.id, event);
  }

  async update(event: OutboxEvent): Promise<void> {
    this.#events.set(event.id, event);
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    return this.#events.get(id) ?? null;
  }

  async findPending(limit: number): Promise<readonly OutboxEvent[]> {
    const now = Date.now();
    return Array.from(this.#events.values())
      .filter(
        (event) =>
          (event.status === 'pending' || event.status === 'retrying') &&
          new Date(event.scheduledAt).getTime() <= now
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }

  async findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]> {
    return Array.from(this.#events.values())
      .filter((event) => event.correlationId === correlationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findFailed(limit: number): Promise<readonly OutboxEvent[]> {
    return Array.from(this.#events.values())
      .filter((event) => event.status === 'failed')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

class InMemoryWebhookRepository implements WebhookRepository {
  readonly #webhooks = new Map<WebhookId, WebhookSummary>();
  readonly #deliveries = new Map<WebhookDeliveryId, WebhookDeliverySummary>();

  async create(webhook: WebhookSummary): Promise<void> {
    this.#webhooks.set(webhook.id, webhook);
  }

  async update(webhook: WebhookSummary): Promise<void> {
    this.#webhooks.set(webhook.id, webhook);
  }

  async findById(id: WebhookId): Promise<WebhookSummary | null> {
    return this.#webhooks.get(id) ?? null;
  }

  async findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    return Array.from(this.#webhooks.values()).filter((webhook) => webhook.accountId === accountId);
  }

  async findActiveByEvent(accountId: AccountId, event: string): Promise<readonly WebhookSummary[]> {
    return Array.from(this.#webhooks.values()).filter(
      (webhook) => webhook.accountId === accountId && webhook.isActive && webhook.events.includes(event)
    );
  }

  async createDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    this.#deliveries.set(delivery.id, delivery);
  }

  async updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    this.#deliveries.set(delivery.id, delivery);
  }

  async findDeliveriesByWebhook(webhookId: WebhookId): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.webhookId === webhookId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findPendingDeliveries(limit: number): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.status === 'pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }
}

export interface InMemoryRuntimeRepositories {
  readonly apiKey: ApiKeyRepository;
  readonly outbox: OutboxRepository;
  readonly webhook: WebhookRepository;
}

export function createInMemoryRuntimeRepositories(): InMemoryRuntimeRepositories {
  return {
    apiKey: new InMemoryApiKeyRepository(),
    outbox: new InMemoryOutboxRepository(),
    webhook: new InMemoryWebhookRepository()
  };
}

export function createInMemoryCorrelationId(prefix: string): CorrelationId {
  return createCorrelationId(prefix) as CorrelationId;
}

export function createInMemoryModuleName(moduleName: string): ModuleName {
  return moduleName as ModuleName;
}
