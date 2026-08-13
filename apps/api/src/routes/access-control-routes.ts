/**
 * Access Control and Audit route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type { AccessControlService } from '@cvg-his-v2/module-access-control';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { UsersService } from '@cvg-his-v2/module-users';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface AccessControlRoutesHandlers {
  accessControl: AccessControlService;
  users: UsersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function getUserForCurrentAccount(
  users: UsersService,
  userId: string,
  principal: AuthenticatedPrincipal
) {
  return users.getForAccountOrThrow(principal.user.accountId, userId as never);
}

function assertTeamForCurrentAccount(
  accessControl: AccessControlService,
  teamId: string,
  principal: AuthenticatedPrincipal
) {
  if (!accessControl.listTeams(principal.user.accountId).some((team) => team.id === teamId)) {
    throw new NotFoundError('Access team not found');
  }
}

function assertSectorForCurrentAccount(
  accessControl: AccessControlService,
  sectorId: string,
  principal: AuthenticatedPrincipal
) {
  if (
    !accessControl.listSectors(principal.user.accountId).some((sector) => sector.id === sectorId)
  ) {
    throw new NotFoundError('Access sector not found');
  }
}

function assertPermissionExists(accessControl: AccessControlService, permissionCode: string) {
  if (!accessControl.listPermissions().some((permission) => permission.code === permissionCode)) {
    throw new NotFoundError('Permission not found');
  }
}

function assertGrantSubjectForCurrentAccount(
  accessControl: AccessControlService,
  users: UsersService,
  input: { subjectType: 'user' | 'team' | 'sector'; subjectId: string },
  principal: AuthenticatedPrincipal
) {
  if (input.subjectType === 'user') {
    getUserForCurrentAccount(users, input.subjectId, principal);
    return;
  }
  if (input.subjectType === 'team') {
    assertTeamForCurrentAccount(accessControl, input.subjectId, principal);
    return;
  }
  assertSectorForCurrentAccount(accessControl, input.subjectId, principal);
}

export async function handleAccessControlRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AccessControlRoutesHandlers
): Promise<boolean> {
  const { accessControl, users, audit, requirePrincipal: rp } = handlers;

  // GET /access-control — full access control state
  if (pathname === '/access-control' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'access-control',
      action: 'read',
      entityType: 'role-permission-catalog',
      entityId: 'current',
      payloadSummary: 'Roles and permissions inspected',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        roles: accessControl.listRoles(),
        permissions: accessControl.listPermissions(),
        teams: accessControl.listTeams(principal.user.accountId),
        sectors: accessControl.listSectors(principal.user.accountId),
        users: users.list(principal.user.accountId),
        memberships: {
          userTeams: users.list(principal.user.accountId).flatMap((user) =>
            accessControl.listMemberships(user.id).teams.map((team) => ({
              userId: user.id,
              teamId: team.id
            }))
          ),
          userSectors: users.list(principal.user.accountId).flatMap((user) =>
            accessControl.listMemberships(user.id).sectors.map((sector) => ({
              userId: user.id,
              sectorId: sector.id
            }))
          )
        },
        assignments: {
          userPermissions: accessControl
            .listAssignments()
            .userPermissions.filter(
              (assignment) => assignment.accountId === principal.user.accountId
            ),
          teamPermissions: accessControl
            .listAssignments()
            .teamPermissions.filter(
              (assignment) => assignment.accountId === principal.user.accountId
            ),
          sectorPermissions: accessControl
            .listAssignments()
            .sectorPermissions.filter(
              (assignment) => assignment.accountId === principal.user.accountId
            )
        },
        legacyRoles: users.list(principal.user.accountId).map((user) => ({
          userId: user.id,
          roleCodes: accessControl.getLegacyRoleCodes(user.id)
        }))
      })
    );
    return true;
  }

  // GET /access-control/module-permission-matrix — RBAC/ABAC coverage by module, action and subject override
  if (pathname === '/access-control/module-permission-matrix' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    const items = accessControl.getModulePermissionMatrix(principal.user.accountId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'access-control',
      action: 'read_module_permission_matrix',
      entityType: 'module-permission-matrix',
      entityId: 'current',
      payloadSummary: `RBAC/ABAC module matrix inspected for ${items.length} module(s)`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        accountId: principal.user.accountId,
        items
      })
    );
    return true;
  }

  // GET /access-control/teams
  if (pathname === '/access-control/teams' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    response.statusCode = 200;
    response.end(JSON.stringify({ items: accessControl.listTeams(principal.user.accountId) }));
    return true;
  }

  // POST /access-control/teams
  if (pathname === '/access-control/teams' && request.method === 'POST') {
    const principal = rp(request, 'users.manage');
    const payload = (await readJsonBody(request)) as {
      code: string;
      name: string;
      description?: string | null;
    };
    const team = await accessControl.createTeam(principal.user.accountId, payload);
    response.statusCode = 201;
    response.end(JSON.stringify(team));
    return true;
  }

  // PATCH /access-control/teams/:teamId
  if (pathname.startsWith('/access-control/teams/') && request.method === 'PATCH') {
    const principal = rp(request, 'users.manage');
    const teamId = requireNonEmptyString(pathname.split('/')[3], 'teamId');
    assertTeamForCurrentAccount(accessControl, teamId, principal);
    const payload = (await readJsonBody(request)) as {
      code?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };
    const team = await accessControl.updateTeam(teamId as never, payload);
    response.statusCode = 200;
    response.end(JSON.stringify(team));
    return true;
  }

  // GET /access-control/org-sectors
  if (pathname === '/access-control/org-sectors' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    response.statusCode = 200;
    response.end(JSON.stringify({ items: accessControl.listSectors(principal.user.accountId) }));
    return true;
  }

  // POST /access-control/org-sectors
  if (pathname === '/access-control/org-sectors' && request.method === 'POST') {
    const principal = rp(request, 'users.manage');
    const payload = (await readJsonBody(request)) as {
      code: string;
      name: string;
      description?: string | null;
    };
    const sector = await accessControl.createSector(principal.user.accountId, payload);
    response.statusCode = 201;
    response.end(JSON.stringify(sector));
    return true;
  }

  // PATCH /access-control/org-sectors/:sectorId
  if (pathname.startsWith('/access-control/org-sectors/') && request.method === 'PATCH') {
    const principal = rp(request, 'users.manage');
    const sectorId = requireNonEmptyString(pathname.split('/')[3], 'sectorId');
    assertSectorForCurrentAccount(accessControl, sectorId, principal);
    const payload = (await readJsonBody(request)) as {
      code?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };
    const sector = await accessControl.updateSector(sectorId as never, payload);
    response.statusCode = 200;
    response.end(JSON.stringify(sector));
    return true;
  }

  // POST /access-control/users/:userId/teams
  if (
    pathname.startsWith('/access-control/users/') &&
    pathname.endsWith('/teams') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const payload = (await readJsonBody(request)) as { teamIds?: readonly string[] };
    for (const teamId of payload.teamIds ?? []) {
      assertTeamForCurrentAccount(accessControl, teamId, principal);
    }
    await accessControl.replaceUserTeams(userId as never, (payload.teamIds ?? []) as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  // POST /access-control/users/:userId/sectors
  if (
    pathname.startsWith('/access-control/users/') &&
    pathname.endsWith('/sectors') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const payload = (await readJsonBody(request)) as { sectorIds?: readonly string[] };
    for (const sectorId of payload.sectorIds ?? []) {
      assertSectorForCurrentAccount(accessControl, sectorId, principal);
    }
    await accessControl.replaceUserSectors(userId as never, (payload.sectorIds ?? []) as never);
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  // POST /access-control/users/:userId/roles
  if (
    pathname.startsWith('/access-control/users/') &&
    pathname.endsWith('/roles') &&
    request.method === 'POST'
  ) {
    const principal = rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const payload = (await readJsonBody(request)) as { roleCodes?: readonly string[] };
    await accessControl.replaceLegacyRoles(userId as never, payload.roleCodes ?? []);
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  // GET /access-control/users/:userId/effective
  if (
    pathname.startsWith('/access-control/users/') &&
    pathname.endsWith('/effective') &&
    request.method === 'GET'
  ) {
    const principal = rp(request, 'access.read');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    const targetUser = getUserForCurrentAccount(users, userId, principal);
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        user: targetUser,
        memberships: accessControl.listMemberships(targetUser.id),
        effectivePermissions: accessControl.getEffectivePermissions({
          accountId: targetUser.accountId,
          userId: targetUser.id,
          roleCodes: accessControl.getLegacyRoleCodes(targetUser.id)
        })
      })
    );
    return true;
  }

  // POST /access-control/grants
  if (pathname === '/access-control/grants' && request.method === 'POST') {
    const principal = rp(request, 'users.manage');
    const payload = (await readJsonBody(request)) as {
      subjectType: 'user' | 'team' | 'sector';
      subjectId: string;
      permissionCode: string;
      effect?: 'allow' | 'deny' | 'inherit';
    };
    assertPermissionExists(accessControl, payload.permissionCode);
    assertGrantSubjectForCurrentAccount(accessControl, users, payload, principal);
    await accessControl.setPermissionAssignment({
      accountId: principal.user.accountId,
      subjectType: payload.subjectType,
      subjectId: payload.subjectId,
      permissionCode: payload.permissionCode,
      effect: payload.effect
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  // GET /audit/events
  if (pathname === '/audit/operational-coverage' && request.method === 'GET') {
    const principal = rp(request, 'audit.read');
    const report = audit.getOperationalCoverageReport(principal.user.accountId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'audit',
      action: 'operational_coverage_read',
      entityType: 'audit-coverage',
      entityId: 'current',
      payloadSummary: `Operational audit coverage inspected coverage=${report.coveragePercent}% missing=${report.missingRequirements}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(report));
    return true;
  }

  // GET /audit/events
  if (pathname === '/audit/events' && request.method === 'GET') {
    const principal = rp(request, 'audit.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const moduleFilter = (url.searchParams.get('module') ?? '').trim().toLowerCase();
    const entityFilter = (url.searchParams.get('entity') ?? '').trim().toLowerCase();
    const correlationFilter = (url.searchParams.get('correlationId') ?? '').trim().toLowerCase();
    const queryFilter = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const entityTypes = url.searchParams
      .getAll('entityType')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const limit = Math.max(
      1,
      Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '100', 10) || 100)
    );
    const items = audit
      .list()
      .filter((event) => event.accountId === principal.user.accountId)
      .filter((event) => !moduleFilter || event.module.toLowerCase().includes(moduleFilter))
      .filter(
        (event) =>
          !entityFilter ||
          [event.entityType, event.entityId, event.payloadSummary].some((value) =>
            String(value ?? '')
              .toLowerCase()
              .includes(entityFilter)
          )
      )
      .filter(
        (event) =>
          !correlationFilter || event.correlationId.toLowerCase().includes(correlationFilter)
      )
      .filter(
        (event) => entityTypes.length === 0 || entityTypes.includes(event.entityType.toLowerCase())
      )
      .filter(
        (event) =>
          !queryFilter ||
          [
            event.module,
            event.action,
            event.actorId,
            event.entityType,
            event.entityId,
            event.correlationId,
            event.payloadSummary
          ].some((value) =>
            String(value ?? '')
              .toLowerCase()
              .includes(queryFilter)
          )
      )
      .slice(0, limit);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'audit',
      action: 'read',
      entityType: 'audit-event',
      entityId: 'all',
      payloadSummary: `Audit events inspected module=${moduleFilter || '-'} entity=${entityFilter || '-'} correlation=${correlationFilter || '-'} q=${queryFilter || '-'} limit=${limit}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  return false;
}
