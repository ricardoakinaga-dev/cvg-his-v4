import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  FeatureFlagProvider,
  FeatureFlagScope
} from '@cvg-his-v2/shared-feature-flags';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { DatabaseFeatureFlagRepository } from '@cvg-his-v2/module-feature-flags';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

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

type FeatureFlagLifecycleStatus = 'active' | 'expired' | 'expiring_soon' | 'permanent';

function resolveLifecycleStatus(expiresAt?: string): FeatureFlagLifecycleStatus {
  if (!expiresAt) {
    return 'permanent';
  }

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  if (expiryDate.getTime() <= now.getTime()) {
    return 'expired';
  }

  const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilExpiry <= 7) {
    return 'expiring_soon';
  }

  return 'active';
}

async function buildOperationalReport(
  flag: Awaited<ReturnType<DatabaseFeatureFlagRepository['findByKey']>> extends infer T
    ? NonNullable<T>
    : never,
  accountId: string,
  environment: string,
  userId: string,
  featureFlagProvider: FeatureFlagProvider,
  featureFlagRepository: DatabaseFeatureFlagRepository
) {
  const overrides = await featureFlagRepository.listOverrides(flag.key, accountId as never);
  const decision = await featureFlagProvider.evaluate(flag, {
    accountId: accountId as never,
    environment,
    userId
  });
  const lifecycleStatus = resolveLifecycleStatus(flag.expiresAt);
  const enabledOverrides = overrides.filter((override) => override.enabled);
  const percentageRollouts = overrides
    .filter((override) => typeof override.percentage === 'number')
    .map((override) => override.percentage);
  const userTargets = overrides.reduce(
    (count, override) => count + (override.allowedUsers?.length ?? 0) + (override.userId ? 1 : 0),
    0
  );
  const accountTargets = overrides.filter((override) => override.accountIdOverride).length;
  const environmentTargets = Array.from(
    new Set(overrides.map((override) => override.environment).filter(Boolean))
  );

  return {
    key: flag.key,
    owner: flag.owner,
    description: flag.description,
    defaultValue: flag.defaultValue,
    auditRequired: flag.auditRequired ?? false,
    expiresAt: flag.expiresAt ?? null,
    lifecycleStatus,
    tags: [...(flag.tags ?? [])],
    currentDecision: decision,
    rolloutSummary: {
      totalOverrides: overrides.length,
      enabledOverrides: enabledOverrides.length,
      percentageRollouts,
      targetedUsers: userTargets,
      targetedAccounts: accountTargets,
      targetedEnvironments: environmentTargets
    },
    overrides: overrides.map((override) => ({
      environment: override.environment ?? null,
      accountIdOverride: override.accountIdOverride ?? null,
      userId: override.userId ?? null,
      percentage: override.percentage ?? null,
      allowedUsers: [...(override.allowedUsers ?? [])],
      enabled: override.enabled
    }))
  };
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

  if (pathname === '/flags/report' && method === 'GET') {
    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;
    const environment = url.searchParams.get('environment') ?? 'development';
    const userId = url.searchParams.get('userId') ?? principal.user.id;
    const flags = await featureFlagRepository.listByAccount(accountId);
    const items = await Promise.all(
      flags.map((flag) =>
        buildOperationalReport(
          flag,
          accountId,
          environment,
          userId,
          featureFlagProvider,
          featureFlagRepository
        )
      )
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'list_flag_reports',
      entityType: 'feature_flag',
      entityId: 'all',
      payloadSummary: `Feature flag operational report generated: ${items.length} flags for ${environment}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      environment,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFlags: items.length,
        auditRequiredFlags: items.filter((item) => item.auditRequired).length,
        expiredFlags: items.filter((item) => item.lifecycleStatus === 'expired').length,
        expiringSoonFlags: items.filter((item) => item.lifecycleStatus === 'expiring_soon').length,
        enabledForCurrentContext: items.filter((item) => item.currentDecision.enabled).length
      },
      items
    });
  }

  // POST /flags - Create a new flag
  if (pathname === '/flags' && method === 'POST') {
    const principal = requirePrincipal(request, 'flags.admin');
    const accountId = principal.user.accountId;
    const rawBody = (await readJsonBody(request)) as Record<string, unknown>;
    validateRequestBody(
      rawBody,
      {
        key: { type: 'string', required: true, minLength: 3, maxLength: 128 },
        owner: { type: 'string', required: true, minLength: 2, maxLength: 64 },
        description: { type: 'string', required: true, minLength: 3, maxLength: 4_000 },
        defaultValue: { type: 'boolean', required: true },
        scopes: { type: 'array' },
        expiresAt: { type: 'string' },
        auditRequired: { type: 'boolean' },
        tags: { type: 'array' }
      },
      correlationId
    );

    if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(String(rawBody.key))) {
      throw new ValidationError('Feature flag key has an invalid format', {
        correlationId,
        field: 'key'
      });
    }

    const allowedScopes: readonly FeatureFlagScope[] = [
      'global',
      'environment',
      'tenant',
      'account',
      'user'
    ];
    if (
      Array.isArray(rawBody.scopes) &&
      rawBody.scopes.some((scope) => typeof scope !== 'string' || !allowedScopes.includes(scope as FeatureFlagScope))
    ) {
      throw new ValidationError('scopes contains an unsupported feature flag scope', {
        correlationId,
        field: 'scopes'
      });
    }

    if (
      typeof rawBody.expiresAt === 'string' &&
      !Number.isFinite(new Date(rawBody.expiresAt).getTime())
    ) {
      throw new ValidationError('expiresAt must be a valid ISO date', {
        correlationId,
        field: 'expiresAt'
      });
    }

    const body = rawBody as unknown as CreateFeatureFlagRequest;

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

  if (pathname.match(/^\/flags\/[^/]+\/report$/) && method === 'GET') {
    const match = pathname.match(/^\/flags\/([^/]+)\/report$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'flags.read');
    const accountId = principal.user.accountId;
    const flagKey = match[1];
    const environment = url.searchParams.get('environment') ?? 'development';
    const userId = url.searchParams.get('userId') ?? principal.user.id;
    const flag = await featureFlagRepository.findByKey(flagKey, accountId);

    if (!flag) {
      return json(response, 404, { error: 'Flag not found' });
    }

    const report = await buildOperationalReport(
      flag,
      accountId,
      environment,
      userId,
      featureFlagProvider,
      featureFlagRepository
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId,
      module: 'feature-flags',
      action: 'get_flag_report',
      entityType: 'feature_flag',
      entityId: flagKey,
      payloadSummary: `Feature flag report generated: ${flagKey} for ${environment}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, report);
  }

  // GET /flags/:key - Get a specific flag
  if (pathname.startsWith('/flags/') && method === 'GET') {
    const match = pathname.match(/^\/flags\/([^/]+)$/);
    if (!match) {
      // Keep probing more specific subroutes such as /flags/:key/evaluate and /flags/:key/overrides.
    } else {
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
