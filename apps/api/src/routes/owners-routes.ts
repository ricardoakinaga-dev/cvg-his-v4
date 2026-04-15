import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type {
  CreateOwnerRequest,
  UpdateOwnerRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface OwnersRoutesHandlers {
  owners: OwnersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleOwnersRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: OwnersRoutesHandlers
): Promise<boolean> {
  const { owners, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  // GET /owners - List owners
  if (pathname === '/owners' && method === 'GET') {
    const principal = requirePrincipal(request, 'owners.read');
    const query = url.searchParams.get('q') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const financialResponsible = url.searchParams.get('financialResponsible');

    let items = owners.list(query);

    if (status === 'active' || status === 'inactive') {
      items = items.filter((owner) => owner.status === status);
    }

    if (financialResponsible === 'true' || financialResponsible === 'false') {
      items = items.filter(
        (owner) => owner.financialResponsible === (financialResponsible === 'true')
      );
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'list',
      entityType: 'owner',
      entityId: query ?? 'all',
      payloadSummary: 'Owner registry listed',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, { items });
  }

  // POST /owners - Create owner
  if (pathname === '/owners' && method === 'POST') {
    const principal = requirePrincipal(request, 'owners.manage');
    const body = (await readJsonBody(request)) as CreateOwnerRequest;

    const owner = owners.create(principal.user.accountId, body);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'create',
      entityType: 'owner',
      entityId: owner.id,
      payloadSummary: `Owner ${owner.fullName} created`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, owner);
  }

  // GET /owners/:id - Get owner by ID
  if (pathname.startsWith('/owners/') && method === 'GET') {
    const match = pathname.match(/^\/owners\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'owners.read');
    const ownerId = match[1];

    const owner = owners.getOrThrow(ownerId as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'read',
      entityType: 'owner',
      entityId: owner.id,
      payloadSummary: `Owner ${owner.fullName} inspected`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, owner);
  }

  // PATCH /owners/:id - Update owner
  if (pathname.startsWith('/owners/') && method === 'PATCH') {
    const match = pathname.match(/^\/owners\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'owners.manage');
    const ownerId = match[1];
    const body = (await readJsonBody(request)) as UpdateOwnerRequest;

    const owner = owners.update(ownerId as never, body);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'update',
      entityType: 'owner',
      entityId: owner.id,
      payloadSummary: `Owner ${owner.fullName} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, owner);
  }

  // DELETE /owners/:id - Soft delete owner
  if (pathname.startsWith('/owners/') && method === 'DELETE') {
    const match = pathname.match(/^\/owners\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'owners.manage');
    const ownerId = match[1];

    const owner = owners.update(ownerId as never, { status: 'inactive' });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'delete_owner',
      entityType: 'owner',
      entityId: ownerId,
      payloadSummary: `Owner soft-deleted: ${owner.fullName}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
