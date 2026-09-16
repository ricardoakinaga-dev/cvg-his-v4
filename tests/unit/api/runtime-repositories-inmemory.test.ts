import { describe, expect, test } from 'vitest';

import {
  createInMemoryCorrelationId,
  createInMemoryModuleName,
  createInMemoryRuntimeRepositories
} from '../../../apps/api/src/runtime-repositories.js';

const accountId = 'account-1';
const otherAccountId = 'account-2';
const now = new Date().toISOString();
const earlier = new Date(Date.now() - 1_000).toISOString();

function createOutboxEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    accountId,
    correlationId: createInMemoryCorrelationId('correlation'),
    moduleName: createInMemoryModuleName('tests'),
    eventType: 'test.event',
    payload: { id },
    status: 'pending',
    attempts: 0,
    maxAttempts: 4,
    scheduledAt: earlier,
    processedAt: null,
    error: null,
    createdAt: earlier,
    ...overrides
  } as never;
}

describe('in-memory runtime repositories', () => {
  test('covers API key lifecycle, expiry, prefix and usage history', async () => {
    const repository = createInMemoryRuntimeRepositories().apiKey;
    const active = {
      id: 'key-1',
      accountId,
      name: 'Primary',
      keyPrefix: 'cvg_live',
      keyHash: 'hash-1',
      scopes: ['read'],
      isActive: true,
      expiresAt: null,
      createdAt: earlier,
      updatedAt: earlier
    } as never;
    const inactive = { ...active, id: 'key-2', isActive: false } as never;
    const expired = {
      ...active,
      id: 'key-3',
      expiresAt: new Date(Date.now() - 10_000).toISOString()
    } as never;
    await repository.create(active);
    await repository.create(inactive);
    await repository.create(expired);

    expect(await repository.findById('missing' as never)).toBeNull();
    expect(await repository.findByAccount(accountId)).toHaveLength(3);
    expect(await repository.findByAccount(otherAccountId)).toEqual([]);
    expect(await repository.findByPrefix('cvg_live')).toEqual([
      expect.objectContaining({ id: 'key-1' }),
      expect.objectContaining({ id: 'key-3' })
    ]);
    expect(await repository.findActiveById('key-1' as never)).toMatchObject({ id: 'key-1' });
    expect(await repository.findActiveById('key-2' as never)).toBeNull();
    expect(await repository.findActiveById('key-3' as never)).toBeNull();
    await repository.update({ ...active, name: 'Updated' } as never);
    expect(await repository.findById('key-1' as never)).toMatchObject({ name: 'Updated' });
    await repository.incrementUsage('key-1', new Date(earlier));
    await repository.incrementUsage('key-1', new Date(earlier));
    expect(await repository.getUsageCount('key-1', new Date(earlier))).toBe(2);
    expect(await repository.getUsageCount('missing', new Date(earlier))).toBe(0);
    await repository.recordUsage({ apiKeyId: 'key-1', createdAt: now } as never);
    await repository.recordUsage({ apiKeyId: 'key-1', createdAt: earlier } as never);
    expect(await repository.getUsageHistory('key-1', 1)).toHaveLength(1);
    await repository.delete('key-2' as never);
    expect(await repository.findById('key-2' as never)).toBeNull();
  });

  test('enforces outbox administrative bounds and tenant filtering', async () => {
    const repository = createInMemoryRuntimeRepositories().outbox;
    const correlation = createInMemoryCorrelationId('query');
    const first = createOutboxEvent('event-1', { correlationId: correlation });
    const second = createOutboxEvent('event-2', { status: 'retrying', correlationId: correlation });
    const completed = createOutboxEvent('event-completed', { status: 'completed' });
    const failed = createOutboxEvent('event-failed', { status: 'failed' });
    const foreign = createOutboxEvent('event-foreign', { accountId: otherAccountId });
    await Promise.all([first, second, completed, failed, foreign].map((event) => repository.create(event)));

    await expect(repository.findById('' as never, 'event-1')).rejects.toThrow(/accountId/);
    await expect(repository.peekPending(accountId as never, 0)).rejects.toThrow(/between/);
    await expect(repository.findFailed(accountId as never, 201)).rejects.toThrow(/between/);
    await expect(repository.findByCorrelationId(accountId as never, correlation, 0)).rejects.toThrow(/between/);
    expect(await repository.findById(accountId as never, 'event-1')).toMatchObject({ id: 'event-1' });
    expect(await repository.findById(accountId as never, 'event-foreign')).toBeNull();
    expect(await repository.peekPending(accountId as never, 10)).toHaveLength(2);
    expect(await repository.findPending(accountId as never, 10)).toHaveLength(2);
    expect(await repository.findByCorrelationId(accountId as never, correlation, 10)).toHaveLength(2);
    expect(await repository.findFailed(accountId as never, 10)).toEqual([
      expect.objectContaining({ id: 'event-failed' })
    ]);
    expect(await repository.countByStatus(accountId as never)).toEqual({
      pending: 1,
      retrying: 1,
      completed: 1,
      failed: 1,
      total: 4
    });
  });

  test('fences outbox claims, supports retry/reprocess and handles expired leases', async () => {
    const repository = createInMemoryRuntimeRepositories().outbox;
    await repository.create(createOutboxEvent('event-lease'));
    const [claim] = await repository.claimPending({ limit: 1, leaseOwner: 'worker-a', leaseMs: 60_000 });
    expect(claim).toBeDefined();
    expect(await repository.renewClaim({ ...claim!, leaseOwner: 'worker-b' }, 60_000)).toBe(false);
    expect(await repository.renewClaim({ ...claim!, leaseToken: 'wrong' }, 60_000)).toBe(false);
    expect(await repository.renewClaim(claim!, 60_000)).toBe(true);
    expect(await repository.completeClaim({ ...claim!, leaseVersion: claim!.leaseVersion + 1 }, now)).toBe(false);
    expect(await repository.retryClaim(claim!, { scheduledAt: earlier, error: 'temporary' })).toBe(true);
    expect(await repository.completeClaim(claim!, now)).toBe(false);
    expect(await repository.reprocess(otherAccountId as never, 'event-lease')).toBeNull();
    expect(await repository.reprocess(accountId as never, 'event-lease')).toMatchObject({
      status: 'pending',
      attempts: 0,
      error: null
    });

    const [expiredClaim] = await repository.claimPending({ limit: 1, leaseOwner: 'worker-a', leaseMs: -1 });
    expect(expiredClaim).toBeDefined();
    expect(await repository.completeClaim(expiredClaim!, now)).toBe(false);
    expect(await repository.renewClaim(expiredClaim!, 60_000)).toBe(false);
    expect(await repository.claimPending({ limit: 1, leaseOwner: 'worker-a', leaseMs: 60_000 })).toHaveLength(1);

    const second = createOutboxEvent('event-update');
    await repository.create(second);
    const [secondClaim] = await repository.claimPending({ limit: 1, leaseOwner: 'worker-a', leaseMs: 60_000 });
    await expect(repository.update({ ...second, status: 'pending' } as never)).rejects.toThrow(/processing/);
    expect(await repository.failClaim(secondClaim!, 'terminal')).toBe(true);
    expect(await repository.reprocess(accountId as never, 'event-update')).toMatchObject({ status: 'pending' });
    const [reprocessedClaim] = await repository.claimPending({ limit: 1, leaseOwner: 'worker-a', leaseMs: 60_000 });
    expect(await repository.completeClaim(reprocessedClaim!, now)).toBe(true);
  });

  test('covers in-memory webhook, feature/vector/value and model/version repositories', async () => {
    const runtime = createInMemoryRuntimeRepositories();
    const webhook = runtime.webhook;
    const webhookRecord = {
      id: 'webhook-1', accountId, url: 'https://example.test/hook', events: ['patient.created'],
      isActive: true, createdAt: earlier, updatedAt: earlier
    } as never;
    await webhook.create(webhookRecord);
    await webhook.create({ ...webhookRecord, id: 'webhook-2', isActive: false } as never);
    expect(await webhook.findById(accountId as never, 'webhook-1' as never)).toMatchObject({ isActive: true });
    expect(await webhook.findById(otherAccountId as never, 'webhook-1' as never)).toBeNull();
    expect(await webhook.findByAccount(accountId as never)).toHaveLength(2);
    expect(await webhook.findActiveByEvent(accountId as never, 'patient.created')).toHaveLength(1);
    await webhook.update({ ...webhookRecord, isActive: false } as never);
    await webhook.delete(accountId as never, 'webhook-2' as never);
    await webhook.delete(otherAccountId as never, 'webhook-1' as never);
    await webhook.createDelivery({
      id: 'delivery-1', accountId, webhookId: 'webhook-1', event: 'patient.created', payload: {},
      status: 'pending', attempts: 0, maxAttempts: 3, createdAt: now
    } as never);
    await webhook.createDelivery({
      id: 'delivery-2', accountId, webhookId: 'webhook-1', event: 'patient.created', payload: {},
      status: 'completed', attempts: 1, maxAttempts: 3, createdAt: earlier
    } as never);
    expect(await webhook.findDeliveriesByWebhook(accountId as never, 'webhook-1' as never)).toHaveLength(2);
    expect(await webhook.findPendingDeliveries(accountId as never, 1)).toHaveLength(1);
    await webhook.updateDelivery({
      id: 'delivery-1', accountId, webhookId: 'webhook-1', event: 'patient.created', payload: {},
      status: 'failed', attempts: 1, maxAttempts: 3, createdAt: now
    } as never);
    await webhook.deleteDeliveriesByWebhook(accountId as never, 'webhook-1' as never);
    expect(await webhook.findDeliveriesByWebhook(accountId as never, 'webhook-1' as never)).toEqual([]);

    const feature = runtime.feature;
    const createdFeature = await feature.createFeature({ name: 'weight', group: 'clinical', dataType: 'number' });
    expect(await feature.findFeaturesByGroup('clinical')).toHaveLength(1);
    expect(await feature.findFeatureById('missing')).toBeNull();
    await feature.updateFeature(createdFeature.id, { description: 'Animal weight' });
    const group = await feature.createGroup({ name: 'Clinical', entityType: 'patient' });
    expect(await feature.findGroupsByEntityType('patient')).toHaveLength(1);
    expect(await feature.findGroupById('missing')).toBeNull();
    await feature.deleteGroup(group.id);
    const vector = await feature.createVector({ name: 'Patient vector', features: [createdFeature.id], entityType: 'patient', entityId: 'patient-1' });
    expect(await feature.findVectorsByEntity('patient', 'patient-1')).toHaveLength(1);
    await feature.updateVector(vector.id, { values: { weight: 12 } });
    expect(await feature.findVectorById(vector.id)).toMatchObject({ values: { weight: 12 } });
    await feature.upsertValue({ featureId: createdFeature.id, entityId: 'patient-1', value: 10, timestamp: earlier });
    const latest = await feature.upsertValue({ featureId: createdFeature.id, entityId: 'patient-1', value: 12, timestamp: now });
    expect(await feature.findLatestValue(createdFeature.id, 'patient-1')).toEqual(latest);
    expect(await feature.findLatestValue('missing', 'patient-1')).toBeNull();
    await feature.deleteFeature(createdFeature.id);
    await feature.deleteVector(vector.id);

    const model = runtime.model;
    const createdModel = await model.createModel({ name: 'Triage', algorithm: 'classification' });
    expect(await model.findModelById('missing')).toBeNull();
    expect(await model.listModels(1, 0)).toHaveLength(1);
    await model.updateModel(createdModel.id, { description: 'Risk model' });
    const version = await model.createVersion({ modelId: createdModel.id, version: 1, artifactUri: 's3://model' });
    expect(await model.findVersionsByModelId(createdModel.id)).toHaveLength(1);
    expect(await model.findVersionByModelAndVersion(createdModel.id, 1)).toEqual(version);
    expect(await model.findVersionById('missing')).toBeNull();
    await model.updateVersionStage(version.id, 'staging', 'ml-owner');
    await model.updateVersionStage(version.id, 'production');
    expect(await model.updateVersionMetrics(version.id, { accuracy: 0.98 })).toMatchObject({ metrics: { accuracy: 0.98 } });
    await model.deleteModel(createdModel.id);
    expect(await model.findModelById(createdModel.id)).toBeNull();
  });
});
