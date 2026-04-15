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
import type { FeatureRepository } from '@cvg-his-v2/module-ml';
import type { ModelRepository } from '@cvg-his-v2/module-ml';
import type { Feature, FeatureGroup, FeatureVector, FeatureValue, CreateFeatureVector, EntityType } from '@cvg-his-v2/module-ml';
import type { Model, ModelVersion, ModelStage } from '@cvg-his-v2/module-ml';

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

class InMemoryFeatureRepository implements FeatureRepository {
  readonly #features = new Map<string, Feature>();
  readonly #groups = new Map<string, FeatureGroup>();
  readonly #vectors = new Map<string, FeatureVector>();
  readonly #values = new Map<string, FeatureValue>();
  #counter = 0;

  private nextId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.#counter}`;
  }

  async createFeature(data: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature> {
    const now = new Date().toISOString();
    const feature: Feature = { ...data, id: this.nextId('feat'), createdAt: now, updatedAt: now };
    this.#features.set(feature.id, feature);
    return feature;
  }

  async findFeatureById(id: string): Promise<Feature | null> {
    return this.#features.get(id) ?? null;
  }

  async findFeaturesByGroup(group: string): Promise<Feature[]> {
    return Array.from(this.#features.values()).filter((f) => f.group === group);
  }

  async listFeatures(): Promise<Feature[]> {
    return Array.from(this.#features.values());
  }

  async updateFeature(id: string, data: Partial<Omit<Feature, 'id' | 'createdAt'>>): Promise<Feature> {
    const existing = this.#features.get(id);
    if (!existing) throw new Error(`Feature ${id} not found`);
    const updated: Feature = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.#features.set(id, updated);
    return updated;
  }

  async deleteFeature(id: string): Promise<void> {
    this.#features.delete(id);
  }

  async createGroup(data: Omit<FeatureGroup, 'id' | 'createdAt'>): Promise<FeatureGroup> {
    const group: FeatureGroup = { ...data, id: this.nextId('grp'), createdAt: new Date().toISOString() };
    this.#groups.set(group.id, group);
    return group;
  }

  async findGroupById(id: string): Promise<FeatureGroup | null> {
    return this.#groups.get(id) ?? null;
  }

  async findGroupsByEntityType(entityType: EntityType): Promise<FeatureGroup[]> {
    return Array.from(this.#groups.values()).filter((g) => g.entityType === entityType);
  }

  async listGroups(): Promise<FeatureGroup[]> {
    return Array.from(this.#groups.values());
  }

  async deleteGroup(id: string): Promise<void> {
    this.#groups.delete(id);
  }

  async createVector(data: CreateFeatureVector): Promise<FeatureVector> {
    const now = new Date().toISOString();
    const vector: FeatureVector = { ...data, id: this.nextId('vec'), values: {}, createdAt: now, updatedAt: now };
    this.#vectors.set(vector.id, vector);
    return vector;
  }

  async findVectorById(id: string): Promise<FeatureVector | null> {
    return this.#vectors.get(id) ?? null;
  }

  async findVectorsByEntity(entityType: EntityType, entityId: string): Promise<FeatureVector[]> {
    return Array.from(this.#vectors.values()).filter(
      (v) => v.entityType === entityType && v.entityId === entityId
    );
  }

  async listVectors(): Promise<FeatureVector[]> {
    return Array.from(this.#vectors.values());
  }

  async updateVector(id: string, data: Partial<Omit<FeatureVector, 'id' | 'createdAt'>>): Promise<FeatureVector> {
    const existing = this.#vectors.get(id);
    if (!existing) throw new Error(`Vector ${id} not found`);
    const updated: FeatureVector = { ...existing, ...data, updatedAt: new Date().toISOString() };
    this.#vectors.set(id, updated);
    return updated;
  }

  async deleteVector(id: string): Promise<void> {
    this.#vectors.delete(id);
  }

  async upsertValue(value: Omit<FeatureValue, 'id'>): Promise<FeatureValue> {
    const id = this.nextId('fval');
    const fv: FeatureValue = { ...value, id };
    this.#values.set(id, fv);
    return fv;
  }

  async findValuesByEntity(featureId: string, entityId: string): Promise<FeatureValue[]> {
    return Array.from(this.#values.values()).filter(
      (v) => v.featureId === featureId && v.entityId === entityId
    );
  }

  async findLatestValue(featureId: string, entityId: string): Promise<FeatureValue | null> {
    const values = await this.findValuesByEntity(featureId, entityId);
    if (values.length === 0) return null;
    return values.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]!;
  }
}

class InMemoryModelRepository implements ModelRepository {
  readonly #models = new Map<string, Model>();
  readonly #versions = new Map<string, ModelVersion>();
  #counter = 0;

  private nextId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.#counter}`;
  }

  async createModel(data: Omit<Model, 'id' | 'currentVersion' | 'createdAt'>): Promise<Model> {
    const model: Model = { ...data, id: this.nextId('model'), currentVersion: 1, createdAt: new Date().toISOString() };
    this.#models.set(model.id, model);
    return model;
  }

  async findModelById(id: string): Promise<Model | null> {
    return this.#models.get(id) ?? null;
  }

  async listModels(): Promise<Model[]> {
    return Array.from(this.#models.values());
  }

  async updateModel(id: string, data: Partial<Omit<Model, 'id' | 'createdAt'>>): Promise<Model> {
    const existing = this.#models.get(id);
    if (!existing) throw new Error(`Model ${id} not found`);
    const updated: Model = { ...existing, ...data };
    this.#models.set(id, updated);
    return updated;
  }

  async deleteModel(id: string): Promise<void> {
    this.#models.delete(id);
  }

  async createVersion(data: Omit<ModelVersion, 'id' | 'stage' | 'metrics' | 'stageHistory' | 'createdAt'>): Promise<ModelVersion> {
    const version: ModelVersion = {
      ...data,
      id: this.nextId('ver'),
      stage: 'none',
      metrics: {},
      stageHistory: [],
      createdAt: new Date().toISOString()
    };
    this.#versions.set(version.id, version);
    return version;
  }

  async findVersionById(id: string): Promise<ModelVersion | null> {
    return this.#versions.get(id) ?? null;
  }

  async findVersionsByModelId(modelId: string): Promise<ModelVersion[]> {
    return Array.from(this.#versions.values()).filter((v) => v.modelId === modelId);
  }

  async findVersionByModelAndVersion(modelId: string, version: number): Promise<ModelVersion | null> {
    return Array.from(this.#versions.values()).find((v) => v.modelId === modelId && v.version === version) ?? null;
  }

  async updateVersionStage(id: string, stage: ModelStage, by?: string): Promise<ModelVersion> {
    const existing = this.#versions.get(id);
    if (!existing) throw new Error(`Version ${id} not found`);
    const updated: ModelVersion = {
      ...existing,
      stage,
      stageHistory: [...existing.stageHistory, { from: existing.stage, to: stage, at: new Date().toISOString(), by }]
    };
    this.#versions.set(id, updated);
    return updated;
  }

  async updateVersionMetrics(id: string, metrics: Record<string, number>): Promise<ModelVersion> {
    const existing = this.#versions.get(id);
    if (!existing) throw new Error(`Version ${id} not found`);
    const updated: ModelVersion = { ...existing, metrics };
    this.#versions.set(id, updated);
    return updated;
  }
}

export interface InMemoryRuntimeRepositories {
  readonly apiKey: ApiKeyRepository;
  readonly outbox: OutboxRepository;
  readonly webhook: WebhookRepository;
  readonly feature: FeatureRepository;
  readonly model: ModelRepository;
}

export function createInMemoryRuntimeRepositories(): InMemoryRuntimeRepositories {
  return {
    apiKey: new InMemoryApiKeyRepository(),
    outbox: new InMemoryOutboxRepository(),
    webhook: new InMemoryWebhookRepository(),
    feature: new InMemoryFeatureRepository(),
    model: new InMemoryModelRepository()
  };
}

export function createInMemoryCorrelationId(prefix: string): CorrelationId {
  return createCorrelationId(prefix) as CorrelationId;
}

export function createInMemoryModuleName(moduleName: string): ModuleName {
  return moduleName as ModuleName;
}
