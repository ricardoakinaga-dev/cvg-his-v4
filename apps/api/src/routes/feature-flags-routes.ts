import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  FeatureFlagProvider,
  FeatureFlagScope
} from '@cvg-his-v2/shared-feature-flags';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { DatabaseFeatureFlagRepository } from '@cvg-his-v2/module-feature-flags';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface FeatureFlagsRoutesHandlers {
  featureFlagRepository: DatabaseFeatureFlagRepository;
  featureFlagProvider: FeatureFlagProvider;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

interface CreateFeatureFlagRequest {
  key: string;
  owner: string;
  description: string;
  defaultValue: boolean;
  scopes?: readonly FeatureFlagScope[];
  expiresAt?: string;
  auditRequired?: boolean;
  tags?: readonly string[];
}

interface UpdateFeatureFlagRequest {
  owner?: string;
  description?: string;
  defaultValue?: boolean;
  scopes?: readonly FeatureFlagScope[];
  expiresAt?: string;
  auditRequired?: boolean;
  tags?: readonly string[];
}

interface CreateOverrideRequest {
  environment?: string;
  accountIdOverride?: string;
  userId?: string;
  percentage?: number | null;
  allowedUsers?: readonly string[];
  enabled: boolean;
}

export async function handleFeatureFlagsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: FeatureFlagsRoutesHandlers
): Promise<boolean> {
  const { featureFlagRepository, featureFlagProvider, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  // GET /flags - List all flags for account
  if (pathname === '/flags' && method === 'GET') {
    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;

    const flags = await featureFlagRepository.listByAccount(accountId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'list_flags',
      entityType: 'feature_flag',
      entityId: 'all',
      payloadSummary: `Feature flags listed: ${flags.length} total`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      items: flags,
      total: flags.length
    });
  }

  // POST /flags - Create a new flag
  if (pathname === '/flags' && method === 'POST') {
    const principal = requirePrincipal(request, 'flags.admin');
    const accountId = principal.user.accountId;
    const body = (await readJsonBody(request)) as CreateFeatureFlagRequest;

    const flag = {
      key: body.key,
      owner: body.owner,
      description: body.description,
      defaultValue: body.defaultValue,
      scopes: body.scopes ?? (['environment'] as const),
      expiresAt: body.expiresAt,
      auditRequired: body.auditRequired ?? false,
      tags: body.tags ?? []
    };

    await featureFlagRepository.create(flag, accountId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'create_flag',
      entityType: 'feature_flag',
      entityId: body.key,
      payloadSummary: `Feature flag created: ${body.key}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, flag);
  }

  // GET /flags/:key - Get a specific flag
  if (pathname.startsWith('/flags/') && method === 'GET') {
    const match = pathname.match(/^\/flags\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;
    const flagKey = match[1];

    const flag = await featureFlagRepository.findByKey(flagKey, accountId);

    if (!flag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'get_flag',
      entityType: 'feature_flag',
      entityId: flagKey,
      payloadSummary: `Feature flag retrieved: ${flagKey}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, flag);
  }

  // PATCH /flags/:key - Update a flag
  if (pathname.startsWith('/flags/') && method === 'PATCH') {
    const match = pathname.match(/^\/flags\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.admin');
    const accountId = principal.user.accountId;
    const flagKey = match[1];
    const body = (await readJsonBody(request)) as UpdateFeatureFlagRequest;

    const existingFlag = await featureFlagRepository.findByKey(flagKey, accountId);
    if (!existingFlag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    const updatedFlag = {
      key: flagKey,
      owner: body.owner ?? existingFlag.owner,
      description: body.description ?? existingFlag.description,
      defaultValue: body.defaultValue ?? existingFlag.defaultValue,
      scopes: body.scopes ?? existingFlag.scopes,
      expiresAt: body.expiresAt ?? existingFlag.expiresAt,
      auditRequired: body.auditRequired ?? existingFlag.auditRequired,
      tags: body.tags ?? existingFlag.tags
    };

    await featureFlagRepository.update(updatedFlag);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'update_flag',
      entityType: 'feature_flag',
      entityId: flagKey,
      payloadSummary: `Feature flag updated: ${flagKey}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, updatedFlag);
  }

  // DELETE /flags/:key - Delete a flag (soft delete by setting enabled=false)
  if (pathname.startsWith('/flags/') && method === 'DELETE') {
    const match = pathname.match(/^\/flags\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.admin');
    const accountId = principal.user.accountId;
    const flagKey = match[1];

    const existingFlag = await featureFlagRepository.findByKey(flagKey, accountId);
    if (!existingFlag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    // Disable the flag via override
    await featureFlagRepository.upsertOverride(flagKey, accountId, {
      environment: url.searchParams.get('environment') ?? undefined,
      enabled: false
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'delete_flag',
      entityType: 'feature_flag',
      entityId: flagKey,
      payloadSummary: `Feature flag disabled: ${flagKey}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 204;
    response.end();
    return true;
  }

  // GET /flags/:key/evaluate - Evaluate a flag for current context
  if (pathname.match(/^\/flags\/[^/]+\/evaluate$/) && method === 'GET') {
    const match = pathname.match(/^\/flags\/([^/]+)\/evaluate$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;
    const flagKey = match[1];
    const environment = url.searchParams.get('environment') ?? 'development';
    const userId = url.searchParams.get('userId') ?? undefined;

    const flag = await featureFlagRepository.findByKey(flagKey, accountId);
    if (!flag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    const decision = await featureFlagProvider.evaluate(flag, {
      accountId,
      environment,
      userId: userId ?? principal.user.id
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'evaluate_flag',
      entityType: 'feature_flag',
      entityId: flagKey,
      payloadSummary: `Feature flag evaluated: ${flagKey} = ${decision.enabled}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, decision);
  }

  // POST /flags/:key/overrides - Create or update an override
  if (pathname.match(/^\/flags\/[^/]+\/overrides$/) && method === 'POST') {
    const match = pathname.match(/^\/flags\/([^/]+)\/overrides$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.admin');
    const accountId = principal.user.accountId;
    const flagKey = match[1];
    const body = (await readJsonBody(request)) as CreateOverrideRequest;

    const flag = await featureFlagRepository.findByKey(flagKey, accountId);
    if (!flag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    await featureFlagRepository.upsertOverride(flagKey, accountId, {
      environment: body.environment,
      accountIdOverride: body.accountIdOverride as never,
      userId: body.userId,
      percentage: body.percentage,
      allowedUsers: body.allowedUsers,
      enabled: body.enabled
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'upsert_override',
      entityType: 'feature_flag_override',
      entityId: flagKey,
      payloadSummary: `Override upserted for flag: ${flagKey}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, { success: true, flagKey });
  }

  // GET /flags/:key/overrides - List overrides for a flag
  if (pathname.match(/^\/flags\/[^/]+\/overrides$/) && method === 'GET') {
    const match = pathname.match(/^\/flags\/([^/]+)\/overrides$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;
    const flagKey = match[1];

    const overrides = await featureFlagRepository.listOverrides(flagKey, accountId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'list_overrides',
      entityType: 'feature_flag_override',
      entityId: flagKey,
      payloadSummary: `Overrides listed for flag: ${flagKey}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      items: overrides,
      total: overrides.length
    });
  }

  return false;
}
