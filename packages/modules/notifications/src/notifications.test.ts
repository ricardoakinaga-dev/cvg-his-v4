import assert from 'node:assert/strict';
import test from 'node:test';

import { NotificationsService } from './index.js';

test('NotificationsService: create notification returns notification with queued status', () => {
  const notifications = new NotificationsService();

  const notification = notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'medium',
    title: 'Test notification',
    message: 'This is a test'
  });

  assert.ok(notification.id);
  assert.equal(notification.status, 'queued');
  assert.equal(notification.title, 'Test notification');
  assert.equal(notification.severity, 'medium');
});

test('NotificationsService: processPending moves notifications to sent', () => {
  const notifications = new NotificationsService();

  notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'low',
    title: 'Test 1',
    message: 'Message 1'
  });

  notifications.create('user_1' as never, 'acc_1' as never, {
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

test('NotificationsService: processPending respects limit', () => {
  const notifications = new NotificationsService();

  for (let i = 0; i < 5; i++) {
    notifications.create('user_1' as never, 'acc_1' as never, {
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

test('NotificationsService: list filters by status', () => {
  const notifications = new NotificationsService();

  notifications.create('user_1' as never, 'acc_1' as never, {
    category: 'billing',
    severity: 'medium',
    title: 'Queued',
    message: 'Test'
  });

  notifications.create('user_1' as never, 'acc_1' as never, {
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

test('NotificationsService: listJobs returns job entries', () => {
  const notifications = new NotificationsService();

  notifications.create('user_1' as never, 'acc_1' as never, {
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

test('NotificationsService: notifications support all categories', () => {
  const notifications = new NotificationsService();

  const categories = ['billing', 'inventory', 'operations', 'system'] as const;

  for (const category of categories) {
    const n = notifications.create('user_1' as never, 'acc_1' as never, {
      category,
      severity: 'low',
      title: `Test ${category}`,
      message: 'Test'
    });
    assert.equal(n.category, category);
  }
});

test('NotificationsService: notifications support all severity levels', () => {
  const notifications = new NotificationsService();

  const severities = ['low', 'medium', 'high'] as const;

  for (const severity of severities) {
    const n = notifications.create('user_1' as never, 'acc_1' as never, {
      category: 'system',
      severity,
      title: `Test ${severity}`,
      message: 'Test'
    });
    assert.equal(n.severity, severity);
  }
});
