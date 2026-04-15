/**
 * Access Control and Audit route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AccessControlService } from '@cvg-his-v2/module-access-control';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { UsersService } from '@cvg-his-v2/module-users';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface AccessControlRoutesHandlers {
  accessControl: AccessControlService;
  users: UsersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
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
        users: users.list().filter((user) => user.accountId === principal.user.accountId),
        memberships: {
          userTeams: users
            .list()
            .filter((user) => user.accountId === principal.user.accountId)
            .flatMap((user) =>
              accessControl.listMemberships(user.id).teams.map((team) => ({
                userId: user.id,
                teamId: team.id
              }))
            ),
          userSectors: users
            .list()
            .filter((user) => user.accountId === principal.user.accountId)
            .flatMap((user) =>
              accessControl.listMemberships(user.id).sectors.map((sector) => ({
                userId: user.id,
                sectorId: sector.id
              }))
            )
        },
        assignments: accessControl.listAssignments(),
        legacyRoles: users
          .list()
          .filter((user) => user.accountId === principal.user.accountId)
          .map((user) => ({
            userId: user.id,
            roleCodes: accessControl.getLegacyRoleCodes(user.id)
          }))
      })
    );
    return true;
  }

  // GET /access-control/teams
  if (pathname === '/access-control/teams' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    response.statusCode = 200;
    response.end(
      JSON.stringify({ items: accessControl.listTeams(principal.user.accountId) })
    );
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
    response.end(
      JSON.stringify({ items: accessControl.listSectors(principal.user.accountId) })
    );
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
    const payload = (await readJsonBody(request)) as { teamIds?: readonly string[] };
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
    const payload = (await readJsonBody(request)) as { sectorIds?: readonly string[] };
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
    const targetUser = users.getOrThrow(userId as never);
    if (targetUser.accountId !== principal.user.accountId) {
      throw new AuthenticationError('User not found for current account');
    }
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
  if (pathname === '/audit/events' && request.method === 'GET') {
    const principal = rp(request, 'audit.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'audit',
      action: 'read',
      entityType: 'audit-event',
      entityId: 'all',
      payloadSummary: 'Audit events inspected',
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items: audit.list() }));
    return true;
  }

  return false;
}