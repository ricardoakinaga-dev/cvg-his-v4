import type {
  AccountId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';

export interface WebhookDeliveryClaim {
  readonly delivery: WebhookDeliverySummary;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
  readonly leaseExpiresAt: string;
}

export interface ClaimPendingWebhookDeliveriesInput {
  readonly limit: number;
  readonly leaseOwner: string;
  readonly leaseMs: number;
}

export interface RetryWebhookDeliveryInput {
  readonly scheduledAt: string;
  readonly error: string;
}

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
  /** Atomically claims due or expired deliveries with a fencing token. */
  claimPending?(
    accountId: AccountId,
    input: ClaimPendingWebhookDeliveriesInput
  ): Promise<readonly WebhookDeliveryClaim[]>;
  /** Extends a lease only while its exact owner/token/version is current. */
  renewClaim?(claim: WebhookDeliveryClaim, leaseMs: number): Promise<boolean>;
  /** Completes a delivery only while its exact lease is current. */
  completeClaim?(claim: WebhookDeliveryClaim, result: WebhookDeliverySummary): Promise<boolean>;
  /** Schedules a retry only while its exact lease is current. */
  retryClaim?(
    claim: WebhookDeliveryClaim,
    input: RetryWebhookDeliveryInput,
    result: WebhookDeliverySummary
  ): Promise<boolean>;
  /** Moves a delivery to terminal failed/DLQ only while its exact lease is current. */
  failClaim?(claim: WebhookDeliveryClaim, result: WebhookDeliverySummary): Promise<boolean>;
  /** Requeues a terminal delivery without bypassing account ownership. */
  requeueDelivery?(accountId: AccountId, deliveryId: WebhookDeliveryId): Promise<boolean>;
}
