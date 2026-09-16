import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  selectRows: undefined as readonly Record<string, unknown>[] | undefined,
  executeRows: [] as Array<{ rowCount: number; rows: readonly Record<string, unknown>[] }>
}));

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return {
    ...actual,
    getPool: vi.fn(),
    getTenantTransactionContext: vi.fn()
  };
});

vi.mock('@cvg-his-v2/tenant-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/tenant-context')>();
  return {
    ...actual,
    withTenantQueryExplicit: vi.fn(async (pool: unknown, _accountId: unknown, fn: (client: unknown) => Promise<unknown>) =>
      fn(pool))
  };
});

import { getPool } from '@cvg-his-v2/shared-database';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { webhookDeliveries, webhooks } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import { DatabaseWebhookRepository } from './repositories/database-webhook.repository.js';

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const pool = { query };
const operations: string[] = [];

const webhookRow = {
  id: 'webhook-1',
  accountId,
  url: 'https://example.test/hook',
  events: ['patient.created'],
  secret: null,
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp
};

const deliveryRow = {
  id: 'delivery-1',
  accountId,
  webhookId: 'webhook-1',
  event: 'patient.created',
  payload: { patientId: 'patient-1' },
  status: 'pending',
  attempts: 0,
  maxAttempts: 4,
  lastAttemptAt: null,
  responseStatus: null,
  responseBody: null,
  responseError: null,
  nextRetryAt: null,
  deadLetteredAt: null,
  createdAt: timestamp
};

const rawClaimRow = {
  id: 'delivery-1',
  account_id: accountId,
  webhook_id: 'webhook-1',
  event: 'patient.created',
  payload: { patientId: 'patient-1' },
  status: 'processing',
  attempts: 1,
  max_attempts: 4,
  last_attempt_at: timestamp,
  response_status: 202,
  response_body: 'accepted',
  response_error: null,
  next_retry_at: null,
  dead_lettered_at: null,
  created_at: timestamp,
  lease_owner: 'worker-1',
  lease_token: '00000000-0000-4000-8000-000000000001',
  lease_expires_at: timestamp,
  lease_version: 2
};

const delivery = {
  id: 'delivery-1' as never,
  accountId: accountId as never,
  webhookId: 'webhook-1' as never,
  event: 'patient.created',
  payload: { patientId: 'patient-1' },
  status: 'processing' as const,
  attempts: 1,
  maxAttempts: 4,
  lastAttemptAt: timestamp.toISOString(),
  responseStatus: 202,
  responseBody: 'accepted',
  responseError: undefined,
  nextRetryAt: undefined,
  deadLetteredAt: undefined,
  createdAt: timestamp.toISOString()
};

const claim = {
  delivery,
  leaseOwner: 'worker-1',
  leaseToken: '00000000-0000-4000-8000-000000000001',
  leaseVersion: 2,
  leaseExpiresAt: timestamp.toISOString()
};

function makeDatabaseDouble() {
  const defaultRows = (table: unknown) => table === webhooks ? [webhookRow] : [deliveryRow];
  const makeSelect = () => {
    let table: unknown;
    const builder = {
      from(nextTable: unknown) {
        table = nextTable;
        return builder;
      },
      where() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit() {
        return builder;
      },
      then(resolve: (value: readonly Record<string, unknown>[]) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(mockState.selectRows ?? defaultRows(table)).then(resolve, reject);
      }
    };
    return builder;
  };
  return {
    select: vi.fn(() => makeSelect()),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async () => {
        operations.push(`insert:${table === webhooks ? 'webhook' : 'delivery'}`);
      })
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => {
          operations.push(`update:${table === webhooks ? 'webhook' : 'delivery'}`);
        })
      }))
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn(async () => {
        operations.push(`delete:${table === webhooks ? 'webhook' : 'delivery'}`);
      })
    }))
  };
}

function nextQuery(result: { rowCount?: number; rows?: readonly Record<string, unknown>[] } = {}) {
  mockState.executeRows.push({ rowCount: result.rowCount ?? 1, rows: result.rows ?? [] });
}

beforeEach(() => {
  mockState.selectRows = undefined;
  mockState.executeRows = [];
  query.mockReset();
  operations.length = 0;
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantQueryExplicit).mockImplementation(
    async (client, _accountId, fn) => fn(client as never)
  );
  query.mockImplementation(async () => mockState.executeRows.shift() ?? { rowCount: 1, rows: [] });
});

test('DatabaseWebhookRepository covers CRUD, filters and delivery projections', async () => {
  const db = makeDatabaseDouble();
  const repository = new DatabaseWebhookRepository(db as unknown as DatabaseClient);

  await repository.create({
    id: 'webhook-1' as never,
    accountId: accountId as never,
    url: webhookRow.url,
    events: webhookRow.events,
    secret: undefined,
    isActive: true,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  });
  await repository.update({
    id: 'webhook-1' as never,
    accountId: accountId as never,
    url: webhookRow.url,
    events: webhookRow.events,
    secret: 'secret',
    isActive: false,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  });
  await repository.delete(accountId as never, 'webhook-1' as never);
  mockState.selectRows = [];
  expect(await repository.findById(accountId as never, 'missing' as never)).toBeNull();
  mockState.selectRows = [webhookRow];
  expect(await repository.findById(accountId as never, 'webhook-1' as never)).toMatchObject({
    id: 'webhook-1',
    secret: undefined
  });
  mockState.selectRows = [webhookRow, { ...webhookRow, id: 'webhook-2', isActive: false, events: ['other'] }];
  expect(await repository.findByAccount(accountId as never)).toHaveLength(2);
  expect(await repository.findActiveByEvent(accountId as never, 'patient.created')).toHaveLength(1);

  await repository.createDelivery({ ...delivery, maxAttempts: undefined });
  await repository.updateDelivery({ ...delivery, status: 'retrying', lastAttemptAt: undefined, nextRetryAt: undefined });
  await repository.deleteDeliveriesByWebhook(accountId as never, 'webhook-1' as never);
  mockState.selectRows = [deliveryRow];
  expect(await repository.findDeliveriesByWebhook(accountId as never, 'webhook-1' as never)).toMatchObject([
    { id: 'delivery-1', attempts: 0, lastAttemptAt: undefined }
  ]);
  expect(await repository.findPendingDeliveries(accountId as never, 10)).toHaveLength(1);
  expect(operations).toEqual(expect.arrayContaining([
    'insert:webhook', 'update:webhook', 'delete:webhook', 'insert:delivery', 'update:delivery', 'delete:delivery'
  ]));
});

test('DatabaseWebhookRepository enforces leases and fencing on delivery claims', async () => {
  const db = makeDatabaseDouble();
  const repository = new DatabaseWebhookRepository(db as unknown as DatabaseClient);

  await expect(repository.claimPending(accountId as never, { limit: 0, leaseMs: 1000, leaseOwner: 'worker-1' })).rejects.toThrow(/claim limit/);
  await expect(repository.claimPending(accountId as never, { limit: 1, leaseMs: 999, leaseOwner: 'worker-1' })).rejects.toThrow(/lease duration/);
  await expect(repository.claimPending(accountId as never, { limit: 1, leaseMs: 1000, leaseOwner: ' worker-1' })).rejects.toThrow(/worker id/);
  await expect(repository.claimPending(accountId as never, { limit: 1, leaseMs: 1000, leaseOwner: 'worker/1' })).rejects.toThrow(/worker id/);

  nextQuery();
  nextQuery({ rows: [rawClaimRow] });
  const claims = await repository.claimPending(accountId as never, { limit: 1, leaseMs: 30_000, leaseOwner: 'worker-1' });
  expect(claims[0]).toMatchObject({ leaseOwner: 'worker-1', leaseVersion: 2, delivery: { id: 'delivery-1' } });
  nextQuery();
  nextQuery({ rows: [{ ...rawClaimRow, lease_expires_at: timestamp.toISOString(), lease_version: 3 }] });
  expect((await repository.claimPending(accountId as never, { limit: 1, leaseMs: 30_000, leaseOwner: 'worker-1' }))[0]?.leaseVersion).toBe(3);
  nextQuery();
  nextQuery({ rows: [{ ...rawClaimRow, lease_token: null }] });
  await expect(repository.claimPending(accountId as never, { limit: 1, leaseMs: 30_000, leaseOwner: 'worker-1' })).rejects.toThrow(/invalid lease/);

  await expect(repository.renewClaim(claim, 999)).rejects.toThrow(/lease duration/);
  nextQuery({ rowCount: 1 });
  expect(await repository.renewClaim(claim, 30_000)).toBe(true);
  nextQuery({ rowCount: 0 });
  expect(await repository.renewClaim(claim, 30_000)).toBe(false);

  nextQuery({ rowCount: 1 });
  expect(await repository.completeClaim(claim, delivery)).toBe(true);
  nextQuery({ rowCount: 1 });
  expect(await repository.retryClaim(claim, { error: 'temporary', scheduledAt: timestamp.toISOString() }, delivery)).toBe(true);
  nextQuery({ rowCount: 0 });
  expect(await repository.failClaim(claim, { ...delivery, responseError: 'permanent', deadLetteredAt: timestamp.toISOString() })).toBe(false);
  nextQuery({ rowCount: 1 });
  expect(await repository.requeueDelivery(accountId as never, delivery.id)).toBe(true);
  nextQuery({ rowCount: 0 });
  expect(await repository.requeueDelivery(accountId as never, delivery.id)).toBe(false);
});
