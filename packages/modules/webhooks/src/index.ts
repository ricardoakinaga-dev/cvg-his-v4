import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookPayload
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  UserId,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import { createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export { DatabaseWebhookRepository } from './repositories/database-webhook.repository.js';

import type { WebhookRepository as IWebhookRepository } from './repositories/database-webhook.repository.js';
export type { WebhookRepository } from './repositories/database-webhook.repository.js';

export interface WebhooksServiceOptions {
  readonly repository?: IWebhookRepository;
  readonly onDeliver?: (delivery: WebhookDeliverySummary) => Promise<void>;
  readonly resolveHostname?: (hostname: string) => Promise<readonly string[]>;
  readonly deliverRequest?: (request: WebhookDeliveryRequest) => Promise<WebhookDeliveryResult>;
}

export interface WebhookDeliveryRequest {
  readonly url: string;
  readonly address: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
}

export interface WebhookDeliveryResult {
  readonly success: boolean;
  readonly statusCode?: number;
  readonly body?: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5000, 30000, 90000];
const MAX_EVENTS_PER_WEBHOOK = 50;
const MAX_EVENT_LENGTH = 120;
const MAX_RESPONSE_BODY_BYTES = 64 * 1024;

const nonPublicAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
] as const) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32]
] as const) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv6');
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return nonPublicAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

function createPinnedLookup(address: string): LookupFunction {
  const family = isIP(address);
  if (family === 0) {
    throw new Error('Webhook target did not resolve to an IP address');
  }

  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }]);
      return;
    }
    callback(null, address, family);
  };
}

export async function deliverPinnedWebhookRequest(
  input: WebhookDeliveryRequest
): Promise<WebhookDeliveryResult> {
  const target = new URL(input.url);
  const request = target.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const outgoing = request(
      target,
      {
        method: 'POST',
        headers: input.headers,
        lookup: createPinnedLookup(input.address)
      },
      (response) => {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;

        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          receivedBytes += buffer.length;
          if (receivedBytes > MAX_RESPONSE_BODY_BYTES) {
            response.destroy(new Error('Webhook response body exceeded the configured limit'));
            return;
          }
          chunks.push(buffer);
        });
        response.on('error', reject);
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;
          resolve({
            success: statusCode >= 200 && statusCode < 300,
            statusCode,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );

    outgoing.setTimeout(input.timeoutMs, () => {
      outgoing.destroy(new Error('Webhook delivery timed out'));
    });
    outgoing.on('error', reject);
    outgoing.end(input.body);
  });
}

function normalizeWebhookUrl(rawUrl: string): string {
  const url = requireNonEmptyString(rawUrl, 'url');
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid webhook URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Webhook URL must use HTTP or HTTPS');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Webhook URL must not include credentials');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Webhook URL must not target a private network');
  }
  if (isIP(hostname) !== 0 && isPrivateAddress(hostname)) {
    throw new Error('Webhook URL must not target a private network');
  }

  return parsed.toString();
}

function normalizeWebhookEvents(rawEvents: readonly string[] | undefined): string[] {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    throw new Error('At least one webhook event is required');
  }

  if (rawEvents.length > MAX_EVENTS_PER_WEBHOOK) {
    throw new Error(`Webhook cannot subscribe to more than ${MAX_EVENTS_PER_WEBHOOK} events`);
  }

  const events = rawEvents.map((event) => requireNonEmptyString(event, 'event'));

  for (const event of events) {
    if (event.length > MAX_EVENT_LENGTH || !/^[a-z0-9._:-]+$/i.test(event)) {
      throw new Error('Webhook event has invalid format');
    }
  }

  return [...new Set(events)];
}

export class WebhooksService {
  readonly #repository?: IWebhookRepository;
  readonly #onDeliver?: (delivery: WebhookDeliverySummary) => Promise<void>;
  readonly #resolveHostname: (hostname: string) => Promise<readonly string[]>;
  readonly #deliverRequest: (request: WebhookDeliveryRequest) => Promise<WebhookDeliveryResult>;

  public constructor(options?: WebhooksServiceOptions) {
    this.#repository = options?.repository;
    this.#onDeliver = options?.onDeliver;
    this.#resolveHostname =
      options?.resolveHostname ??
      (async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address));
    this.#deliverRequest = options?.deliverRequest ?? deliverPinnedWebhookRequest;
  }

  public async register(
    _actorUserId: UserId,
    accountId: AccountId,
    payload: CreateWebhookRequest
  ): Promise<WebhookSummary> {
    const url = normalizeWebhookUrl(payload.url);
    const events = normalizeWebhookEvents(payload.events);

    const now = nowIso();
    const webhook: WebhookSummary = {
      id: createCorrelationId('wh') as WebhookId,
      accountId,
      url,
      events,
      secret: payload.secret,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    if (this.#repository) {
      await this.#repository.create(webhook);
    }

    return webhook;
  }

  public async list(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    if (!this.#repository) {
      return [];
    }
    return this.#repository.findByAccount(accountId);
  }

  /**
   * Send a test event to a registered webhook.
   * Returns the delivery result without storing in delivery history.
   */
  public async test(
    webhookId: WebhookId,
    accountId: AccountId
  ): Promise<{ success: boolean; statusCode?: number; body?: string } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(accountId, webhookId);
    if (!webhook) {
      return null;
    }

    const payload: WebhookPayload = {
      id: createCorrelationId('whpay'),
      event: 'webhook.test',
      timestamp: nowIso(),
      accountId,
      data: {
        message: 'This is a test webhook delivery from CVG HIS',
        webhookId: webhook.id,
        accountId
      }
    };

    return this.#attemptDelivery(webhook, payload, {
      id: createCorrelationId('whdel') as WebhookDeliveryId,
      accountId,
      webhookId,
      event: 'webhook.test',
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
      attempts: 0,
      createdAt: nowIso()
    });
  }

  public async get(accountId: AccountId, webhookId: WebhookId): Promise<WebhookSummary | null> {
    if (!this.#repository) {
      return null;
    }
    return this.#repository.findById(accountId, webhookId);
  }

  public async update(
    accountId: AccountId,
    webhookId: WebhookId,
    payload: UpdateWebhookRequest
  ): Promise<WebhookSummary | null> {
    if (!this.#repository) {
      return null;
    }

    const existing = await this.#repository.findById(accountId, webhookId);
    if (!existing) {
      return null;
    }

    const updated: WebhookSummary = {
      ...existing,
      url: payload.url !== undefined ? normalizeWebhookUrl(payload.url) : existing.url,
      events:
        payload.events !== undefined ? normalizeWebhookEvents(payload.events) : existing.events,
      isActive: payload.isActive ?? existing.isActive,
      updatedAt: nowIso()
    };

    await this.#repository.update(updated);
    return updated;
  }

  public async delete(accountId: AccountId, webhookId: WebhookId): Promise<boolean> {
    if (!this.#repository) {
      return false;
    }

    const existing = await this.#repository.findById(accountId, webhookId);
    if (!existing) {
      return false;
    }

    await this.#repository.update({ ...existing, isActive: false, updatedAt: nowIso() });
    await this.#repository.deleteDeliveriesByWebhook(accountId, webhookId);
    return true;
  }

  public async listDeliveries(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]> {
    if (!this.#repository) {
      return [];
    }
    return this.#repository.findDeliveriesByWebhook(accountId, webhookId);
  }

  /**
   * Retest a specific webhook delivery by re-attempting delivery.
   * Resets the delivery status to 'pending' and triggers async retry.
   */
  public async retestDelivery(
    webhookId: WebhookId,
    deliveryId: WebhookDeliveryId,
    accountId: AccountId
  ): Promise<{ success: boolean; message: string } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(accountId, webhookId);
    if (!webhook) {
      return null;
    }

    const deliveries = await this.#repository.findDeliveriesByWebhook(accountId, webhookId);
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) {
      return null;
    }

    // Reset delivery to pending for retry
    const resetDelivery: WebhookDeliverySummary = {
      ...delivery,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: undefined,
      responseStatus: undefined,
      responseBody: undefined,
      nextRetryAt: undefined
    };
    await this.#repository.updateDelivery(resetDelivery);

    // Trigger async retry
    void this.#deliverWithRetry(
      webhook,
      resetDelivery,
      delivery.payload as unknown as WebhookPayload
    );

    return { success: true, message: 'Delivery re-queued for retry' };
  }

  /**
   * Return delivery statistics for a webhook: breakdown by status and totals.
   */
  public async getDeliveryStats(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
  } | null> {
    if (!this.#repository) {
      return null;
    }

    const webhook = await this.#repository.findById(accountId, webhookId);
    if (!webhook) return null;

    const deliveries = await this.#repository.findDeliveriesByWebhook(accountId, webhookId);
    const stats = { total: deliveries.length, pending: 0, delivered: 0, failed: 0 };
    for (const d of deliveries) {
      if (d.status === 'pending') stats.pending++;
      else if (d.status === 'delivered') stats.delivered++;
      else if (d.status === 'failed') stats.failed++;
    }
    return stats;
  }

  public async dispatch(
    accountId: AccountId,
    event: string,
    data: Record<string, unknown>
  ): Promise<number> {
    if (!this.#repository) {
      return 0;
    }

    const webhooks = await this.#repository.findActiveByEvent(accountId, event);
    if (webhooks.length === 0) {
      return 0;
    }

    const payload: WebhookPayload = {
      id: createCorrelationId('whpay'),
      event,
      timestamp: nowIso(),
      accountId,
      data
    };

    let dispatched = 0;

    for (const webhook of webhooks) {
      const delivery: WebhookDeliverySummary = {
        id: createCorrelationId('whdel') as WebhookDeliveryId,
        accountId,
        webhookId: webhook.id,
        event,
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        createdAt: nowIso()
      };

      await this.#repository.createDelivery(delivery);
      dispatched++;
      await this.#deliverWithRetry(webhook, delivery, payload);
    }

    return dispatched;
  }

  /**
   * Persist pending deliveries without performing network I/O.
   *
   * Event-bus consumers call this method inside a tenant unit of work. The
   * delivery worker may safely perform the external HTTP attempt later, after
   * the inbox/outbox transaction has committed.
   */
  public async enqueue(
    accountId: AccountId,
    event: string,
    data: Record<string, unknown>
  ): Promise<number> {
    if (!this.#repository) {
      return 0;
    }

    const webhooks = await this.#repository.findActiveByEvent(accountId, event);
    if (webhooks.length === 0) {
      return 0;
    }

    const payload: WebhookPayload = {
      id: createCorrelationId('whpay'),
      event,
      timestamp: nowIso(),
      accountId,
      data
    };

    for (const webhook of webhooks) {
      await this.#repository.createDelivery({
        id: createCorrelationId('whdel') as WebhookDeliveryId,
        accountId,
        webhookId: webhook.id,
        event,
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        createdAt: nowIso()
      });
    }

    return webhooks.length;
  }

  async #deliverWithRetry(
    webhook: WebhookSummary,
    delivery: WebhookDeliverySummary,
    payload: WebhookPayload
  ): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const result = await this.#attemptDelivery(webhook, payload, delivery);

      if (result.success) {
        const updated: WebhookDeliverySummary = {
          ...delivery,
          status: 'delivered',
          attempts: attempt + 1,
          lastAttemptAt: nowIso(),
          responseStatus: result.statusCode,
          responseBody: result.body
        };

        await this.#updateDelivery(updated);
        return;
      }

      if (attempt === MAX_RETRY_ATTEMPTS) {
        const updated: WebhookDeliverySummary = {
          ...delivery,
          status: 'failed',
          attempts: attempt + 1,
          lastAttemptAt: nowIso(),
          responseStatus: result.statusCode,
          responseBody: result.body
        };

        await this.#updateDelivery(updated);
        return;
      }

      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      const nextRetry = new Date(Date.now() + delay);

      const updated: WebhookDeliverySummary = {
        ...delivery,
        status: 'pending',
        attempts: attempt + 1,
        lastAttemptAt: nowIso(),
        responseStatus: result.statusCode,
        responseBody: result.body,
        nextRetryAt: nextRetry.toISOString()
      };

      await this.#updateDelivery(updated);
    }
  }

  async #attemptDelivery(
    webhook: WebhookSummary,
    payload: WebhookPayload,
    delivery: WebhookDeliverySummary
  ): Promise<{ success: boolean; statusCode?: number; body?: string }> {
    try {
      const target = new URL(webhook.url);
      const addresses = await this.#resolveHostname(target.hostname);
      if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
        return { success: false };
      }
      const body = JSON.stringify(payload);
      const signature = webhook.secret
        ? `sha256=${createHmac('sha256', webhook.secret).update(body).digest('hex')}`
        : undefined;
      return await this.#deliverRequest({
        url: webhook.url,
        address: addresses[0],
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery-ID': delivery.id,
          ...(signature ? { 'X-Webhook-Signature': signature } : {})
        },
        body,
        timeoutMs: 10000
      });
    } catch {
      return { success: false };
    }
  }

  async #updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    if (this.#repository) {
      await this.#repository.updateDelivery(delivery);
    }

    if (this.#onDeliver) {
      await this.#onDeliver(delivery);
    }
  }
}
