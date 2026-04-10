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
import type { UserSummary } from '@cvg-his-v2/shared-types';

// Principal result type (duplicated from server.ts to avoid tight coupling)
export interface PrincipalResult {
  user: UserSummary;
  access: { permissions: readonly string[] };
}

// Webhooks route handlers interface
export interface WebhooksHandlers {
  webhooks: WebhooksService;
  audit: AuditService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requirePrincipal: (request: IncomingMessage, permission: string) => any;
}

/**
 * Handle all webhooks-related routes (excluding WhatsApp inbound).
 * Returns true if the request was handled, false if the route didn't match.
 */
export function handleWebhooksRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: WebhooksHandlers
): Promise<boolean> | boolean {
  const { webhooks, audit, requirePrincipal } = handlers;

  // GET /webhooks — list all webhooks for account
  if (pathname === '/webhooks' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'webhooks.read');
    const items = webhooks.list(principal.user.accountId);
    Promise.resolve(items).then((resolvedItems) => {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ items: resolvedItems }));
    });
    return true;
  }

  // POST /webhooks — register new webhook
  if (pathname === '/webhooks' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'webhooks.manage');
    const body = readJsonBody(request) as Promise<CreateWebhookRequest>;
    body.then(async (payload) => {
      const webhook = await webhooks.register(
        principal.user.id,
        principal.user.accountId,
        payload
      );
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
      response.end(JSON.stringify(webhook));
    });
    return true;
  }

  // GET /webhooks/{webhookId} — get single webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'GET') {
    const webhookId = pathname.split('/')[2];
    const principal = requirePrincipal(request, 'webhooks.read');
    const webhook = webhooks.get(webhookId as never);
    return Promise.resolve(webhook).then((wh) => {
      if (!wh || wh.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId }));
        return true;
      }
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(wh));
      return true;
    });
  }

  // PATCH /webhooks/{webhookId} — update webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'PATCH') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = requirePrincipal(request, 'webhooks.manage');
    const body = readJsonBody(request) as Promise<UpdateWebhookRequest>;
    return body.then(async (payload) => {
      const existing = await webhooks.get(webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId }));
        return true;
      }
      const updated = await webhooks.update(webhookId as never, payload);
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
      response.end(JSON.stringify(updated));
      return true;
    });
  }

  // DELETE /webhooks/{webhookId} — delete webhook
  if (pathname.match(/^\/webhooks\/[^/]+$/) && request.method === 'DELETE') {
    const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
    const principal = requirePrincipal(request, 'webhooks.manage');
    return (async () => {
      const existing = await webhooks.get(webhookId as never);
      if (!existing || existing.accountId !== principal.user.accountId) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId }));
        return true;
      }
      await webhooks.delete(webhookId as never);
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

  return false;
}