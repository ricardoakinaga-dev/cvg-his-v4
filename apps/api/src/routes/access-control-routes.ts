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
import { AuthenticationError, ValidationError } from '@cvg-his-v2/shared-errors';
import {
  requireBoolean,
  requireEnum,
  requireNonEmptyString,
  requireStringArray
} from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface AccessControlRoutesHandlers {
  accessControl: AccessControlService;
  users: UsersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

const SUBJECT_TYPES = ['user', 'team', 'sector'] as const;
const ASSIGNMENT_EFFECTS = ['allow', 'deny', 'inherit'] as const;
const MAX_ACCESS_FIELD_LENGTH = 255;
const MAX_ACCESS_MEMBERSHIPS = 100;

type AccessSubjectType = (typeof SUBJECT_TYPES)[number];
type AssignmentEffect = (typeof ASSIGNMENT_EFFECTS)[number];

function requireObjectPayload(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return payload as Record<string, unknown>;
}

function requireBoundedString(value: unknown, field: string, maxLength = MAX_ACCESS_FIELD_LENGTH): string {
  const resolved = requireNonEmptyString(value, field);
  if (resolved.length > maxLength) {
    throw new ValidationError(`Field ${field} must have at most ${maxLength} characters`);
  }
  return resolved;
}

function requireNullableBoundedString(
  value: unknown,
  field: string,
  maxLength = MAX_ACCESS_FIELD_LENGTH
): string | null | undefined {
  if (value === undefined || value === null) return value as null | undefined;
  return requireBoundedString(value, field, maxLength);
}

function requireBoundedStringArray(value: unknown, field: string): readonly string[] {
  const values = requireStringArray(value, field);
  if (values.length > MAX_ACCESS_MEMBERSHIPS) {
    throw new ValidationError(`Field ${field} cannot contain more than ${MAX_ACCESS_MEMBERSHIPS} items`);
  }
  return [...new Set(values)];
}

function parseEntityCreatePayload(payload: unknown): {
  code: string;
  name: string;
  description?: string | null;
} {
  const body = requireObjectPayload(payload);
  return {
    code: requireBoundedString(body.code, 'code', 128),
    name: requireBoundedString(body.name, 'name'),
    description: requireNullableBoundedString(body.description, 'description')
  };
}

function parseEntityPatchPayload(payload: unknown): {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
} {
  const body = requireObjectPayload(payload);
  return {
    ...(body.code !== undefined ? { code: requireBoundedString(body.code, 'code', 128) } : {}),
    ...(body.name !== undefined ? { name: requireBoundedString(body.name, 'name') } : {}),
    ...(body.description !== undefined
      ? { description: requireNullableBoundedString(body.description, 'description') }
      : {}),
    ...(body.isActive !== undefined ? { isActive: requireBoolean(body.isActive, 'isActive') } : {})
  };
}

function parseSubjectType(value: unknown): AccessSubjectType {
  return requireEnum(value, 'subjectType', SUBJECT_TYPES);
}

function appendAccessMutationAudit(
  audit: AuditService,
  principal: AuthenticatedPrincipal,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  correlationId: string
): void {
  appendAudit(audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'access-control',
    action,
    entityType,
    entityId,
    payloadSummary,
    riskLevel: 'high',
    correlationId
  });
}

function getUserForCurrentAccount(
  users: UsersService,
  userId: string,
  principal: AuthenticatedPrincipal
) {
  const targetUser = users.getOrThrow(userId as never);
  if (targetUser.accountId !== principal.user.accountId) {
    throw new AuthenticationError('User not found for current account');
  }
  return targetUser;
}

function assertTeamForCurrentAccount(
  accessControl: AccessControlService,
  teamId: string,
  principal: AuthenticatedPrincipal
) {
  if (!accessControl.listTeams(principal.user.accountId).some((team) => team.id === teamId)) {
    throw new AuthenticationError('Access team not found for current account');
  }
}

function assertSectorForCurrentAccount(
  accessControl: AccessControlService,
  sectorId: string,
  principal: AuthenticatedPrincipal
) {
  if (!accessControl.listSectors(principal.user.accountId).some((sector) => sector.id === sectorId)) {
    throw new AuthenticationError('Access sector not found for current account');
  }
}

function assertPermissionExists(accessControl: AccessControlService, permissionCode: string) {
  if (!accessControl.listPermissions().some((permission) => permission.code === permissionCode)) {
    throw new AuthenticationError('Permission not found for current account');
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
        assignments: {
          userPermissions: accessControl
            .listAssignments()
            .userPermissions.filter((assignment) => assignment.accountId === principal.user.accountId),
          teamPermissions: accessControl
            .listAssignments()
            .teamPermissions.filter((assignment) => assignment.accountId === principal.user.accountId),
          sectorPermissions: accessControl
            .listAssignments()
            .sectorPermissions.filter((assignment) => assignment.accountId === principal.user.accountId)
        },
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
    const items = accessControl.listTeams(principal.user.accountId);
    appendAccessMutationAudit(
      audit,
      principal,
      'teams_read',
      'access-team',
      'current',
      `Access teams inspected count=${items.length}`,
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /access-control/teams
  if (pathname === '/access-control/teams' && request.method === 'POST') {
    const principal = rp(request, 'users.manage');
    const payload = parseEntityCreatePayload(await readJsonBody(request));
    const team = await accessControl.createTeam(principal.user.accountId, payload);
    appendAccessMutationAudit(
      audit,
      principal,
      'team_created',
      'access-team',
      team.id,
      `Access team created code=${team.code}`,
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(team));
    return true;
  }

  // PATCH /access-control/teams/:teamId
  if (pathname.startsWith('/access-control/teams/') && request.method === 'PATCH') {
    const principal = rp(request, 'users.manage');
    const teamId = requireNonEmptyString(pathname.split('/')[3], 'teamId');
    assertTeamForCurrentAccount(accessControl, teamId, principal);
    const payload = parseEntityPatchPayload(await readJsonBody(request));
    const team = await accessControl.updateTeam(teamId as never, payload);
    appendAccessMutationAudit(
      audit,
      principal,
      'team_updated',
      'access-team',
      team.id,
      `Access team updated code=${team.code} status=${team.status}`,
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(team));
    return true;
  }

  // GET /access-control/org-sectors
  if (pathname === '/access-control/org-sectors' && request.method === 'GET') {
    const principal = rp(request, 'access.read');
    const items = accessControl.listSectors(principal.user.accountId);
    appendAccessMutationAudit(
      audit,
      principal,
      'sectors_read',
      'access-sector',
      'current',
      `Access sectors inspected count=${items.length}`,
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /access-control/org-sectors
  if (pathname === '/access-control/org-sectors' && request.method === 'POST') {
    const principal = rp(request, 'users.manage');
    const payload = parseEntityCreatePayload(await readJsonBody(request));
    const sector = await accessControl.createSector(principal.user.accountId, payload);
    appendAccessMutationAudit(
      audit,
      principal,
      'sector_created',
      'access-sector',
      sector.id,
      `Access sector created code=${sector.code}`,
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(sector));
    return true;
  }

  // PATCH /access-control/org-sectors/:sectorId
  if (pathname.startsWith('/access-control/org-sectors/') && request.method === 'PATCH') {
    const principal = rp(request, 'users.manage');
    const sectorId = requireNonEmptyString(pathname.split('/')[3], 'sectorId');
    assertSectorForCurrentAccount(accessControl, sectorId, principal);
    const payload = parseEntityPatchPayload(await readJsonBody(request));
    const sector = await accessControl.updateSector(sectorId as never, payload);
    appendAccessMutationAudit(
      audit,
      principal,
      'sector_updated',
      'access-sector',
      sector.id,
      `Access sector updated code=${sector.code} status=${sector.status}`,
      correlationId
    );
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
    const body = requireObjectPayload(await readJsonBody(request));
    const teamIds = body.teamIds === undefined ? [] : requireBoundedStringArray(body.teamIds, 'teamIds');
    for (const teamId of teamIds) {
      assertTeamForCurrentAccount(accessControl, teamId, principal);
    }
    await accessControl.replaceUserTeams(userId as never, teamIds as never);
    appendAccessMutationAudit(
      audit,
      principal,
      'user_teams_replaced',
      'user-access-membership',
      userId,
      `User teams replaced count=${teamIds.length}`,
      correlationId
    );
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
    const body = requireObjectPayload(await readJsonBody(request));
    const sectorIds = body.sectorIds === undefined ? [] : requireBoundedStringArray(body.sectorIds, 'sectorIds');
    for (const sectorId of sectorIds) {
      assertSectorForCurrentAccount(accessControl, sectorId, principal);
    }
    await accessControl.replaceUserSectors(userId as never, sectorIds as never);
    appendAccessMutationAudit(
      audit,
      principal,
      'user_sectors_replaced',
      'user-access-membership',
      userId,
      `User sectors replaced count=${sectorIds.length}`,
      correlationId
    );
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
    const body = requireObjectPayload(await readJsonBody(request));
    const roleCodes = body.roleCodes === undefined ? [] : requireBoundedStringArray(body.roleCodes, 'roleCodes');
    const knownRoleCodes = new Set(accessControl.listRoles().map((role) => role.code));
    for (const roleCode of roleCodes) {
      if (!knownRoleCodes.has(roleCode)) {
        throw new ValidationError(`Unknown role code: ${roleCode}`);
      }
    }
    await accessControl.replaceLegacyRoles(userId as never, roleCodes);
    appendAccessMutationAudit(
      audit,
      principal,
      'user_roles_replaced',
      'user-access-role',
      userId,
      `User legacy roles replaced count=${roleCodes.length}`,
      correlationId
    );
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
    appendAccessMutationAudit(
      audit,
      principal,
      'user_effective_permissions_read',
      'user-access-profile',
      targetUser.id,
      'Effective permissions inspected for an account-local user',
      correlationId
    );
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
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectType = parseSubjectType(body.subjectType);
    const subjectId = requireBoundedString(body.subjectId, 'subjectId', 128);
    const permissionCode = requireBoundedString(body.permissionCode, 'permissionCode', 128);
    const effect: AssignmentEffect =
      body.effect === undefined
        ? 'inherit'
        : requireEnum(body.effect, 'effect', ASSIGNMENT_EFFECTS);
    assertPermissionExists(accessControl, permissionCode);
    assertGrantSubjectForCurrentAccount(accessControl, users, { subjectType, subjectId }, principal);
    await accessControl.setPermissionAssignment({
      accountId: principal.user.accountId,
      subjectType,
      subjectId,
      permissionCode,
      effect
    });
    appendAccessMutationAudit(
      audit,
      principal,
      effect === 'inherit' ? 'permission_inherited' : 'permission_granted',
      'access-permission-assignment',
      subjectId,
      `Permission assignment changed permission=${permissionCode} subjectType=${subjectType} effect=${effect}`,
      correlationId
    );
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
    const entityTypes = url.searchParams.getAll('entityType').map((value) => value.trim().toLowerCase()).filter(Boolean);
    const limit = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '100', 10) || 100));
    const items = audit
      .list()
      .filter((event) => event.accountId === principal.user.accountId)
      .filter((event) => !moduleFilter || event.module.toLowerCase().includes(moduleFilter))
      .filter((event) => !entityFilter || [event.entityType, event.entityId, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(entityFilter)))
      .filter((event) => !correlationFilter || event.correlationId.toLowerCase().includes(correlationFilter))
      .filter((event) => entityTypes.length === 0 || entityTypes.includes(event.entityType.toLowerCase()))
      .filter((event) => !queryFilter || [event.module, event.action, event.actorId, event.entityType, event.entityId, event.correlationId, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(queryFilter)))
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
