/**
 * API Keys route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AccessControlService, ResourceAttributes } from '@cvg-his-v2/module-access-control';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';
import { requireApiKey, sanitizeApiKey } from '../helpers/auth-helpers.js';

export interface ApiKeysHandlers {
  apiKeys: ApiKeysService;
  accessControl: AccessControlService;
  audit: AuditService;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    attrs: ResourceAttributes,
    request: IncomingMessage
  ) => void;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

/**
 * Handle all api-keys and integrations-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleApiKeysRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ApiKeysHandlers
): Promise<boolean> {
  const { apiKeys, accessControl, audit, enforceAbac, requirePrincipal: rp } = handlers;

  // POST /api-keys — create a new API key
  if (pathname === '/api-keys' && request.method === 'POST') {
    const principal = rp(request, 'api_keys.manage');
    enforceAbac(
      'api_keys.manage',
      principal,
      {
        resourceType: 'api_key',
        resourceId: 'new',
        accountId: principal.user.accountId as never
      },
      request
    );
    const body = (await readJsonBody(request)) as Record<string, unknown>;

    validateRequestBody(
      body,
      {
        name: { type: 'string', required: true, minLength: 3, maxLength: 120 },
        permissions: { type: 'array', required: true }
      },
      correlationId
    );

    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((value): value is string => typeof value === 'string')
      : [];
    if (permissions.length === 0) {
      throw new ValidationError('permissions must contain at least one permission');
    }

    const knownPermissions = new Set(accessControl.listPermissions().map((item) => item.code));
    const unknownPermissions = permissions.filter((permission) => !knownPermissions.has(permission));
    if (unknownPermissions.length > 0) {
      throw new ValidationError('permissions contains unknown permission codes', {
        unknownPermissions
      });
    }

    const created = await apiKeys.create({
      accountId: principal.user.accountId,
      name: String(body.name),
      permissions,
      rateLimit:
        typeof body.rateLimit === 'number' ? Math.max(1, Math.floor(body.rateLimit)) : undefined,
      rateLimitWindow:
        typeof body.rateLimitWindow === 'number'
          ? Math.max(60, Math.floor(body.rateLimitWindow))
          : undefined,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : undefined,
      createdBy: principal.user.id
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'integrations',
      action: 'api_key_create',
      entityType: 'api_key',
      entityId: created.apiKey.id,
      payloadSummary: `API key ${created.apiKey.name} created with ${created.apiKey.permissions.length} permissions`,
      riskLevel: 'medium',
      correlationId
    });

    response.statusCode = 201;
    response.end(
      JSON.stringify({
        apiKey: sanitizeApiKey(created.apiKey),
        rawKey: created.rawKey
      })
    );
    return true;
  }

  // GET /api-keys — list API keys for account
  if (pathname === '/api-keys' && request.method === 'GET') {
    const principal = rp(request, 'api_keys.manage');
    const items = await apiKeys.getByAccount(principal.user.accountId);
    response.statusCode = 200;
    response.end(JSON.stringify({ items: items.map(sanitizeApiKey) }));
    return true;
  }

  // GET /integrations/catalog — return integration capabilities
  if (pathname === '/integrations/catalog' && request.method === 'GET') {
    const apiKeyPrincipal = await requireApiKey(request, 'integrations.read', apiKeys);
    const payload = {
      accountId: apiKeyPrincipal.apiKey.accountId,
      apiKeyId: apiKeyPrincipal.apiKey.id,
      permissions: apiKeyPrincipal.apiKey.permissions,
      eventBus: {
        provider: 'database-outbox',
        state: 'operational',
        endpoints: ['/internal/events/publish', '/internal/events/:correlationId']
      },
      webhooks: {
        endpoints: ['/webhooks', '/webhooks/{webhookId}', '/webhooks/{webhookId}/test'],
        delivery: 'retry-3x'
      },
      payments: {
        provider: 'local-pix',
        endpoints: ['/payments/pix/intents']
      }
    };
    await apiKeys.recordUsage({
      apiKeyId: apiKeyPrincipal.apiKey.id,
      endpoint: '/integrations/catalog',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: null
    });
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  return false;
}
