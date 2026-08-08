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
  delete(accountId: AccountId, webhookId: WebhookId): Promise<void>;
  findById(accountId: AccountId, id: WebhookId): Promise<WebhookSummary | null>;
  findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]>;
  findActiveByEvent(accountId: AccountId, event: string): Promise<readonly WebhookSummary[]>;
  createDelivery(delivery: WebhookDeliverySummary): Promise<void>;
  updateDelivery(delivery: WebhookDeliverySummary): Promise<void>;
  deleteDeliveriesByWebhook(accountId: AccountId, webhookId: WebhookId): Promise<void>;
  findDeliveriesByWebhook(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]>;
  findPendingDeliveries(
    accountId: AccountId,
    limit: number
  ): Promise<readonly WebhookDeliverySummary[]>;
}
