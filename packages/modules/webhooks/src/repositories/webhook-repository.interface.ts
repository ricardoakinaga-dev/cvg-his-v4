import type {
  AccountId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';

export interface WebhookRepository {
  create(webhook: WebhookSummary): Promise<void>;
  update(webhook: WebhookSummary): Promise<void>;
  findById(id: WebhookId): Promise<WebhookSummary | null>;
  findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]>;
  findActiveByEvent(accountId: AccountId, event: string): Promise<readonly WebhookSummary[]>;
  createDelivery(delivery: WebhookDeliverySummary): Promise<void>;
  updateDelivery(delivery: WebhookDeliverySummary): Promise<void>;
  findDeliveriesByWebhook(webhookId: WebhookId): Promise<readonly WebhookDeliverySummary[]>;
  findPendingDeliveries(limit: number): Promise<readonly WebhookDeliverySummary[]>;
}
