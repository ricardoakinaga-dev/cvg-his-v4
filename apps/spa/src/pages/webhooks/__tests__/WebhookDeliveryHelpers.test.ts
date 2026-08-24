import { describe, expect, it } from 'vitest';

import type { WebhookDelivery } from '@/types/webhook';
import {
  isWebhookDeliveryPending,
  latestWebhookDeliveryAttempt
} from '@/pages/webhooks/webhook-delivery-helpers';

function delivery(
  status: WebhookDelivery['status'],
  lastAttemptAt?: string
): WebhookDelivery {
  return {
    id: `${status}-delivery`,
    webhookId: 'webhook-1',
    event: 'patient.created',
    status,
    attempts: 1,
    lastAttemptAt,
    responseStatus: null,
    responseBody: null,
    nextRetryAt: null,
    createdAt: '2026-08-24T00:00:00.000Z'
  };
}

describe('webhook delivery helpers', () => {
  it('treats queued, processing and retrying deliveries as pending work', () => {
    expect(isWebhookDeliveryPending('pending')).toBe(true);
    expect(isWebhookDeliveryPending('processing')).toBe(true);
    expect(isWebhookDeliveryPending('retrying')).toBe(true);
    expect(isWebhookDeliveryPending('delivered')).toBe(false);
    expect(isWebhookDeliveryPending('failed')).toBe(false);
  });

  it('returns the newest defined attempt and tolerates never-attempted deliveries', () => {
    const latest = latestWebhookDeliveryAttempt([
      delivery('pending'),
      delivery('retrying', '2026-08-24T02:00:00.000Z'),
      delivery('processing', '2026-08-24T03:00:00.000Z')
    ]);

    expect(latest?.id).toBe('processing-delivery');
    expect(latestWebhookDeliveryAttempt([delivery('pending')])).toBeUndefined();
  });
});
