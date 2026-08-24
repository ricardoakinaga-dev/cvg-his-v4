import assert from 'node:assert/strict';
import { test } from 'vitest';

import { WebhooksService } from './index.js';
import type {
  RetryWebhookDeliveryInput,
  WebhookDeliveryClaim,
  WebhookRepository
} from './index.js';
import type {
  AccountId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;

function createMockRepository(): WebhookRepository {
  const webhooks: Map<string, WebhookSummary> = new Map();

  return {
    async create(webhook: WebhookSummary): Promise<void> {
      webhooks.set(webhook.id, webhook);
    },
    async update(webhook: WebhookSummary): Promise<void> {
      webhooks.set(webhook.id, webhook);
    },
    async delete(_accountId: AccountId, id: WebhookId): Promise<void> {
      webhooks.delete(id as string);
    },
    async findById(accountId: AccountId, id: WebhookId): Promise<WebhookSummary | null> {
      const webhook = webhooks.get(id as string);
      return webhook?.accountId === accountId ? webhook : null;
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

test('WebhooksService enqueue persists pending delivery without network I/O', async () => {
  const createdDeliveries: unknown[] = [];
  const repository = createMockRepository();
  const originalCreateDelivery = repository.createDelivery;
  repository.createDelivery = async (delivery) => {
    createdDeliveries.push(delivery);
    await originalCreateDelivery(delivery);
  };
  const service = new WebhooksService({
    repository,
    deliverRequest: async () => {
      throw new Error('network must not be called by enqueue');
    }
  });
  await service.register('user_1' as never, ACCOUNT_ID, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created']
  });

  const enqueued = await service.enqueue(ACCOUNT_ID, 'billing.record.created', { id: 'bill_1' });

  assert.equal(enqueued, 1);
  assert.equal(createdDeliveries.length, 1);
  assert.equal((createdDeliveries[0] as { status: string }).status, 'pending');
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

test('WebhooksService register normalizes URL and rejects non-HTTP protocols', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created', 'billing.record.created']
  });

  assert.equal(webhook.url, 'https://example.com/webhook');
  assert.deepEqual(webhook.events, ['billing.record.created']);

  await assert.rejects(
    () =>
      service.register('user_1' as never, 'acc_test' as never, {
        url: 'file:///etc/passwd',
        events: ['billing.record.created']
      }),
    /HTTP or HTTPS/
  );
  await assert.rejects(
    () =>
      service.register('user_1' as never, 'acc_test' as never, {
        url: 'http://127.0.0.1/internal',
        events: ['billing.record.created']
      }),
    /private network/
  );
});

test('WebhooksService signs outbound payloads with the configured secret', async () => {
  const repo = createMockRepository();
  let signature = '';
  const service = new WebhooksService({
    repository: repo,
    resolveHostname: async () => ['8.8.8.8'],
    deliverRequest: async (request) => {
      signature = request.headers['X-Webhook-Signature'] ?? '';
      return { success: true, statusCode: 200, body: 'ok' };
    }
  });
  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/webhook',
    events: ['webhook.test'],
    secret: 'delivery-secret'
  });
  const result = await service.test(webhook.id, 'acc_test' as never);
  assert.equal(result?.success, true);
  assert.match(signature, /^sha256=[a-f0-9]{64}$/);
});

test('WebhooksService pins delivery to the public address that was validated', async () => {
  const repo = createMockRepository();
  let deliveredAddress = '';
  let deliveredHostname = '';
  const service = new WebhooksService({
    repository: repo,
    resolveHostname: async () => ['1.1.1.1'],
    deliverRequest: async (request) => {
      deliveredAddress = request.address;
      deliveredHostname = new URL(request.url).hostname;
      return { success: true, statusCode: 204 };
    }
  });
  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://webhooks.example.com/events',
    events: ['webhook.test']
  });

  const result = await service.test(webhook.id, 'acc_test' as never);

  assert.equal(result?.success, true);
  assert.equal(deliveredAddress, '1.1.1.1');
  assert.equal(deliveredHostname, 'webhooks.example.com');
});

test('WebhooksService rejects IPv4-mapped IPv6 private targets after DNS resolution', async () => {
  const repo = createMockRepository();
  let deliveryAttempted = false;
  const service = new WebhooksService({
    repository: repo,
    resolveHostname: async () => ['::ffff:7f00:1'],
    deliverRequest: async () => {
      deliveryAttempted = true;
      return { success: true, statusCode: 200 };
    }
  });
  const webhook = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://webhooks.example.com/events',
    events: ['webhook.test']
  });

  const result = await service.test(webhook.id, 'acc_test' as never);

  assert.equal(result?.success, false);
  assert.equal(deliveryAttempted, false);
});

test('WebhooksService revalidates persisted webhook URLs before sending', async () => {
  const repository = createMockRepository();
  const persistedWebhook: WebhookSummary = {
    id: 'wh_persisted_unsafe' as WebhookId,
    accountId: ACCOUNT_ID,
    url: 'file:///etc/passwd',
    events: ['webhook.test'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await repository.create(persistedWebhook);

  let deliveryAttempted = false;
  const service = new WebhooksService({
    repository,
    resolveHostname: async () => ['8.8.8.8'],
    deliverRequest: async () => {
      deliveryAttempted = true;
      return { success: true, statusCode: 204 };
    }
  });

  const result = await service.test(persistedWebhook.id, ACCOUNT_ID);

  assert.equal(result?.success, false);
  assert.equal(deliveryAttempted, false);
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

  const result = await service.get(ACCOUNT_ID, 'wh_nonexistent' as never);
  assert.equal(result, null);
});

test('WebhooksService get does not expose a webhook to another account', async () => {
  const service = new WebhooksService({ repository: createMockRepository() });
  const webhook = await service.register('user_1' as never, ACCOUNT_ID, {
    url: 'https://example.com/webhook',
    events: ['billing.record.created']
  });

  const result = await service.get('acc_other' as AccountId, webhook.id);
  assert.equal(result, null);
});

test('WebhooksService update modifies webhook fields', async () => {
  const repo = createMockRepository();
  const service = new WebhooksService({ repository: repo });

  const created = await service.register('user_1' as never, 'acc_test' as never, {
    url: 'https://example.com/original',
    events: ['billing.record.created']
  });

  const updated = await service.update(ACCOUNT_ID, created.id, {
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

  const deleted = await service.delete(ACCOUNT_ID, created.id);
  assert.equal(deleted, true);

  const found = await service.get(ACCOUNT_ID, created.id);
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

  const result = await service.retestDelivery(
    'wh_123' as never,
    'del_123' as never,
    'acc_test' as never
  );
  assert.equal(result, null);
});

test('WebhooksService getDeliveryStats returns null when repository is undefined', async () => {
  const service = new WebhooksService({ repository: undefined });

  const result = await service.getDeliveryStats(ACCOUNT_ID, 'wh_123' as never);
  assert.equal(result, null);
});

test('WebhooksService delivery stats count processing and retrying as pending work', async () => {
  const repository = createMockRepository();
  const webhook = await new WebhooksService({ repository }).register(
    'user_1' as never,
    ACCOUNT_ID,
    { url: 'https://example.com/webhook', events: ['billing.record.created'] }
  );
  const statuses: WebhookDeliverySummary['status'][] = [
    'pending',
    'processing',
    'retrying',
    'delivered',
    'failed'
  ];
  repository.findDeliveriesByWebhook = async () =>
    statuses.map((status, index) => ({
      id: `delivery-${index}` as WebhookDeliveryId,
      accountId: ACCOUNT_ID,
      webhookId: webhook.id,
      event: 'billing.record.created',
      payload: {},
      status,
      attempts: 1,
      createdAt: new Date().toISOString()
    }));

  const service = new WebhooksService({ repository });
  assert.deepEqual(await service.getDeliveryStats(ACCOUNT_ID, webhook.id), {
    total: 5,
    pending: 3,
    delivered: 1,
    failed: 1
  });
});

test('WebhooksService processes one claimed delivery and fences stale completion', async () => {
  const repository = createMockRepository();
  const webhook = await new WebhooksService({ repository }).register(
    'user_1' as never,
    ACCOUNT_ID,
    { url: 'https://example.com/webhook', events: ['billing.record.created'] }
  );
  let delivery: WebhookDeliverySummary = {
    id: 'del_claimed' as WebhookDeliveryId,
    accountId: ACCOUNT_ID,
    webhookId: webhook.id,
    event: 'billing.record.created',
    payload: { id: 'bill_1' },
    status: 'pending',
    attempts: 0,
    maxAttempts: 2,
    createdAt: new Date().toISOString()
  };
  let activeClaim: WebhookDeliveryClaim | undefined;
  repository.findById = async (accountId, id) =>
    accountId === ACCOUNT_ID && id === webhook.id ? webhook : null;
  repository.claimPending = async (_accountId, input) => {
    if (delivery.status !== 'pending') return [];
    delivery = { ...delivery, status: 'processing', attempts: delivery.attempts + 1 };
    activeClaim = {
      delivery,
      leaseOwner: input.leaseOwner,
      leaseToken: '00000000-0000-0000-0000-000000000001',
      leaseVersion: 1,
      leaseExpiresAt: new Date(Date.now() + input.leaseMs).toISOString()
    };
    return [activeClaim];
  };
  repository.renewClaim = async (claim) => claim === activeClaim && delivery.status === 'processing';
  repository.completeClaim = async (claim, result) => {
    if (claim !== activeClaim || delivery.status !== 'processing') return false;
    delivery = { ...delivery, ...result, status: 'delivered' };
    return true;
  };
  repository.retryClaim = async (
    _claim: WebhookDeliveryClaim,
    _input: RetryWebhookDeliveryInput,
    _result: WebhookDeliverySummary
  ) => false;
  repository.failClaim = async () => false;

  const service = new WebhooksService({
    repository,
    resolveHostname: async () => ['1.1.1.1'],
    deliverRequest: async () => ({ success: true, statusCode: 204 })
  });

  const result = await service.processPendingDeliveries(ACCOUNT_ID, {
    workerId: 'worker-a',
    leaseMs: 1_000,
    limit: 1
  });

  assert.deepEqual(result, {
    claimed: 1,
    delivered: 1,
    retried: 0,
    failed: 0,
    leaseLost: 0
  });
  assert.equal(delivery.status, 'delivered');
  assert.equal(await repository.completeClaim!(activeClaim!, delivery), false);
});

test('WebhooksService schedules retry instead of looping network attempts in one tick', async () => {
  const repository = createMockRepository();
  const webhook = await new WebhooksService({ repository }).register(
    'user_1' as never,
    ACCOUNT_ID,
    { url: 'https://example.com/webhook', events: ['billing.record.created'] }
  );
  let delivery: WebhookDeliverySummary = {
    id: 'del_retrying' as WebhookDeliveryId,
    accountId: ACCOUNT_ID,
    webhookId: webhook.id,
    event: 'billing.record.created',
    payload: { id: 'bill_2' },
    status: 'pending',
    attempts: 0,
    maxAttempts: 2,
    createdAt: new Date().toISOString()
  };
  let claimVersion = 0;
  let activeClaim: WebhookDeliveryClaim | undefined;
  repository.findById = async () => webhook;
  repository.claimPending = async (_accountId, input) => {
    if (delivery.status !== 'pending') return [];
    delivery = { ...delivery, status: 'processing', attempts: delivery.attempts + 1 };
    activeClaim = {
      delivery,
      leaseOwner: input.leaseOwner,
      leaseToken: `00000000-0000-0000-0000-${String(++claimVersion).padStart(12, '0')}`,
      leaseVersion: claimVersion,
      leaseExpiresAt: new Date(Date.now() + input.leaseMs).toISOString()
    };
    return [activeClaim];
  };
  repository.renewClaim = async () => true;
  repository.completeClaim = async () => false;
  repository.failClaim = async () => false;
  repository.retryClaim = async (_claim, input) => {
    delivery = {
      ...delivery,
      status: 'retrying',
      nextRetryAt: input.scheduledAt,
      responseError: input.error
    };
    return true;
  };

  let networkAttempts = 0;
  const idempotencyKeys: string[] = [];
  const service = new WebhooksService({
    repository,
    resolveHostname: async () => ['1.1.1.1'],
    deliverRequest: async (request) => {
      networkAttempts++;
      idempotencyKeys.push(request.headers['Idempotency-Key'] ?? '');
      return { success: false, statusCode: 503, error: 'upstream unavailable' };
    }
  });

  const result = await service.processPendingDeliveries(ACCOUNT_ID, {
    workerId: 'worker-a',
    leaseMs: 1_000,
    limit: 1
  });

  assert.deepEqual(result, {
    claimed: 1,
    delivered: 0,
    retried: 1,
    failed: 0,
    leaseLost: 0
  });
  assert.equal(networkAttempts, 1);
  assert.deepEqual(idempotencyKeys, [delivery.id]);
  assert.equal(delivery.status, 'retrying');
  assert.ok(delivery.nextRetryAt);
  assert.equal(delivery.responseError, 'upstream unavailable');
});
