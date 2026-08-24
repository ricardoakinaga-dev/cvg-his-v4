import { describe, expect, it, vi } from 'vitest';

import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';
import { WebhooksEventHandlers } from './webhooks.consumer.js';

function event(eventType: string): OutboxEvent {
  return {
    id: `event-${eventType}`,
    accountId: 'account-test' as never,
    correlationId: 'correlation-test' as never,
    moduleName: 'test' as never,
    eventType,
    payload: { source: 'unit-test' },
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: '2026-08-24T12:00:00.000Z',
    processedAt: null,
    error: null,
    createdAt: '2026-08-24T12:00:00.000Z'
  };
}

describe('domain event consumers', () => {
  it('dispatches every webhook-backed domain event with canonical account context', async () => {
    const enqueue = vi.fn(async () => undefined);
    const handlers = new WebhooksEventHandlers({ webhooks: { enqueue } } as never);
    const eventTypes = [
      'patient.created',
      'appointment.scheduled',
      'appointment.status_changed',
      'encounter.created',
      'encounter.status_changed',
      'billing.record.created',
      'billing.status_changed',
      'notification.sent'
    ];

    for (const eventType of eventTypes) {
      await handlers.handle(event(eventType));
    }

    expect(enqueue).toHaveBeenCalledTimes(eventTypes.length);
    for (const [index, eventType] of eventTypes.entries()) {
      expect(enqueue).toHaveBeenNthCalledWith(
        index + 1,
        'account-test',
        eventType,
        expect.objectContaining({ accountId: 'account-test', source: 'unit-test' })
      );
    }

    await handlers.handle(event('unregistered.event'));
    expect(enqueue).toHaveBeenCalledTimes(eventTypes.length);
  });

  it('supports legacy dispatch-only webhook services and the handler adapter', async () => {
    const dispatch = vi.fn(async () => undefined);
    const handlers = new WebhooksEventHandlers({ webhooks: { dispatch } } as never);

    await handlers.handlers(event('patient.created'));

    expect(dispatch).toHaveBeenCalledWith(
      'account-test',
      'patient.created',
      expect.objectContaining({ accountId: 'account-test' })
    );
  });
});
