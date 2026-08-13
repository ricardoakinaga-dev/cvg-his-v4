import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotificationsService } from './index.js';

test('NotificationsService: create notification returns notification with queued status', async () => {
  const notifications = new NotificationsService();

  const notification = await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'medium',
    title: 'Test notification',
    message: 'This is a test'
  });

  assert.match(notification.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(notification.status, 'queued');
  assert.equal(notification.title, 'Test notification');
  assert.equal(notification.severity, 'medium');
});

test('NotificationsService: processPending moves notifications to sent', async () => {
  const notifications = new NotificationsService();

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'low',
    title: 'Test 1',
    message: 'Message 1'
  });

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'operations',
    severity: 'high',
    title: 'Test 2',
    message: 'Message 2'
  });

  const queued = notifications.list('queued');
  assert.equal(queued.length, 2);

  const processed = notifications.processPending({ limit: 10 });
  assert.equal(processed.length, 2);

  const sent = notifications.list('sent');
  assert.equal(sent.length, 2);

  const stillQueued = notifications.list('queued');
  assert.equal(stillQueued.length, 0);
});

test('NotificationsService: processPending respects limit', async () => {
  const notifications = new NotificationsService();

  for (let i = 0; i < 5; i++) {
    await notifications.create('user_1' as never, 'acc_1' as never, {
      category: 'system',
      severity: 'low',
      title: `Test ${i}`,
      message: `Message ${i}`
    });
  }

  const processed = notifications.processPending({ limit: 2 });
  assert.equal(processed.length, 2);

  const remaining = notifications.list('queued');
  assert.equal(remaining.length, 3);
});

test('NotificationsService: list filters by status', async () => {
  const notifications = new NotificationsService();

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'medium',
    title: 'Queued',
    message: 'Test'
  });

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'operations',
    severity: 'high',
    title: 'To Send',
    message: 'Test'
  });

  notifications.processPending({ limit: 1 });

  const queued = notifications.list('queued');
  const sent = notifications.list('sent');

  assert.equal(queued.length, 1);
  assert.equal(sent.length, 1);
});

test('NotificationsService: listJobs returns job entries', async () => {
  const notifications = new NotificationsService();

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'low',
    title: 'Test',
    message: 'Test message'
  });

  notifications.processPending({ limit: 1 });

  const jobs = notifications.listJobs();
  assert.ok(jobs.length >= 1);
  assert.equal(jobs[0].status, 'processed');
});

test('NotificationsService: notifications support all categories', async () => {
  const notifications = new NotificationsService();

  const categories = ['billing', 'inventory', 'operations', 'system'] as const;

  for (const category of categories) {
    const n = await notifications.create('user_1' as never, 'acc_1' as never, {
      category,
      severity: 'low',
      title: `Test ${category}`,
      message: 'Test'
    });
    assert.equal(n.category, category);
  }
});

test('NotificationsService: notifications support all severity levels', async () => {
  const notifications = new NotificationsService();

  const severities = ['low', 'medium', 'high'] as const;

  for (const severity of severities) {
    const n = await notifications.create('user_1' as never, 'acc_1' as never, {
      category: 'system',
      severity,
      title: `Test ${severity}`,
      message: 'Test'
    });
    assert.equal(n.severity, severity);
  }
});

test('NotificationsService: repository-backed list and processing stay account-scoped', async () => {
  const notificationsStore = new Map();
  const jobsStore = new Map();
  const repository = {
    async createNotification(notification: any) {
      notificationsStore.set(notification.id, notification);
    },
    async updateNotification(notification: any) {
      notificationsStore.set(notification.id, notification);
    },
    async findNotificationById(id: any) {
      return notificationsStore.get(id) ?? null;
    },
    async findNotifications(accountId: any, status: any) {
      return Array.from(notificationsStore.values()).filter(
        (item) =>
          (!accountId || item.accountId === accountId) && (!status || item.status === status)
      );
    },
    async createJob(job: any) {
      jobsStore.set(job.id, job);
    },
    async updateJob(job: any) {
      jobsStore.set(job.id, job);
    },
    async findJobById(id: any) {
      return jobsStore.get(id) ?? null;
    },
    async findJobs(accountId: any, status: any) {
      return Array.from(jobsStore.values()).filter(
        (item) =>
          (!accountId || item.accountId === accountId) && (!status || item.status === status)
      );
    },
    async findQueuedJobs(limit: any, accountId: any) {
      return Array.from(jobsStore.values())
        .filter((item) => item.status === 'queued' && (!accountId || item.accountId === accountId))
        .slice(0, limit);
    }
  };
  const notifications = new NotificationsService({ notificationRepository: repository as never });

  const first = await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'system',
    severity: 'low',
    title: 'A1',
    message: 'Mensagem A1'
  });
  await notifications.create('user_2' as never, 'acc_2' as never, {
    category: 'system',
    severity: 'high',
    title: 'B1',
    message: 'Mensagem B1'
  });

  const scopedList = await notifications.listFromRepository('queued', 'acc_1' as never);
  assert.equal(scopedList.length, 1);
  assert.equal(scopedList[0].id, first.id);

  const processed = await notifications.processPendingFromRepository(
    { limit: 10 },
    'acc_1' as never
  );
  assert.equal(processed.length, 1);
  assert.equal(processed[0].id, first.id);

  const acc1Jobs = await notifications.listJobsFromRepository(undefined, 'acc_1' as never);
  const acc2Jobs = await notifications.listJobsFromRepository(undefined, 'acc_2' as never);
  assert.equal(acc1Jobs.length, 1);
  assert.equal(acc2Jobs.length, 1);
  assert.equal(acc1Jobs[0].status, 'processed');
  assert.equal(acc2Jobs[0].status, 'queued');
});

test('NotificationsService: processPending fires onNotificationSent callback', async () => {
  let callbackInvocation: any = null;
  const notifications = new NotificationsService({
    async onNotificationSent(notification) {
      callbackInvocation = notification;
    }
  });

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'medium',
    title: 'Webhook Test',
    message: 'Should trigger callback'
  });

  const processed = notifications.processPending({ limit: 10 });
  assert.equal(processed.length, 1);
  assert.equal(processed[0].status, 'sent');
  assert.ok(callbackInvocation !== null);
  assert.equal(callbackInvocation.id, processed[0].id);
  assert.equal(callbackInvocation.status, 'sent');
  assert.equal(callbackInvocation.accountId, 'acc_1');
});

test('NotificationsService: processPendingFromRepository fires onNotificationSent callback', async () => {
  const notificationsStore = new Map();
  const jobsStore = new Map();
  let callbackInvocation: any = null;
  const repository = {
    async createNotification(notification: any) { notificationsStore.set(notification.id, notification); },
    async updateNotification(notification: any) { notificationsStore.set(notification.id, notification); },
    async findNotificationById(id: any) { return notificationsStore.get(id) ?? null; },
    async findNotifications() { return Array.from(notificationsStore.values()); },
    async createJob(job: any) { jobsStore.set(job.id, job); },
    async updateJob(job: any) { jobsStore.set(job.id, job); },
    async findJobById(id: any) { return jobsStore.get(id) ?? null; },
    async findJobs() { return Array.from(jobsStore.values()); },
    async findQueuedJobs(limit: any) {
      return Array.from(jobsStore.values()).filter((i: any) => i.status === 'queued').slice(0, limit);
    }
  };
  const notifications = new NotificationsService({
    notificationRepository: repository as never,
    async onNotificationSent(notification) { callbackInvocation = notification; }
  });

  await notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'operations',
    severity: 'high',
    title: 'Repo Callback Test',
    message: 'Should trigger via repository path'
  });

  const processed = await notifications.processPendingFromRepository({ limit: 10 });
  assert.equal(processed.length, 1);
  assert.equal(processed[0].status, 'sent');
  assert.ok(callbackInvocation !== null);
  assert.equal(callbackInvocation.id, processed[0].id);
});
