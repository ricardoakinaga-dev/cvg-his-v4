import type { WebhookDelivery } from '@/types/webhook';

const PENDING_DELIVERY_STATUSES: ReadonlySet<WebhookDelivery['status']> = new Set([
  'pending',
  'processing',
  'retrying'
]);

export function isWebhookDeliveryPending(status: WebhookDelivery['status']): boolean {
  return PENDING_DELIVERY_STATUSES.has(status);
}

export function latestWebhookDeliveryAttempt(
  deliveries: readonly WebhookDelivery[]
): WebhookDelivery | undefined {
  return deliveries
    .filter((delivery) => Boolean(delivery.lastAttemptAt))
    .reduce<WebhookDelivery | undefined>((latest, delivery) => {
      if (!latest || Date.parse(delivery.lastAttemptAt ?? '') > Date.parse(latest.lastAttemptAt ?? '')) {
        return delivery;
      }
      return latest;
    }, undefined);
}
