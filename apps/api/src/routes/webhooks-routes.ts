/**
 * Webhooks route handlers — CRUD + delivery management.
 * Extracted from server.ts as part of the controlled refactoring initiative.
 * These handlers are called from server.ts and return true if the route was handled.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebhooksService } from '@cvg-his-v2/module-webhooks';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { readJsonBody } from '../helpers/common.js';
import { appendAudit } from '../helpers/audit-helper.js';
import type { CreateWebhookRequest, UpdateWebhookRequest } from '@cvg-his-v2/shared-contracts';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { AuthenticatedPrincipal, WebhookSummary } from '@cvg-his-v2/shared-types';

// Webhooks route handlers interface
export interface WebhooksHandlers {
  webhooks: WebhooksService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permission: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

type PublicWebhookSummary = Omit<WebhookSummary, 'secret'>;

function isWebhookCollectionPath(pathname: string): boolean {
  return ['/webhooks', '/webhook', '/cadastro/webhooks', '/cadastros/webhooks'].includes(pathname);
}

function normalizeSearch(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function parseActiveFilter(value: string | null): boolean | undefined {
  if (value === null || value === '') return undefined;
  return value !== 'false';
}

function toPublicWebhook(webhook: WebhookSummary): PublicWebhookSummary {
  const { secret: _secret, ...publicWebhook } = webhook;
  return publicWebhook;
}

function filterWebhooks(
  items: readonly WebhookSummary[],
  filters: { url?: string; event?: string; active?: boolean }
): readonly WebhookSummary[] {
  const eventFilter = filters.event;
  return items.filter((item) => {
    if (filters.url && !item.url.toLowerCase().includes(filters.url)) return false;
    if (eventFilter && !item.events.some((event) => event.toLowerCase().includes(eventFilter))) {
      return false;
    }
    if (filters.active !== undefined && item.isActive !== filters.active) return false;
    return true;
  });
}

/**
 * Handle all webhooks-related routes (excluding WhatsApp inbound).
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleWebhooksRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: WebhooksHandlers
): Promise<boolean> {
  const { webhooks, audit, requirePrincipal } = handlers;

  // GET /webhooks — list all webhooks for account
  if (isWebhookCollectionPath(pathname) && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'webhooks.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const filters = {
      url: normalizeSearch(url.searchParams.get('url') ?? url.searchParams.get('description')),
      event: normalizeSearch(url.searchParams.get('event')),
      active: parseActiveFilter(url.searchParams.get('active'))
    };
    const items = await webhooks.list(principal.user.accountId);
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ items: filterWebhooks(items, filters).map(toPublicWebhook) }));
    return true;
  }

  // POST /webhooks — register new webhook
  if (isWebhookCollectionPath(pathname) && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'webhooks.manage');
    const payload = (await readJsonBody(request)) as CreateWebhookRequest;
    const webhook = await webhooks.register(principal.user.id, principal.user.accountId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'webhooks',
      action: 'register',
      entityType: 'webhook',
      entityId: webhook.id,
      payloadSummary: `Webhook registered for URL ${webhook.url}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(toPublicWebhook(webhook)));
    return true;
  }

  // GET /webhooks/{webhookId} — get single webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'GET') {
    const webhookId = pathname.split('/')[2];
    const principal = await requirePrincipal(request, 'webhooks.read');
    const webhook = webhooks.get(principal.user.accountId, webhookId as never);
    const wh = await webhook;
    if (!wh || wh.accountId !== principal.user.accountId) {
      response.statusCode = 404;
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
      );
      return true;
    }
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(toPublicWebhook(wh)));
    return true;
  }

  // PATCH /webhooks/{webhookId} — update webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'PATCH') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = await requirePrincipal(request, 'webhooks.manage');
    const body = readJsonBody(request) as Promise<UpdateWebhookRequest>;
    return body.then(async (payload) => {
      const existing = await webhooks.get(principal.user.accountId, webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
        );
        return true;
      }
      const updated = await webhooks.update(principal.user.accountId, webhookId as never, payload);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'webhooks',
        action: 'update',
        entityType: 'webhook',
        entityId: webhookId,
        payloadSummary: `Webhook ${webhookId} updated`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(updated ? toPublicWebhook(updated) : null));
      return true;
    });
  }

  // DELETE /webhooks/{webhookId} — delete webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'DELETE') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = await requirePrincipal(request, 'webhooks.manage');
    return (async () => {
      const existing = await webhooks.get(principal.user.accountId, webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
        );
        return true;
      }
      await webhooks.delete(principal.user.accountId, webhookId as never);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'webhooks',
        action: 'delete',
        entityType: 'webhook',
        entityId: webhookId,
        payloadSummary: `Webhook ${webhookId} deleted`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 204;
      response.end();
      return true;
    })();
  }

  // GET /webhooks/{webhookId}/deliveries — list deliveries for a webhook
  if (
    pathname.startsWith('/webhooks/') &&
    pathname.endsWith('/deliveries') &&
    request.method === 'GET'
  ) {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = await requirePrincipal(request, 'webhooks.read');
    return (async () => {
      const existing = await webhooks.get(principal.user.accountId, webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
        );
        return true;
      }
      const items = await webhooks.listDeliveries(principal.user.accountId, webhookId as never);
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ items }));
      return true;
    })();
  }

  // GET /webhooks/{webhookId}/deliveries/stats — delivery statistics for a webhook
  if (pathname.match(/^\/webhooks\/[^/]+\/deliveries\/stats$/) && request.method === 'GET') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = await requirePrincipal(request, 'webhooks.read');
    return (async () => {
      const existing = await webhooks.get(principal.user.accountId, webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
        );
        return true;
      }
      const stats = await webhooks.getDeliveryStats(principal.user.accountId, webhookId as never);
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(stats));
      return true;
    })();
  }

  // POST /webhooks/{webhookId}/deliveries/{deliveryId}/retest — retest a specific delivery
  if (
    pathname.match(/^\/webhooks\/[^/]+\/deliveries\/[^/]+\/retest$/) &&
    request.method === 'POST'
  ) {
    const parts = pathname.split('/');
    const webhookId = requireNonEmptyString(parts[2], 'webhookId');
    const deliveryId = requireNonEmptyString(parts[4], 'deliveryId');
    const principal = await requirePrincipal(request, 'webhooks.manage');
    return (async () => {
      const result = await webhooks.retestDelivery(
        webhookId as never,
        deliveryId as never,
        principal.user.accountId as never
      );
      if (!result) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({
            code: 'NOT_FOUND',
            message: 'Webhook or delivery not found',
            correlationId
          })
        );
        return true;
      }
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'webhooks',
        action: 'retest_delivery',
        entityType: 'webhook_delivery',
        entityId: `${webhookId}:${deliveryId}`,
        payloadSummary: `Webhook delivery retest: ${result.message}`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 202;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
      return true;
    })();
  }

  // GET /webhooks/{webhookId}/deliveries/{deliveryId} — get a single delivery
  if (pathname.match(/^\/webhooks\/[^/]+\/deliveries\/[^/]+$/) && request.method === 'GET') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const deliveryId = requireNonEmptyString(pathname.split('/')[4], 'deliveryId');
    const principal = await requirePrincipal(request, 'webhooks.read');
    return (async () => {
      const webhook = await webhooks.get(principal.user.accountId, webhookId as never);
      if (!webhook || webhook.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found' }));
        return true;
      }
      const deliveries = await webhooks.listDeliveries(
        principal.user.accountId,
        webhookId as never
      );
      const delivery = deliveries.find((d) => d.id === deliveryId);
      if (!delivery) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Delivery not found' }));
        return true;
      }
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(delivery));
      return true;
    })();
  }

  // POST /webhooks/{webhookId}/test — send a test event to the webhook
  if (
    pathname.startsWith('/webhooks/') &&
    pathname.endsWith('/test') &&
    request.method === 'POST'
  ) {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = await requirePrincipal(request, 'webhooks.manage');
    return (async () => {
      const result = await webhooks.test(webhookId as never, principal.user.accountId as never);
      if (!result) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
        );
        return true;
      }
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'webhooks',
        action: 'test',
        entityType: 'webhook',
        entityId: webhookId,
        payloadSummary: `Webhook test sent to ${webhookId}: success=${result.success}, status=${result.statusCode}`,
        riskLevel: 'low',
        correlationId
      });
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
      return true;
    })();
  }

  return false;
}
