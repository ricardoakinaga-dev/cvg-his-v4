/**
 * Access Control and Audit route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type { AccessControlService, ResourceAttributes } from '@cvg-his-v2/module-access-control';
import {
  decodeAuditCursor,
  encodeAuditCursor,
  paginateAuditEvents,
  type AuditListPage,
  type AuditListPageQuery,
  type AuditService
} from '@cvg-his-v2/module-audit';
import type { UsersService } from '@cvg-his-v2/module-users';
import type { JsonValue } from '@cvg-his-v2/shared-database';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AppError, AuthenticationError, ValidationError } from '@cvg-his-v2/shared-errors';
import {
  requireBoolean,
  requireEnum,
  requireNonEmptyString,
  requireStringArray
} from '@cvg-his-v2/shared-validation';

import { appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandInput, TenantCommandRunner } from '../helpers/tenant-command.js';

export interface AccessControlRoutesHandlers {
  accessControl: AccessControlService;
  users: UsersService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    resource: ResourceAttributes,
    request: IncomingMessage
  ) => void;
  runCommand?: TenantCommandRunner;
  beginAccessControlMutation?: (accountId: AccountId) => void;
  refreshAccessControl?: (accountId: AccountId) => Promise<void>;
}

const SUBJECT_TYPES = ['user', 'team', 'sector'] as const;
const ASSIGNMENT_EFFECTS = ['allow', 'deny', 'inherit'] as const;
const MAX_ACCESS_FIELD_LENGTH = 255;
const MAX_ACCESS_MEMBERSHIPS = 100;
const MAX_AUDIT_FILTER_VALUES = 20;

type AccessSubjectType = (typeof SUBJECT_TYPES)[number];
type AssignmentEffect = (typeof ASSIGNMENT_EFFECTS)[number];

function requireObjectPayload(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return payload as Record<string, unknown>;
}

function requireBoundedString(
  value: unknown,
  field: string,
  maxLength = MAX_ACCESS_FIELD_LENGTH
): string {
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
    throw new ValidationError(
      `Field ${field} cannot contain more than ${MAX_ACCESS_MEMBERSHIPS} items`
    );
  }
  return [
    ...new Set(values.map((item, index) => requireBoundedString(item, `${field}[${index}]`)))
  ];
}

function normalizeAuditFilter(value: string | null, field: string): string | undefined {
  const normalized = (value ?? '').trim();
  return normalized ? requireBoundedString(normalized, field).toLowerCase() : undefined;
}

function enforceAuditEventsAbac(
  enforceAbac: AccessControlRoutesHandlers['enforceAbac'],
  principal: AuthenticatedPrincipal,
  request: IncomingMessage
): void {
  enforceAbac(
    'audit.read',
    principal,
    {
      resourceType: 'audit_entry',
      resourceId: 'events',
      accountId: principal.user.accountId
    },
    request
  );
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

async function appendAccessMutationAudit(
  audit: AuditService,
  principal: AuthenticatedPrincipal,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  correlationId: string
): Promise<void> {
  await appendAuditAndWait(audit, {
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
  if (
    !accessControl.listSectors(principal.user.accountId).some((sector) => sector.id === sectorId)
  ) {
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
  const { accessControl, users, audit, requirePrincipal: rp, enforceAbac } = handlers;
  const runCommand =
    handlers.runCommand ??
    (async <T>(input: TenantCommandInput<T>): Promise<T> => {
      let result: T;
      try {
        result = await input.command();
      } catch (error) {
        await input.onRollback?.();
        throw error;
      }
      await input.onCommit?.();
      return result;
    });
  const runAccessMutation = async <T>(input: TenantCommandInput<T>): Promise<T> => {
    const refresh = handlers.refreshAccessControl
      ? () => handlers.refreshAccessControl!(input.accountId as AccountId)
      : undefined;
    if (refresh && handlers.beginAccessControlMutation) {
      handlers.beginAccessControlMutation(input.accountId as AccountId);
    }
    return runCommand({
      ...input,
      onRollback: refresh,
      onCommit: refresh
    });
  };

  // GET /access-control — full access control state
  if (pathname === '/access-control' && request.method === 'GET') {
    const principal = await rp(request, 'access.read');
    await appendAuditAndWait(audit, {
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
    const principal = await rp(request, 'access.read');
    const items = accessControl.getModulePermissionMatrix(principal.user.accountId);
    await appendAuditAndWait(audit, {
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
    const principal = await rp(request, 'access.read');
    const items = accessControl.listTeams(principal.user.accountId);
    await appendAccessMutationAudit(
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
    const principal = await rp(request, 'users.manage');
    const payload = parseEntityCreatePayload(await readJsonBody(request));
    const team = await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.team-create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await accessControl.createTeam(principal.user.accountId, payload);
        await appendAccessMutationAudit(
          audit,
          principal,
          'team_created',
          'access-team',
          created.id,
          `Access team created code=${created.code}`,
          correlationId
        );
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(team));
    return true;
  }

  // PATCH /access-control/teams/:teamId
  if (pathname.startsWith('/access-control/teams/') && request.method === 'PATCH') {
    const principal = await rp(request, 'users.manage');
    const teamId = requireNonEmptyString(pathname.split('/')[3], 'teamId');
    assertTeamForCurrentAccount(accessControl, teamId, principal);
    const payload = parseEntityPatchPayload(await readJsonBody(request));
    const team = await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.team-update',
      payload: {
        teamId,
        ...(payload as unknown as Record<string, unknown>)
      } as unknown as JsonValue,
      command: async () => {
        const updated = await accessControl.updateTeam(teamId as never, payload);
        await appendAccessMutationAudit(
          audit,
          principal,
          'team_updated',
          'access-team',
          updated.id,
          `Access team updated code=${updated.code} status=${updated.status}`,
          correlationId
        );
        return updated;
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify(team));
    return true;
  }

  // GET /access-control/org-sectors
  if (pathname === '/access-control/org-sectors' && request.method === 'GET') {
    const principal = await rp(request, 'access.read');
    const items = accessControl.listSectors(principal.user.accountId);
    await appendAccessMutationAudit(
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
    const principal = await rp(request, 'users.manage');
    const payload = parseEntityCreatePayload(await readJsonBody(request));
    const sector = await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.sector-create',
      payload: payload as unknown as JsonValue,
      command: async () => {
        const created = await accessControl.createSector(principal.user.accountId, payload);
        await appendAccessMutationAudit(
          audit,
          principal,
          'sector_created',
          'access-sector',
          created.id,
          `Access sector created code=${created.code}`,
          correlationId
        );
        return created;
      }
    });
    response.statusCode = 201;
    response.end(JSON.stringify(sector));
    return true;
  }

  // PATCH /access-control/org-sectors/:sectorId
  if (pathname.startsWith('/access-control/org-sectors/') && request.method === 'PATCH') {
    const principal = await rp(request, 'users.manage');
    const sectorId = requireNonEmptyString(pathname.split('/')[3], 'sectorId');
    assertSectorForCurrentAccount(accessControl, sectorId, principal);
    const payload = parseEntityPatchPayload(await readJsonBody(request));
    const sector = await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.sector-update',
      payload: {
        sectorId,
        ...(payload as unknown as Record<string, unknown>)
      } as unknown as JsonValue,
      command: async () => {
        const updated = await accessControl.updateSector(sectorId as never, payload);
        await appendAccessMutationAudit(
          audit,
          principal,
          'sector_updated',
          'access-sector',
          updated.id,
          `Access sector updated code=${updated.code} status=${updated.status}`,
          correlationId
        );
        return updated;
      }
    });
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
    const principal = await rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const body = requireObjectPayload(await readJsonBody(request));
    const teamIds =
      body.teamIds === undefined ? [] : requireBoundedStringArray(body.teamIds, 'teamIds');
    for (const teamId of teamIds) {
      assertTeamForCurrentAccount(accessControl, teamId, principal);
    }
    await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.user-teams-replace',
      payload: { userId, teamIds } as unknown as JsonValue,
      command: async () => {
        await accessControl.replaceUserTeams(userId as never, teamIds as never);
        await appendAccessMutationAudit(
          audit,
          principal,
          'user_teams_replaced',
          'user-access-membership',
          userId,
          `User teams replaced count=${teamIds.length}`,
          correlationId
        );
      }
    });
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
    const principal = await rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const body = requireObjectPayload(await readJsonBody(request));
    const sectorIds =
      body.sectorIds === undefined ? [] : requireBoundedStringArray(body.sectorIds, 'sectorIds');
    for (const sectorId of sectorIds) {
      assertSectorForCurrentAccount(accessControl, sectorId, principal);
    }
    await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.user-sectors-replace',
      payload: { userId, sectorIds } as unknown as JsonValue,
      command: async () => {
        await accessControl.replaceUserSectors(userId as never, sectorIds as never);
        await appendAccessMutationAudit(
          audit,
          principal,
          'user_sectors_replaced',
          'user-access-membership',
          userId,
          `User sectors replaced count=${sectorIds.length}`,
          correlationId
        );
      }
    });
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
    const principal = await rp(request, 'users.manage');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    getUserForCurrentAccount(users, userId, principal);
    const body = requireObjectPayload(await readJsonBody(request));
    const roleCodes =
      body.roleCodes === undefined ? [] : requireBoundedStringArray(body.roleCodes, 'roleCodes');
    const knownRoleCodes = new Set(accessControl.listRoles().map((role) => role.code));
    for (const roleCode of roleCodes) {
      if (!knownRoleCodes.has(roleCode)) {
        throw new ValidationError(`Unknown role code: ${roleCode}`);
      }
    }
    await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.user-roles-replace',
      payload: { userId, roleCodes } as unknown as JsonValue,
      command: async () => {
        await accessControl.replaceLegacyRoles(userId as never, roleCodes);
        await appendAccessMutationAudit(
          audit,
          principal,
          'user_roles_replaced',
          'user-access-role',
          userId,
          `User legacy roles replaced count=${roleCodes.length}`,
          correlationId
        );
      }
    });
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
    const principal = await rp(request, 'access.read');
    const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
    const targetUser = getUserForCurrentAccount(users, userId, principal);
    await appendAccessMutationAudit(
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
    const principal = await rp(request, 'users.manage');
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectType = parseSubjectType(body.subjectType);
    const subjectId = requireBoundedString(body.subjectId, 'subjectId', 128);
    const permissionCode = requireBoundedString(body.permissionCode, 'permissionCode', 128);
    const effect: AssignmentEffect =
      body.effect === undefined
        ? 'inherit'
        : requireEnum(body.effect, 'effect', ASSIGNMENT_EFFECTS);
    assertPermissionExists(accessControl, permissionCode);
    assertGrantSubjectForCurrentAccount(
      accessControl,
      users,
      { subjectType, subjectId },
      principal
    );
    await runAccessMutation({
      request,
      accountId: principal.user.accountId,
      actorUserId: principal.user.id,
      correlationId,
      operation: 'access-control.permission-assignment',
      payload: { subjectType, subjectId, permissionCode, effect },
      command: async () => {
        await accessControl.setPermissionAssignment({
          accountId: principal.user.accountId,
          subjectType,
          subjectId,
          permissionCode,
          effect
        });
        await appendAccessMutationAudit(
          audit,
          principal,
          effect === 'inherit' ? 'permission_inherited' : 'permission_granted',
          'access-permission-assignment',
          subjectId,
          `Permission assignment changed permission=${permissionCode} subjectType=${subjectType} effect=${effect}`,
          correlationId
        );
      }
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  // GET /audit/events
  if (pathname === '/audit/operational-coverage' && request.method === 'GET') {
    const principal = await rp(request, 'audit.read');
    enforceAuditEventsAbac(enforceAbac, principal, request);
    let report: Awaited<ReturnType<AuditService['getOperationalCoverageReport']>>;
    try {
      report = await audit.getOperationalCoverageReport(principal.user.accountId);
    } catch {
      throw new AppError(
        'AUDIT_COVERAGE_UNAVAILABLE',
        'Operational audit coverage is temporarily unavailable',
        503
      );
    }
    await appendAuditAndWait(audit, {
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
    const principal = await rp(request, 'audit.read');
    enforceAuditEventsAbac(enforceAbac, principal, request);
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const moduleFilter = normalizeAuditFilter(url.searchParams.get('module'), 'module');
    const entityFilter = normalizeAuditFilter(url.searchParams.get('entity'), 'entity');
    const correlationFilter = normalizeAuditFilter(
      url.searchParams.get('correlationId'),
      'correlationId'
    );
    const queryFilter = normalizeAuditFilter(url.searchParams.get('q'), 'q');
    const rawEntityTypes = url.searchParams.getAll('entityType');
    if (rawEntityTypes.length > MAX_AUDIT_FILTER_VALUES) {
      throw new ValidationError(
        `Field entityType cannot contain more than ${MAX_AUDIT_FILTER_VALUES} items`
      );
    }
    const entityTypes = [
      ...new Set(
        rawEntityTypes
          .map((value, index) => {
            const normalized = value.trim();
            return normalized
              ? requireBoundedString(normalized, `entityType[${index}]`).toLowerCase()
              : undefined;
          })
          .filter((value): value is string => Boolean(value))
      )
    ];
    const limit = Math.max(
      1,
      Math.min(200, Number.parseInt(url.searchParams.get('limit') ?? '100', 10) || 100)
    );
    const cursorValue = url.searchParams.get('cursor');
    let cursor;
    if (cursorValue) {
      try {
        cursor = decodeAuditCursor(cursorValue);
      } catch {
        throw new ValidationError('Invalid audit cursor');
      }
    }
    const query: AuditListPageQuery = {
      accountId: principal.user.accountId,
      ...(cursor ? { cursor } : {}),
      filters: {
        module: moduleFilter || undefined,
        entity: entityFilter || undefined,
        correlationId: correlationFilter || undefined,
        query: queryFilter || undefined,
        entityTypes
      },
      limit
    };
    let page: AuditListPage;
    if (typeof audit.listPage === 'function') {
      page = await audit.listPage(query);
    } else {
      const fallback = paginateAuditEvents(audit.list(), query);
      const lastItem = fallback.items.at(-1);
      page =
        fallback.hasMore && lastItem
          ? {
              items: fallback.items,
              nextCursor: encodeAuditCursor({
                occurredAt: lastItem.occurredAt,
                eventId: lastItem.eventId
              })
            }
          : { items: fallback.items };
    }
    await appendAuditAndWait(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'audit',
      action: 'read',
      entityType: 'audit-event',
      entityId: 'all',
      payloadSummary: `Audit events inspected module=${moduleFilter || '-'} entity=${entityFilter || '-'} correlation=${correlationFilter || '-'} q=${queryFilter || '-'} limit=${limit} cursor=${cursor ? 'yes' : 'no'}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(page));
    return true;
  }

  return false;
}
