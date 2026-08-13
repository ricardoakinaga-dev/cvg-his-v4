import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateOwnerRequest,
  UpdateOwnerRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface OwnersRoutesHandlers {
  owners: OwnersService;
  patients?: PatientsService;
  encounters?: EncountersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  enforceAbac?: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    attrs: ResourceAttributes,
    request: IncomingMessage
  ) => void;
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
  const { owners, patients, encounters, audit, requirePrincipal, enforceAbac } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');
  const sectorCodeHeader = request.headers['x-sector-code'];
  const sectorCode =
    typeof sectorCodeHeader === 'string'
      ? sectorCodeHeader.trim()
      : Array.isArray(sectorCodeHeader)
        ? sectorCodeHeader[0]?.trim()
        : undefined;

  // GET /owners - List owners
  if (pathname === '/owners' && method === 'GET') {
    const principal = requirePrincipal(request, 'owners.read');
    if (sectorCode) {
      enforceAbac?.(
        'owners.read',
        principal,
        {
          resourceType: 'owner',
          resourceId: 'all',
          accountId: principal.user.accountId,
          sectorCode
        },
        request
      );
    }
    const query = url.searchParams.get('q') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    const financialResponsible = url.searchParams.get('financialResponsible');

    let items = owners.listByAccount(principal.user.accountId as never, query);

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
    if (sectorCode) {
      enforceAbac?.(
        'owners.manage',
        principal,
        {
          resourceType: 'owner',
          resourceId: 'new',
          accountId: principal.user.accountId,
          sectorCode
        },
        request
      );
    }
    const body = (await readJsonBody(request)) as CreateOwnerRequest;

    const owner = owners.create(principal.user.accountId, body);
    await owners.waitForPersistence();

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

  if (pathname.match(/^\/owners\/[^/]+\/summary$/) && method === 'GET') {
    const match = pathname.match(/^\/owners\/([^/]+)\/summary$/);
    if (!match) return false;
    if (!patients || !encounters) return false;

    const principal = requirePrincipal(request, 'owners.read');
    const ownerId = match[1];
    const owner = owners.getForAccountOrThrow(
      ownerId as never,
      principal.user.accountId as never
    );
    const relatedPatients = patients
      .listByAccount(principal.user.accountId as never)
      .filter((patient) => patient.primaryOwnerId === owner.id)
      .map((patient) => ({
        id: patient.id,
        name: patient.name,
        species: patient.species,
        breed: patient.breed ?? null
      }));
    const totalEncounters = encounters
      .listByAccount(principal.user.accountId as never)
      .filter((encounter) => encounter.ownerId === owner.id).length;

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'owners',
      action: 'read_summary',
      entityType: 'owner',
      entityId: owner.id,
      payloadSummary: `Owner summary generated for ${owner.fullName}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      owner,
      patients: relatedPatients,
      stats: {
        totalPatients: relatedPatients.length,
        totalEncounters
      }
    });
  }

  // GET /owners/:id - Get owner by ID
  if (pathname.startsWith('/owners/') && method === 'GET') {
    const match = pathname.match(/^\/owners\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'owners.read');
    const ownerId = match[1];
    if (sectorCode) {
      enforceAbac?.(
        'owners.read',
        principal,
        {
          resourceType: 'owner',
          resourceId: ownerId,
          accountId: principal.user.accountId,
          sectorCode
        },
        request
      );
    }

    const owner = owners.getForAccountOrThrow(
      ownerId as never,
      principal.user.accountId as never
    );

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
    if (sectorCode) {
      enforceAbac?.(
        'owners.manage',
        principal,
        {
          resourceType: 'owner',
          resourceId: ownerId,
          accountId: principal.user.accountId,
          sectorCode
        },
        request
      );
    }
    const body = (await readJsonBody(request)) as UpdateOwnerRequest;

    const owner = owners.update(ownerId as never, body, principal.user.accountId as never);
    await owners.waitForPersistence();

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
    if (sectorCode) {
      enforceAbac?.(
        'owners.manage',
        principal,
        {
          resourceType: 'owner',
          resourceId: ownerId,
          accountId: principal.user.accountId,
          sectorCode
        },
        request
      );
    }

    const owner = owners.update(
      ownerId as never,
      { status: 'inactive' },
      principal.user.accountId as never
    );
    await owners.waitForPersistence();

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
