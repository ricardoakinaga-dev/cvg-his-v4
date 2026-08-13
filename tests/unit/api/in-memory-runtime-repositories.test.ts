import { describe, expect, it } from 'vitest';

import {
  createInMemoryCorrelationId,
  createInMemoryModuleName,
  createInMemoryRuntimeRepositories
} from '../../../apps/api/src/runtime-repositories.ts';

describe('in-memory runtime repository contracts', () => {
  it('enforces API-key activity, expiry, usage windows and bounded history', async () => {
    const { apiKey } = createInMemoryRuntimeRepositories();
    const active = {
      id: 'api-key-active',
      accountId: 'account-a',
      name: 'Active key',
      keyHash: 'hash-active',
      keyPrefix: 'cvg_active',
      permissions: ['integrations.read'],
      isActive: true,
      createdAt: '2026-08-10T10:00:00.000Z'
    } as never;
    const expired = {
      ...active,
      id: 'api-key-expired',
      keyPrefix: 'cvg_expired',
      expiresAt: '2020-01-01T00:00:00.000Z'
    } as never;
    const disabled = {
      ...active,
      id: 'api-key-disabled',
      keyPrefix: 'cvg_disabled',
      isActive: false
    } as never;

    await apiKey.create(active);
    await apiKey.create(expired);
    await apiKey.create(disabled);
    expect(await apiKey.findById(active.id)).toEqual(active);
    expect(await apiKey.findById('missing' as never)).toBeNull();
    expect(await apiKey.findByAccount('account-a')).toHaveLength(3);
    expect(await apiKey.findByPrefix('cvg_active')).toEqual([active]);
    expect(await apiKey.findByPrefix('cvg_disabled')).toEqual([]);
    expect(await apiKey.findActiveById(active.id)).toEqual(active);
    expect(await apiKey.findActiveById(expired.id)).toBeNull();
    expect(await apiKey.findActiveById(disabled.id)).toBeNull();

    const updated = { ...active, name: 'Updated key' } as never;
    await apiKey.update(updated);
    expect(await apiKey.findById(active.id)).toEqual(updated);

    const windowStart = new Date('2026-08-12T10:00:00.000Z');
    await apiKey.incrementUsage(active.id, windowStart);
    await apiKey.incrementUsage(active.id, windowStart);
    expect(await apiKey.getUsageCount(active.id, windowStart)).toBe(2);
    expect(await apiKey.getUsageCount(active.id, new Date('2026-08-12T11:00:00.000Z'))).toBe(0);

    await apiKey.recordUsage({
      id: 'usage-old',
      apiKeyId: active.id,
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never);
    await apiKey.recordUsage({
      id: 'usage-new',
      apiKeyId: active.id,
      createdAt: '2026-08-12T11:00:00.000Z'
    } as never);
    expect((await apiKey.getUsageHistory(active.id, 1))[0]).toMatchObject({ id: 'usage-new' });

    await apiKey.delete(active.id);
    expect(await apiKey.findById(active.id)).toBeNull();
  });

  it('orders and filters pending, failed and correlated outbox events', async () => {
    const { outbox } = createInMemoryRuntimeRepositories();
    const base = {
      accountId: 'account-a',
      eventType: 'integration.event',
      aggregateType: 'integration',
      aggregateId: 'aggregate-1',
      payload: {},
      status: 'pending',
      correlationId: 'correlation-a',
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    };
    const pending = { ...base, id: 'event-pending' } as never;
    const retrying = {
      ...base,
      id: 'event-retrying',
      status: 'retrying',
      createdAt: '2026-08-12T11:00:00.000Z'
    } as never;
    const future = {
      ...base,
      id: 'event-future',
      scheduledAt: '2999-01-01T00:00:00.000Z'
    } as never;
    const failed = {
      ...base,
      id: 'event-failed',
      status: 'failed',
      createdAt: '2026-08-12T12:00:00.000Z'
    } as never;

    for (const event of [pending, retrying, future, failed]) await outbox.create(event);
    expect(await outbox.findById('missing')).toBeNull();
    expect((await outbox.findPending(2)).map((event) => event.id)).toEqual([
      'event-pending',
      'event-retrying'
    ]);
    expect((await outbox.findFailed(1)).map((event) => event.id)).toEqual(['event-failed']);
    expect((await outbox.findByCorrelationId('correlation-a' as never))[0]?.id).toBe(
      'event-failed'
    );
    const completed = { ...pending, status: 'completed' } as never;
    await outbox.update(completed);
    expect(await outbox.findById(pending.id)).toEqual(completed);
  });

  it('tracks webhook subscriptions and delivery lifecycle independently', async () => {
    const { webhook } = createInMemoryRuntimeRepositories();
    const active = {
      id: 'webhook-active',
      accountId: 'account-a',
      url: 'https://example.test/active',
      events: ['billing.created'],
      isActive: true,
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z'
    } as never;
    const disabled = {
      ...active,
      id: 'webhook-disabled',
      url: 'https://example.test/disabled',
      isActive: false
    } as never;
    await webhook.create(active);
    await webhook.create(disabled);
    expect(await webhook.findById('missing' as never)).toBeNull();
    expect(await webhook.findByAccount('account-a' as never)).toHaveLength(2);
    expect(await webhook.findActiveByEvent('account-a' as never, 'billing.created')).toEqual([
      active
    ]);

    const updated = { ...active, events: ['billing.paid'] } as never;
    await webhook.update(updated);
    expect(await webhook.findById(active.id)).toEqual(updated);
    const olderDelivery = {
      id: 'delivery-old',
      webhookId: active.id,
      status: 'pending',
      createdAt: '2026-08-12T10:00:00.000Z'
    } as never;
    const newerDelivery = {
      id: 'delivery-new',
      webhookId: active.id,
      status: 'pending',
      createdAt: '2026-08-12T11:00:00.000Z'
    } as never;
    await webhook.createDelivery(olderDelivery);
    await webhook.createDelivery(newerDelivery);
    expect((await webhook.findPendingDeliveries(1))[0]?.id).toBe('delivery-old');
    expect((await webhook.findDeliveriesByWebhook(active.id))[0]?.id).toBe('delivery-new');
    await webhook.updateDelivery({ ...newerDelivery, status: 'delivered' } as never);
    await webhook.deleteDeliveriesByWebhook(active.id);
    expect(await webhook.findDeliveriesByWebhook(active.id)).toEqual([]);
    await webhook.delete(active.id);
    expect(await webhook.findById(active.id)).toBeNull();
  });

  it('supports complete feature, group, vector and value repository lifecycle', async () => {
    const { feature } = createInMemoryRuntimeRepositories();
    const createdFeature = await feature.createFeature({
      name: 'weight',
      description: 'Patient weight',
      dataType: 'number',
      group: 'clinical',
      version: 1,
      isActive: true
    } as never);
    expect(await feature.findFeatureById(createdFeature.id)).toEqual(createdFeature);
    expect(await feature.findFeatureById('missing')).toBeNull();
    expect(await feature.findFeaturesByGroup('clinical')).toEqual([createdFeature]);
    expect(await feature.listFeatures()).toEqual([createdFeature]);
    const updatedFeature = await feature.updateFeature(createdFeature.id, { description: 'Updated' });
    expect(updatedFeature.description).toBe('Updated');
    await expect(feature.updateFeature('missing', {})).rejects.toThrow('not found');

    const group = await feature.createGroup({
      name: 'Clinical group',
      entityType: 'patient',
      description: 'Clinical features'
    } as never);
    expect(await feature.findGroupById(group.id)).toEqual(group);
    expect(await feature.findGroupById('missing')).toBeNull();
    expect(await feature.findGroupsByEntityType('patient' as never)).toEqual([group]);
    expect(await feature.listGroups()).toEqual([group]);

    const vector = await feature.createVector({
      entityType: 'patient',
      entityId: 'patient-1',
      groupId: group.id
    } as never);
    expect(await feature.findVectorById(vector.id)).toEqual(vector);
    expect(await feature.findVectorById('missing')).toBeNull();
    expect(await feature.findVectorsByEntity('patient' as never, 'patient-1')).toEqual([vector]);
    expect(await feature.listVectors()).toEqual([vector]);
    const updatedVector = await feature.updateVector(vector.id, { values: { weight: 12 } });
    expect(updatedVector.values).toEqual({ weight: 12 });
    await expect(feature.updateVector('missing', {})).rejects.toThrow('not found');

    await feature.upsertValue({
      featureId: createdFeature.id,
      entityId: 'patient-1',
      value: 10,
      timestamp: '2026-08-12T10:00:00.000Z'
    } as never);
    const latest = await feature.upsertValue({
      featureId: createdFeature.id,
      entityId: 'patient-1',
      value: 12,
      timestamp: '2026-08-12T11:00:00.000Z'
    } as never);
    expect(await feature.findValuesByEntity(createdFeature.id, 'patient-1')).toHaveLength(2);
    expect(await feature.findLatestValue(createdFeature.id, 'patient-1')).toEqual(latest);
    expect(await feature.findLatestValue(createdFeature.id, 'missing')).toBeNull();

    await feature.deleteVector(vector.id);
    await feature.deleteGroup(group.id);
    await feature.deleteFeature(createdFeature.id);
    expect(await feature.listVectors()).toEqual([]);
    expect(await feature.listGroups()).toEqual([]);
    expect(await feature.listFeatures()).toEqual([]);
  });

  it('supports model and version lifecycle with immutable stage history', async () => {
    const { model } = createInMemoryRuntimeRepositories();
    const created = await model.createModel({
      name: 'readmission-risk',
      description: 'Integration model',
      type: 'classification',
      owner: 'clinical-ai'
    } as never);
    expect(await model.findModelById(created.id)).toEqual(created);
    expect(await model.findModelById('missing')).toBeNull();
    expect(await model.listModels()).toEqual([created]);
    const updated = await model.updateModel(created.id, { currentVersion: 2 });
    expect(updated.currentVersion).toBe(2);
    await expect(model.updateModel('missing', {})).rejects.toThrow('not found');

    const version = await model.createVersion({
      modelId: created.id,
      version: 1,
      artifactUri: 's3://models/readmission-risk/1'
    } as never);
    expect(await model.findVersionById(version.id)).toEqual(version);
    expect(await model.findVersionById('missing')).toBeNull();
    expect(await model.findVersionsByModelId(created.id)).toEqual([version]);
    expect(await model.findVersionByModelAndVersion(created.id, 1)).toEqual(version);
    expect(await model.findVersionByModelAndVersion(created.id, 2)).toBeNull();
    const staged = await model.updateVersionStage(version.id, 'production' as never, 'reviewer');
    expect(staged.stageHistory).toContainEqual(
      expect.objectContaining({ from: 'none', to: 'production', by: 'reviewer' })
    );
    expect(version.stageHistory).toEqual([]);
    const measured = await model.updateVersionMetrics(version.id, { accuracy: 0.95 });
    expect(measured.metrics).toEqual({ accuracy: 0.95 });
    await expect(model.updateVersionStage('missing', 'production' as never)).rejects.toThrow(
      'not found'
    );
    await expect(model.updateVersionMetrics('missing', {})).rejects.toThrow('not found');
    await model.deleteModel(created.id);
    expect(await model.listModels()).toEqual([]);
  });

  it('creates branded identifiers without accepting empty values silently', () => {
    expect(createInMemoryCorrelationId('runtime')).toMatch(/^runtime_/);
    expect(createInMemoryModuleName('billing')).toBe('billing');
  });
});
