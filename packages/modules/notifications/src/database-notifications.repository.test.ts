import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => {
  const rows = new Map<unknown, Array<Record<string, unknown>>>();
  const selectQueue: Array<readonly Record<string, unknown>[]> = [];
  const database = {
    select: vi.fn(() => {
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
        then(
          resolve: (value: readonly Record<string, unknown>[]) => unknown,
          reject: (reason: unknown) => unknown
        ) {
          return Promise.resolve(selectQueue.shift() ?? rows.get(table) ?? []).then(resolve, reject);
        }
      };
      return builder;
    }),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        const tableRows = rows.get(table) ?? [];
        tableRows.push({ ...payload });
        rows.set(table, tableRows);
      })
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((patch: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          for (const row of rows.get(table) ?? []) Object.assign(row, patch);
        })
      }))
    }))
  };
  return { rows, selectQueue, database };
});

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantDrizzle: vi.fn(async (operation: (database: unknown) => Promise<unknown>) =>
    operation(mockState.database))
}));

import { notifications, notificationJobs } from '@cvg-his-v2/shared-database';
import { DatabaseNotificationRepository } from './repositories/database-notifications.repository.js';

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const notificationRow = {
  id: 'notification-1',
  accountId,
  channel: 'internal',
  category: 'billing',
  encounterId: null,
  patientId: null,
  recipientRoleCode: null,
  title: 'Pagamento',
  message: 'Pagamento confirmado',
  severity: 'medium',
  status: 'queued',
  createdByUserId: 'user-1',
  createdAt: timestamp,
  sentAt: null
};
const jobRow = {
  id: 'job-1',
  accountId,
  notificationId: 'notification-1',
  status: 'queued',
  attempts: 0,
  scheduledAt: timestamp,
  processedAt: null
};

beforeEach(() => {
  mockState.rows.clear();
  mockState.selectQueue.length = 0;
  mockState.rows.set(notifications, [{ ...notificationRow }]);
  mockState.rows.set(notificationJobs, [{ ...jobRow }]);
  vi.clearAllMocks();
});

test('DatabaseNotificationRepository covers notification and job CRUD projections', async () => {
  const repository = new DatabaseNotificationRepository({} as never);
  const notification = {
    id: 'notification-1' as never,
    accountId: accountId as never,
    channel: 'internal' as const,
    category: 'billing' as const,
    title: 'Pagamento',
    message: 'Pagamento confirmado',
    severity: 'medium' as const,
    status: 'queued' as const,
    createdByUserId: 'user-1' as never,
    createdAt: timestamp.toISOString()
  };
  await repository.createNotification(notification);
  await repository.updateNotification({
    ...notification,
    encounterId: 'encounter-1' as never,
    patientId: 'patient-1' as never,
    recipientRoleCode: 'finance',
    sentAt: timestamp.toISOString(),
    status: 'sent'
  });
  mockState.selectQueue.push([{ ...notificationRow, status: 'sent', encounterId: 'encounter-1', patientId: 'patient-1', recipientRoleCode: 'finance', sentAt: timestamp }]);
  expect(await repository.findNotificationById('notification-1' as never)).toMatchObject({
    status: 'sent',
    encounterId: 'encounter-1',
    sentAt: timestamp.toISOString()
  });
  mockState.selectQueue.push([{ ...notificationRow }, { ...notificationRow, status: 'sent' }]);
  expect(await repository.findNotifications(accountId as never)).toHaveLength(2);
  mockState.selectQueue.push([{ ...notificationRow }]);
  expect(await repository.findNotifications(accountId as never, 'queued')).toHaveLength(1);
  mockState.selectQueue.push([{ ...notificationRow, status: 'sent' }]);
  expect(await repository.findNotifications('' as never, 'sent')).toHaveLength(1);
  mockState.rows.set(notifications, []);
  expect(await repository.findNotificationById('missing' as never)).toBeNull();

  await repository.createJob({
    id: 'job-1' as never,
    accountId: accountId as never,
    notificationId: 'notification-1' as never,
    status: 'queued',
    attempts: 0,
    scheduledAt: timestamp.toISOString()
  });
  await repository.updateJob({
    id: 'job-1' as never,
    accountId: accountId as never,
    notificationId: 'notification-1' as never,
    status: 'processed',
    attempts: 1,
    scheduledAt: timestamp.toISOString(),
    processedAt: timestamp.toISOString()
  });
  mockState.selectQueue.push([{ ...jobRow, status: 'processed', attempts: 1, processedAt: timestamp }]);
  expect(await repository.findJobById('job-1' as never)).toMatchObject({ status: 'processed', attempts: 1 });
  mockState.selectQueue.push([{ ...jobRow }, { ...jobRow, status: 'processed', attempts: 1, processedAt: timestamp }]);
  expect(await repository.findJobs(accountId as never)).toHaveLength(2);
  mockState.selectQueue.push([{ ...jobRow }]);
  expect(await repository.findJobs(accountId as never, 'queued')).toHaveLength(1);
  mockState.selectQueue.push([{ ...jobRow, status: 'processed', attempts: 1, processedAt: timestamp }]);
  expect(await repository.findJobs('' as never, 'processed')).toHaveLength(1);
  mockState.selectQueue.push([{ ...jobRow }]);
  expect(await repository.findQueuedJobs(accountId as never, 10)).toHaveLength(1);
  mockState.rows.set(notificationJobs, []);
  expect(await repository.findJobById('missing' as never)).toBeNull();
});

test('DatabaseNotificationRepository maps nullable rows and empty result sets safely', async () => {
  const repository = new DatabaseNotificationRepository({} as never);
  mockState.rows.set(notifications, [{
    ...notificationRow,
    encounterId: 'encounter-1',
    patientId: 'patient-1',
    recipientRoleCode: 'doctor',
    createdByUserId: null,
    sentAt: timestamp
  }]);
  expect(await repository.findNotifications(accountId as never, 'queued')).toEqual([
    expect.objectContaining({
      encounterId: 'encounter-1',
      patientId: 'patient-1',
      recipientRoleCode: 'doctor',
      sentAt: timestamp.toISOString()
    })
  ]);
  mockState.rows.set(notificationJobs, [{ ...jobRow, processedAt: timestamp }]);
  expect(await repository.findQueuedJobs(accountId as never, 1)).toEqual([
    expect.objectContaining({ processedAt: timestamp.toISOString() })
  ]);
});
