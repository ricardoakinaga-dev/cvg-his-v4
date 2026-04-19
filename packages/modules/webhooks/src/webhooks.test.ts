import assert from 'node:assert/strict';
import test from 'node:test';

import { WebhooksService } from './index.js';
import type { WebhookRepository } from './index.js';
import type { WebhookSummary } from '@cvg-his-v2/shared-types';

function createMockRepository(): WebhookRepository {
  const webhooks: Map<string, WebhookSummary> = new Map();

  return {
    async create(webhook: WebhookSummary): Promise<void> {
      webhooks.set(webhook.id, webhook);
    },
    async update(webhook: WebhookSummary): Promise<void> {
      webhooks.set(webhook.id, webhook);
    },
    async delete(id: never): Promise<void> {
      webhooks.delete(id as string);
    },
    async findById(id: never): Promise<WebhookSummary | null> {
      return webhooks.get(id as string) ?? null;
    },
    async findByAccount(): Promise<readonly WebhookSummary[]> {
      return Array.from(webhooks.values());
    },
    async findActiveByEvent(): Promise<readonly WebhookSummary[]> {
      return Array.from(webhooks.values()).filter((w) => w.isActive);
    },
    async createDelivery(): Promise<void> {},
    async updateDelivery(): Promise<void> {},
    async deleteDeliveriesByWebhook(): Promise<void> {},
    async findDeliveriesByWebhook(): Promise<readonly never[]> {
      return [];
    },
    async findPendingDeliveries(): Promise<readonly never[]> {
      return [];
    }
  };
}

test('WebhooksService dispatch returns 0 when no webhooks registered', async () => {
  const service = new WebhooksService({ repository: createMockRepository() });

  const dispatched = await service.dispatch('acc_test' as never, 'billing.record.created', {
    id: '123'
  });

  assert.equal(dispatched, 0);
});

test('WebhooksService dispatch returns 0 when repository is undefined', async () => {
  const service = new WebhooksService({ repository: undefined });

  const dispatched = await service.dispatch('acc_test' as never, 'billing.record.created', {
    id: '123'
  });

  assert.equal(dispatched, 0);
});

test('WebhooksService register creates webhook in repository', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created']
  });

  assert.equal(webhook.url, 'https://example.com/webhook');
  assert.deepEqual(webhook.events, ['billing.record.created']);
  assert.equal(webhook.isActive, true);
});

test('WebhooksService register returns webhook even without repository', async () => {
  const service = new WebhooksService({ repository: undefined });

  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created']
  });

  assert.equal(webhook.url, 'https://example.com/webhook');
  assert.equal(webhook.isActive, true);
});

test('WebhooksService list returns webhooks for account', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook1',
    events: ['billing.record.created']
  });

  await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook2',
    events: ['billing.status_changed']
  });

  const list = await service.list('acc_test' as never);
  assert.equal(list.length, 2);
});

test('WebhooksService get returns null for non-existent webhook', async () => {
  const service = new WebhooksService({ repository: undefined });

  const result = await service.get('wh_nonexistent' as never);
  assert.equal(result, null);
});

test('WebhooksService update modifies webhook fields', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const created = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/original',
    events: ['billing.record.created']
  });

  const updated = await service.update(created.id, {
    url: 'https://example.com/updated',
    events: ['billing.status_changed']
  });

  assert.ok(updated);
  assert.equal(updated!.url, 'https://example.com/updated');
  assert.deepEqual(updated!.events, ['billing.status_changed']);
});

test('WebhooksService delete deactivates webhook', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const created = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created']
  });

  const deleted = await service.delete(created.id);
  assert.equal(deleted, true);

  const found = await service.get(created.id);
  assert.ok(found);
  assert.equal(found!.isActive, false);
});

test('WebhooksService test returns null for non-existent webhook', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const result = await service.test('wh_nonexistent' as never, 'acc_test' as never);
  assert.equal(result, null);
});

test('WebhooksService test returns null when repository is undefined', async () => {
  const service = new WebhooksService({ repository: undefined });

  const result = await service.test('wh_123' as never, 'acc_test' as never);
  assert.equal(result, null);
});

test('WebhooksService retestDelivery returns null for non-existent webhook', async () => {
  const service = new WebhooksService({ repository: undefined });

  const result = await service.retestDelivery('wh_123' as never, 'del_123' as never, 'acc_test' as never);
  assert.equal(result, null);
});

test('WebhooksService getDeliveryStats returns null when repository is undefined', async () => {
  const service = new WebhooksService({ repository: undefined });

  const result = await service.getDeliveryStats('wh_123' as never);
  assert.equal(result, null);
});
