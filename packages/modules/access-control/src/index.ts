import { AppError, ForbiddenError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccessAssignmentEffect,
  AccessMembershipSummary,
  AccessModulePermissionMatrixEntry,
  AccessRoutineAction,
  AccessPermissionAssignmentSummary,
  AccessProfile,
  AccessSectorId,
  AccessSectorSummary,
  AccessTeamId,
  AccessTeamSummary,
  AccountId,
  EffectivePermissionSource,
  EffectivePermissionSummary,
  PermissionId,
  PermissionDefinition,
  RoleId,
  RoleDefinition,
  UserId,
  UserSummary
} from '@cvg-his-v2/shared-types';
import {
  V2_ACCESS_CONTROL_PERMISSION_SEEDS,
  V2_ACCESS_CONTROL_ROLE_SEEDS
} from '@cvg-his/rbac';
import {
  DatabaseAccessControlRepository,
  type AccessControlRepository,
  type AccessPermissionAssignmentRecord,
  type PermissionRecord,
  type RoleRecord
} from './repositories/database-access-control.repository.js';

const permissionCatalog: readonly PermissionDefinition[] =
  V2_ACCESS_CONTROL_PERMISSION_SEEDS.map((permission) => ({
    id: permission.id as PermissionId,
    code: permission.key,
    module: permission.module,
    description: permission.description
  }));

const roleCatalog: readonly RoleDefinition[] = V2_ACCESS_CONTROL_ROLE_SEEDS.map((role) => ({
  id: role.id as RoleId,
  code: role.name,
  name: role.displayName,
  description: role.description,
  permissionCodes: [...role.permissionCodes]
}));
const roleMap = new Map(roleCatalog.map((role) => [role.code, role]));

const routineActions: readonly AccessRoutineAction[] = [
  'consult',
  'insert',
  'update',
  'delete',
  'execute',
  'admin'
];

function resolveRoutineActions(permissionCode: string): readonly AccessRoutineAction[] {
  const normalized = permissionCode.toLowerCase();
  if (normalized.includes('.admin')) {
    return ['consult', 'insert', 'update', 'delete', 'execute', 'admin'];
  }
  if (normalized.includes('.manage')) {
    return ['consult', 'insert', 'update', 'delete', 'execute'];
  }

  const actions = new Set<AccessRoutineAction>();
  if (
    normalized.includes('.read') ||
    normalized.includes('.view') ||
    normalized.includes('.consult') ||
    normalized.includes('.list')
  ) {
    actions.add('consult');
  }
  if (
    normalized.includes('.write') ||
    normalized.includes('.create') ||
    normalized.includes('.insert')
  ) {
    actions.add('insert');
    actions.add('update');
  }
  if (
    normalized.includes('.update') ||
    normalized.includes('.edit') ||
    normalized.includes('.review')
  ) {
    actions.add('update');
  }
  if (
    normalized.includes('.delete') ||
    normalized.includes('.remove') ||
    normalized.includes('.archive') ||
    normalized.includes('.cancel')
  ) {
    actions.add('delete');
  }
  if (
    normalized.includes('.execute') ||
    normalized.includes('.run') ||
    normalized.includes('.settle') ||
    normalized.includes('.pay') ||
    normalized.includes('.release')
  ) {
    actions.add('execute');
  }
  return actions.size > 0 ? [...actions] : ['consult'];
}

function createEmptyRoutineActionMap(): Record<AccessRoutineAction, boolean> {
  return {
    consult: false,
    insert: false,
    update: false,
    delete: false,
    execute: false,
    admin: false
  };
}

function determineCoverageStatus(
  actions: Record<AccessRoutineAction, boolean>
): AccessModulePermissionMatrixEntry['coverageStatus'] {
  if (
    actions.consult &&
    actions.insert &&
    actions.update &&
    (actions.delete || actions.execute || actions.admin)
  ) {
    return 'complete';
  }
  if (
    actions.consult &&
    !actions.insert &&
    !actions.update &&
    !actions.delete &&
    !actions.execute &&
    !actions.admin
  ) {
    return 'read-only';
  }
  return 'partial';
}

export interface AccessContext {
  readonly roleCodes: readonly string[];
  readonly department?: string;
  readonly accountId?: AccountId;
  readonly userId?: UserId;
}

export interface PolicyEvaluationInput {
  readonly actor: UserSummary;
  readonly access: AccessProfile;
  readonly permissionCode: string;
  readonly accountId?: string;
}

export interface AccessControlServiceOptions {
  readonly repository?: AccessControlRepository;
}

type SubjectType = 'user' | 'team' | 'sector';

const HYDRATION_INVALIDATED_REASON = 'hydration_invalidated';

export class AccessControlService {
  readonly #repository?: AccessControlRepository;
  #permissions = [...permissionCatalog];
  #roles = [...roleCatalog];
  readonly #permissionsByAccount = new Map<AccountId, readonly PermissionDefinition[]>();
  readonly #rolesByAccount = new Map<AccountId, readonly RoleDefinition[]>();
  readonly #teams = new Map<AccessTeamId, AccessTeamSummary>();
  readonly #sectors = new Map<AccessSectorId, AccessSectorSummary>();
  readonly #userRoleCodes = new Map<UserId, readonly string[]>();
  readonly #teamMembershipsByUser = new Map<UserId, readonly AccessTeamId[]>();
  readonly #sectorMembershipsByUser = new Map<UserId, readonly AccessSectorId[]>();
  readonly #userAssignments = new Map<UserId, readonly AccessPermissionAssignmentSummary[]>();
  readonly #teamAssignments = new Map<AccessTeamId, readonly AccessPermissionAssignmentSummary[]>();
  readonly #sectorAssignments = new Map<
    AccessSectorId,
    readonly AccessPermissionAssignmentSummary[]
  >();
  readonly #hydratedUserIdsByAccount = new Map<AccountId, readonly UserId[]>();
  readonly #unhealthyAccounts = new Set<AccountId>();
  readonly #pendingAccounts = new Set<AccountId>();
  readonly #accountChangeTokens = new Map<AccountId, string>();
  readonly #hydrationPromises = new Map<AccountId, Promise<void>>();
  readonly #accountHydrationGenerations = new Map<AccountId, number>();

  public constructor(options?: AccessControlServiceOptions) {
    this.#repository = options?.repository;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  /**
   * Marks an account as being changed inside an open transaction. Authorization
   * fails closed until the owning command refreshes the committed read model.
   */
  public beginAccountMutation(accountId: AccountId): void {
    this.#pendingAccounts.add(accountId);
  }

  public completeAccountMutation(accountId: AccountId): void {
    this.#pendingAccounts.delete(accountId);
  }

  public hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository || !accountId) return Promise.resolve();
    const existingHydration = this.#hydrationPromises.get(accountId);
    if (existingHydration) return existingHydration;

    const hydrationGeneration = this.#accountHydrationGenerations.get(accountId) ?? 0;
    const hydration = this.#hydrateFromDatabase(accountId, hydrationGeneration);
    this.#hydrationPromises.set(accountId, hydration);
    const clearHydration = (): void => {
      if (this.#hydrationPromises.get(accountId) === hydration) {
        this.#hydrationPromises.delete(accountId);
      }
    };
    void hydration.then(clearHydration, clearHydration);
    return hydration;
  }

  async #hydrateFromDatabase(accountId: AccountId, hydrationGeneration: number): Promise<void> {
    const readToken = async (): Promise<string | undefined> =>
      this.#repository?.getAccountChangeToken?.(accountId);
    const readHydrationData = async () => {
      const [
        roles,
        permissions,
        teams,
        sectors,
        membershipsTeams,
        membershipsSectors,
        assignments,
        accountUserIds
      ] = await Promise.all([
        this.#repository!.findAllRoles(),
        this.#repository!.findAllPermissions(),
        this.#repository!.findAllTeams(accountId),
        this.#repository!.findAllSectors(accountId),
        this.#repository!.findTeamMemberships(accountId),
        this.#repository!.findSectorMemberships(accountId),
        this.#repository!.findPermissionAssignments(accountId),
        this.#repository!.findUserIdsByAccount?.(accountId) ?? Promise.resolve([])
      ]);

      const userIds = new Set<UserId>([
        ...accountUserIds,
        ...membershipsTeams.map((membership) => membership.userId),
        ...membershipsSectors.map((membership) => membership.userId),
        ...assignments
          .filter((assignment) => assignment.subjectType === 'user')
          .map((assignment) => assignment.subjectId as UserId)
      ]);
      const rolesByUser = await Promise.all(
        [...userIds].map(
          async (userId) => [userId, await this.#repository!.findRolesByUser(userId)] as const
        )
      );

      return {
        roles,
        permissions,
        teams,
        sectors,
        membershipsTeams,
        membershipsSectors,
        assignments,
        rolesByUser
      };
    };

    let hydration:
      | {
          readonly roles: Awaited<ReturnType<typeof readHydrationData>>['roles'];
          readonly permissions: Awaited<ReturnType<typeof readHydrationData>>['permissions'];
          readonly teams: Awaited<ReturnType<typeof readHydrationData>>['teams'];
          readonly sectors: Awaited<ReturnType<typeof readHydrationData>>['sectors'];
          readonly membershipsTeams: Awaited<
            ReturnType<typeof readHydrationData>
          >['membershipsTeams'];
          readonly membershipsSectors: Awaited<
            ReturnType<typeof readHydrationData>
          >['membershipsSectors'];
          readonly assignments: Awaited<ReturnType<typeof readHydrationData>>['assignments'];
          readonly rolesByUser: Awaited<ReturnType<typeof readHydrationData>>['rolesByUser'];
          readonly accountChangeToken: string | undefined;
        }
      | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const tokenBeforeRead = await readToken();
      const data = await readHydrationData();
      const tokenAfterRead = await readToken();
      if (
        tokenBeforeRead !== undefined &&
        tokenAfterRead !== undefined &&
        tokenBeforeRead !== tokenAfterRead
      ) {
        continue;
      }
      hydration = { ...data, accountChangeToken: tokenAfterRead ?? tokenBeforeRead };
      break;
    }

    if (!hydration) {
      throw new AppError(
        'ACCESS_CONTROL_STATE_UNAVAILABLE',
        'Access control state changed continuously while it was being reloaded',
        503
      );
    }

    this.#assertHydrationCurrent(accountId, hydrationGeneration);

    const {
      roles,
      permissions,
      teams,
      sectors,
      membershipsTeams,
      membershipsSectors,
      assignments,
      rolesByUser,
      accountChangeToken
    } = hydration;

    const hydratedRoles = roles.length ? roles.map(mapRoleRecord) : [...roleCatalog];
    const hydratedPermissions = permissions.length
      ? permissions.map(mapPermissionRecord)
      : [...permissionCatalog];
    this.#roles = hydratedRoles;
    this.#permissions = hydratedPermissions;
    this.#rolesByAccount.set(accountId, hydratedRoles);
    this.#permissionsByAccount.set(accountId, hydratedPermissions);

    const previousTeamIds = Array.from(this.#teams.values())
      .filter((team) => team.accountId === accountId)
      .map((team) => team.id);
    const previousSectorIds = Array.from(this.#sectors.values())
      .filter((sector) => sector.accountId === accountId)
      .map((sector) => sector.id);
    const previousUserIds = this.#hydratedUserIdsByAccount.get(accountId) ?? [];

    for (const teamId of previousTeamIds) {
      this.#teams.delete(teamId);
      this.#teamAssignments.delete(teamId);
    }
    for (const team of teams) this.#teams.set(team.id, team);

    for (const sectorId of previousSectorIds) {
      this.#sectors.delete(sectorId);
      this.#sectorAssignments.delete(sectorId);
    }
    for (const sector of sectors) this.#sectors.set(sector.id, sector);

    for (const userId of previousUserIds) {
      this.#userRoleCodes.delete(userId);
      this.#teamMembershipsByUser.delete(userId);
      this.#sectorMembershipsByUser.delete(userId);
      this.#userAssignments.delete(userId);
    }
    const userIds = rolesByUser.map(([userId]) => userId);
    for (const [userId, userRoles] of rolesByUser) {
      if (userRoles.length > 0) {
        this.#userRoleCodes.set(
          userId,
          userRoles.map((role) => role.code)
        );
      }
    }
    this.#hydratedUserIdsByAccount.set(accountId, [...userIds]);

    for (const membership of membershipsTeams) {
      const existing = this.#teamMembershipsByUser.get(membership.userId) ?? [];
      this.#teamMembershipsByUser.set(membership.userId, [
        ...existing,
        membership.subjectId as AccessTeamId
      ]);
    }

    for (const membership of membershipsSectors) {
      const existing = this.#sectorMembershipsByUser.get(membership.userId) ?? [];
      this.#sectorMembershipsByUser.set(membership.userId, [
        ...existing,
        membership.subjectId as AccessSectorId
      ]);
    }

    for (const assignment of assignments) {
      this.#storeAssignment(assignment);
    }
    if (accountChangeToken !== undefined) {
      this.#accountChangeTokens.set(accountId, accountChangeToken);
    }
    this.#unhealthyAccounts.delete(accountId);
  }

  /**
   * Verifies that this process is evaluating authorization against the latest
   * committed database state. The token is deliberately checked before the
   * route's synchronous authorization guard so another API instance cannot
   * serve a stale grant or revocation from its in-memory read model.
   */
  public async ensureFreshForRequest(accountId: AccountId): Promise<void> {
    const getAccountChangeToken = this.#repository?.getAccountChangeToken;
    if (!getAccountChangeToken) return;

    if (this.#pendingAccounts.has(accountId)) {
      this.assertAccountHealthy(accountId);
    }
    const accountWasUnhealthy = this.#unhealthyAccounts.has(accountId);
    try {
      const token = await getAccountChangeToken.call(this.#repository, accountId);
      if (!accountWasUnhealthy && this.#accountChangeTokens.get(accountId) === token) return;
      await this.hydrateFromDatabase(accountId);
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      if (isHydrationInvalidatedError(error)) throw error;
      this.invalidateAccount(accountId);
      throw new AppError(
        'ACCESS_CONTROL_STATE_UNAVAILABLE',
        'Access control state is temporarily unavailable; privileged access is blocked',
        503
      );
    }
  }

  /**
   * Drops a tenant's authorization read model after a rolled-back command
   * could have updated it before its audit write failed. Subsequent
   * authorization checks fail closed until hydration completes successfully.
   */
  public invalidateAccount(accountId: AccountId): void {
    const nextHydrationGeneration = (this.#accountHydrationGenerations.get(accountId) ?? 0) + 1;
    this.#accountHydrationGenerations.set(accountId, nextHydrationGeneration);
    this.#hydrationPromises.delete(accountId);
    this.#unhealthyAccounts.add(accountId);
    this.#pendingAccounts.delete(accountId);
    this.#accountChangeTokens.delete(accountId);

    for (const [teamId, team] of this.#teams) {
      if (team.accountId === accountId) {
        this.#teams.delete(teamId);
        this.#teamAssignments.delete(teamId);
      }
    }
    for (const [sectorId, sector] of this.#sectors) {
      if (sector.accountId === accountId) {
        this.#sectors.delete(sectorId);
        this.#sectorAssignments.delete(sectorId);
      }
    }

    const userIds = this.#hydratedUserIdsByAccount.get(accountId) ?? [];
    for (const userId of userIds) {
      this.#userRoleCodes.delete(userId);
      this.#teamMembershipsByUser.delete(userId);
      this.#sectorMembershipsByUser.delete(userId);
      this.#userAssignments.delete(userId);
    }
    this.#hydratedUserIdsByAccount.delete(accountId);
    this.#rolesByAccount.delete(accountId);
    this.#permissionsByAccount.delete(accountId);
  }

  #assertHydrationCurrent(accountId: AccountId, hydrationGeneration: number): void {
    if ((this.#accountHydrationGenerations.get(accountId) ?? 0) !== hydrationGeneration) {
      throw new AppError(
        'ACCESS_CONTROL_STATE_UNAVAILABLE',
        'Access control state was invalidated while it was being reloaded',
        503,
        { reason: HYDRATION_INVALIDATED_REASON }
      );
    }
  }

  public listPermissions(): readonly PermissionDefinition[] {
    return this.#permissions;
  }

  public listRoles(): readonly RoleDefinition[] {
    return this.#roles;
  }

  public listTeams(accountId?: AccountId): readonly AccessTeamSummary[] {
    return Array.from(this.#teams.values()).filter(
      (team) => !accountId || team.accountId === accountId
    );
  }

  public listSectors(accountId?: AccountId): readonly AccessSectorSummary[] {
    return Array.from(this.#sectors.values()).filter(
      (sector) => !accountId || sector.accountId === accountId
    );
  }

  public listMemberships(userId: UserId): {
    teams: readonly AccessTeamSummary[];
    sectors: readonly AccessSectorSummary[];
  } {
    return {
      teams: (this.#teamMembershipsByUser.get(userId) ?? [])
        .map((id) => this.#teams.get(id))
        .filter(Boolean) as readonly AccessTeamSummary[],
      sectors: (this.#sectorMembershipsByUser.get(userId) ?? [])
        .map((id) => this.#sectors.get(id))
        .filter(Boolean) as readonly AccessSectorSummary[]
    };
  }

  public listAssignments(): {
    userPermissions: readonly AccessPermissionAssignmentSummary[];
    teamPermissions: readonly AccessPermissionAssignmentSummary[];
    sectorPermissions: readonly AccessPermissionAssignmentSummary[];
  } {
    return {
      userPermissions: Array.from(this.#userAssignments.values()).flat(),
      teamPermissions: Array.from(this.#teamAssignments.values()).flat(),
      sectorPermissions: Array.from(this.#sectorAssignments.values()).flat()
    };
  }

  public getModulePermissionMatrix(
    accountId?: AccountId
  ): readonly AccessModulePermissionMatrixEntry[] {
    if (accountId) this.assertAccountHealthy(accountId);
    const permissions = accountId
      ? (this.#permissionsByAccount.get(accountId) ?? this.#permissions)
      : this.#permissions;
    const roles = accountId ? (this.#rolesByAccount.get(accountId) ?? this.#roles) : this.#roles;
    const assignments = this.listAssignments();
    const grouped = new Map<
      string,
      {
        module: string;
        permissionCodes: Set<string>;
        actions: Record<AccessRoutineAction, boolean>;
        rolesAllowed: Set<string>;
        teamOverrideCount: number;
        sectorOverrideCount: number;
        userOverrideCount: number;
      }
    >();

    for (const permission of permissions) {
      const module = permission.module || permission.code.split('.')[0] || 'outros';
      const current = grouped.get(module) ?? {
        module,
        permissionCodes: new Set<string>(),
        actions: createEmptyRoutineActionMap(),
        rolesAllowed: new Set<string>(),
        teamOverrideCount: 0,
        sectorOverrideCount: 0,
        userOverrideCount: 0
      };

      current.permissionCodes.add(permission.code);
      for (const action of resolveRoutineActions(permission.code)) {
        current.actions[action] = true;
      }

      for (const role of roles) {
        if (role.permissionCodes.includes(permission.code)) {
          current.rolesAllowed.add(role.code);
        }
      }

      current.userOverrideCount += assignments.userPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;
      current.teamOverrideCount += assignments.teamPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;
      current.sectorOverrideCount += assignments.sectorPermissions.filter(
        (assignment) =>
          assignment.permissionCode === permission.code &&
          (!accountId || assignment.accountId === accountId)
      ).length;

      grouped.set(module, current);
    }

    return [...grouped.values()]
      .map((entry) => ({
        module: entry.module,
        permissionCodes: [...entry.permissionCodes].sort(),
        actions: routineActions.reduce<Record<AccessRoutineAction, boolean>>(
          (acc, action) => ({ ...acc, [action]: entry.actions[action] }),
          createEmptyRoutineActionMap()
        ),
        rolesAllowed: [...entry.rolesAllowed].sort(),
        teamOverrideCount: entry.teamOverrideCount,
        sectorOverrideCount: entry.sectorOverrideCount,
        userOverrideCount: entry.userOverrideCount,
        coverageStatus: determineCoverageStatus(entry.actions)
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }

  public getLegacyRoleCodes(userId: UserId): readonly string[] {
    return this.#userRoleCodes.get(userId) ?? [];
  }

  public async replaceLegacyRoles(userId: UserId, roleCodes: readonly string[]): Promise<void> {
    if (this.#repository) {
      const existing = await this.#repository.findRolesByUser(userId);
      for (const role of existing) {
        await this.#repository.removeRoleFromUser(userId, role.id);
      }
      for (const roleCode of roleCodes) {
        const role = this.#roles.find((item) => item.code === roleCode);
        if (role) {
          await this.#repository.assignRoleToUser(userId, role.id);
        }
      }
    }
    this.#userRoleCodes.set(userId, [...roleCodes]);
  }

  public async createTeam(
    accountId: AccountId,
    input: { code: string; name: string; description?: string | null }
  ): Promise<AccessTeamSummary> {
    const team = this.#repository
      ? await this.#repository.createTeam({ accountId, ...input })
      : createInMemoryTeam(accountId, input);
    this.#teams.set(team.id, team);
    return team;
  }

  public async updateTeam(
    id: AccessTeamId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessTeamSummary> {
    const existing = this.#teams.get(id);
    if (!existing) throw new NotFoundError('Access team not found', { teamId: id });
    const team = this.#repository
      ? await this.#repository.updateTeam(id, input)
      : {
          ...existing,
          code: input.code ?? existing.code,
          name: input.name ?? existing.name,
          description:
            input.description !== undefined
              ? (input.description ?? undefined)
              : existing.description,
          status:
            input.isActive !== undefined
              ? input.isActive
                ? 'active'
                : 'inactive'
              : existing.status,
          updatedAt: new Date().toISOString()
        };
    this.#teams.set(team.id, team);
    return team;
  }

  public async createSector(
    accountId: AccountId,
    input: { code: string; name: string; description?: string | null }
  ): Promise<AccessSectorSummary> {
    const sector = this.#repository
      ? await this.#repository.createSector({ accountId, ...input })
      : createInMemorySector(accountId, input);
    this.#sectors.set(sector.id, sector);
    return sector;
  }

  public async updateSector(
    id: AccessSectorId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessSectorSummary> {
    const existing = this.#sectors.get(id);
    if (!existing) throw new NotFoundError('Access sector not found', { sectorId: id });
    const sector = this.#repository
      ? await this.#repository.updateSector(id, input)
      : {
          ...existing,
          code: input.code ?? existing.code,
          name: input.name ?? existing.name,
          description:
            input.description !== undefined
              ? (input.description ?? undefined)
              : existing.description,
          status:
            input.isActive !== undefined
              ? input.isActive
                ? 'active'
                : 'inactive'
              : existing.status,
          updatedAt: new Date().toISOString()
        };
    this.#sectors.set(sector.id, sector);
    return sector;
  }

  public async replaceUserTeams(userId: UserId, teamIds: readonly AccessTeamId[]): Promise<void> {
    if (this.#repository) {
      await this.#repository.replaceUserTeams(userId, teamIds);
    }
    this.#teamMembershipsByUser.set(userId, [...teamIds]);
  }

  public async replaceUserSectors(
    userId: UserId,
    sectorIds: readonly AccessSectorId[]
  ): Promise<void> {
    if (this.#repository) {
      await this.#repository.replaceUserSectors(userId, sectorIds);
    }
    this.#sectorMembershipsByUser.set(userId, [...sectorIds]);
  }

  public async setPermissionAssignment(input: {
    accountId: AccountId;
    subjectType: SubjectType;
    subjectId: string;
    permissionCode: string;
    effect?: AccessAssignmentEffect | 'inherit';
  }): Promise<void> {
    if (input.effect === 'inherit' || !input.effect) {
      if (this.#repository) {
        await this.#repository.removePermissionAssignment({
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          permissionCode: input.permissionCode
        });
      }
      this.#removeAssignment(input.subjectType, input.subjectId, input.permissionCode);
      return;
    }

    if (this.#repository) {
      await this.#repository.upsertPermissionAssignment({
        accountId: input.accountId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        permissionCode: input.permissionCode,
        effect: input.effect
      });
    }

    this.#storeAssignment({
      accountId: input.accountId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      permissionCode: input.permissionCode,
      effect: input.effect,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  public getEffectivePermissions(input: {
    accountId: AccountId;
    userId: UserId;
    roleCodes?: readonly string[];
  }): readonly EffectivePermissionSummary[] {
    this.assertAccountHealthy(input.accountId);
    const permissions = this.#permissionsByAccount.get(input.accountId) ?? this.#permissions;
    const roles = this.#rolesByAccount.get(input.accountId) ?? this.#roles;
    const effective: EffectivePermissionSummary[] = [];
    const roleCodes = this.#userRoleCodes.get(input.userId) ?? input.roleCodes ?? [];
    const teams = this.#teamMembershipsByUser.get(input.userId) ?? [];
    const sectors = this.#sectorMembershipsByUser.get(input.userId) ?? [];
    const userAssignments = this.#userAssignments.get(input.userId) ?? [];
    const teamAssignments = teams.flatMap((teamId) => this.#teamAssignments.get(teamId) ?? []);
    const sectorAssignments = sectors.flatMap(
      (sectorId) => this.#sectorAssignments.get(sectorId) ?? []
    );

    for (const permission of permissions) {
      const sources: EffectivePermissionSource[] = [];
      for (const assignment of userAssignments.filter(
        (item) => item.permissionCode === permission.code
      )) {
        sources.push({
          kind: 'user',
          sourceId: String(input.userId),
          sourceCode: String(input.userId),
          sourceName: 'Usuario',
          effect: assignment.effect,
          inherited: false
        });
      }
      for (const sectorId of sectors) {
        const sector = this.#sectors.get(sectorId);
        for (const assignment of (this.#sectorAssignments.get(sectorId) ?? []).filter(
          (item) => item.permissionCode === permission.code
        )) {
          sources.push({
            kind: 'sector',
            sourceId: String(sectorId),
            sourceCode: sector?.code ?? String(sectorId),
            sourceName: sector?.name ?? 'Setor',
            effect: assignment.effect,
            inherited: true
          });
        }
      }
      for (const teamId of teams) {
        const team = this.#teams.get(teamId);
        for (const assignment of (this.#teamAssignments.get(teamId) ?? []).filter(
          (item) => item.permissionCode === permission.code
        )) {
          sources.push({
            kind: 'team',
            sourceId: String(teamId),
            sourceCode: team?.code ?? String(teamId),
            sourceName: team?.name ?? 'Equipe',
            effect: assignment.effect,
            inherited: true
          });
        }
      }
      for (const roleCode of roleCodes) {
        const role = roles.find((item) => item.code === roleCode);
        if (role?.permissionCodes.includes(permission.code)) {
          sources.push({
            kind: 'role',
            sourceId: role.id,
            sourceCode: role.code,
            sourceName: role.name,
            effect: 'allow_legacy',
            inherited: true
          });
        }
      }

      const resolution = resolvePermission(sources);
      effective.push({
        permissionCode: permission.code,
        module: permission.module,
        description: permission.description,
        effective: resolution !== 'none' && !resolution.endsWith('deny'),
        direct: resolution.startsWith('user_'),
        inherited: !resolution.startsWith('user_') && resolution !== 'none',
        resolution,
        sources
      });
    }
    return effective;
  }

  public createProfile(context: AccessContext): AccessProfile {
    const effectivePermissions =
      context.userId && context.accountId
        ? this.getEffectivePermissions({
            accountId: context.accountId,
            userId: context.userId,
            roleCodes: context.roleCodes
          })
        : this.#permissions
            .filter((permission) =>
              context.roleCodes.some((roleCode) =>
                (
                  this.#roles.find((role) => role.code === roleCode) ?? roleMap.get(roleCode)
                )?.permissionCodes.includes(permission.code)
              )
            )
            .map((permission) => ({
              permissionCode: permission.code,
              module: permission.module,
              description: permission.description,
              effective: true,
              direct: false,
              inherited: true,
              resolution: 'role_allow' as const,
              sources: []
            }));

    const permissionCodes = effectivePermissions
      .filter((permission) => permission.effective)
      .map((permission) => permission.permissionCode)
      .sort();

    const capabilities = [
      'identity.authenticated',
      ...permissionCodes.map((permissionCode) => `cap:${permissionCode}`)
    ];

    return {
      roleCodes: [...context.roleCodes],
      permissionCodes,
      capabilities,
      effectivePermissions
    };
  }

  public assertAuthorized(input: PolicyEvaluationInput): void {
    this.assertAccountHealthy((input.accountId ?? input.actor.accountId) as AccountId);
    if (input.actor.status !== 'active') {
      throw new ForbiddenError('Inactive users cannot perform this action', {
        userId: input.actor.id
      });
    }

    if (!input.access.permissionCodes.includes(input.permissionCode)) {
      throw new ForbiddenError('Missing required permission', {
        permissionCode: input.permissionCode
      });
    }

    if (input.accountId && input.actor.accountId !== input.accountId) {
      throw new ForbiddenError('Cross-account access is not allowed', {
        actorAccountId: input.actor.accountId,
        targetAccountId: input.accountId
      });
    }
  }

  #storeAssignment(
    assignment: AccessPermissionAssignmentRecord | AccessPermissionAssignmentSummary
  ) {
    const normalized: AccessPermissionAssignmentSummary = {
      accountId: assignment.accountId,
      subjectType: assignment.subjectType,
      subjectId: assignment.subjectId as UserId | AccessTeamId | AccessSectorId,
      permissionCode: assignment.permissionCode,
      effect: assignment.effect,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    };
    const target =
      assignment.subjectType === 'user'
        ? this.#userAssignments
        : assignment.subjectType === 'team'
          ? this.#teamAssignments
          : this.#sectorAssignments;
    const existing = target.get(normalized.subjectId as never) ?? [];
    const filtered = existing.filter((item) => item.permissionCode !== normalized.permissionCode);
    target.set(normalized.subjectId as never, [...filtered, normalized]);
  }

  private assertAccountHealthy(accountId: AccountId): void {
    if (this.#unhealthyAccounts.has(accountId)) {
      throw new ForbiddenError(
        'Access control state is temporarily unavailable; privileged access is blocked'
      );
    }
    if (this.#pendingAccounts.has(accountId)) {
      throw new ForbiddenError(
        'Access control state is being updated; privileged access is temporarily blocked'
      );
    }
  }

  #removeAssignment(subjectType: SubjectType, subjectId: string, permissionCode: string) {
    const target =
      subjectType === 'user'
        ? this.#userAssignments
        : subjectType === 'team'
          ? this.#teamAssignments
          : this.#sectorAssignments;
    const existing = target.get(subjectId as never) ?? [];
    target.set(
      subjectId as never,
      existing.filter((item) => item.permissionCode !== permissionCode)
    );
  }
}

function isHydrationInvalidatedError(error: unknown): error is AppError {
  if (!(error instanceof AppError) || error.code !== 'ACCESS_CONTROL_STATE_UNAVAILABLE') {
    return false;
  }
  if (!error.details || typeof error.details !== 'object') return false;
  return (error.details as { readonly reason?: unknown }).reason === HYDRATION_INVALIDATED_REASON;
}

function resolvePermission(
  sources: readonly EffectivePermissionSource[]
): EffectivePermissionSummary['resolution'] {
  if (sources.some((source) => source.kind === 'user' && source.effect === 'deny'))
    return 'user_deny';
  if (sources.some((source) => source.kind === 'user' && source.effect === 'allow'))
    return 'user_allow';
  if (sources.some((source) => source.kind === 'sector' && source.effect === 'deny'))
    return 'sector_deny';
  if (sources.some((source) => source.kind === 'sector' && source.effect === 'allow'))
    return 'sector_allow';
  if (sources.some((source) => source.kind === 'team' && source.effect === 'deny'))
    return 'team_deny';
  if (sources.some((source) => source.kind === 'team' && source.effect === 'allow'))
    return 'team_allow';
  if (sources.some((source) => source.kind === 'role' && source.effect === 'allow_legacy'))
    return 'role_allow';
  return 'none';
}

function mapRoleRecord(record: RoleRecord): RoleDefinition {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? '',
    permissionCodes: [...record.permissionCodes]
  };
}

function mapPermissionRecord(record: PermissionRecord): PermissionDefinition {
  return {
    id: record.id,
    code: record.key,
    module: record.key.split('.')[0] ?? 'access-control',
    description: record.description ?? record.key
  };
}

function createInMemoryTeam(
  accountId: AccountId,
  input: { code: string; name: string; description?: string | null }
): AccessTeamSummary {
  const now = new Date().toISOString();
  return {
    id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as AccessTeamId,
    accountId,
    code: input.code,
    name: input.name,
    description: input.description ?? undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

function createInMemorySector(
  accountId: AccountId,
  input: { code: string; name: string; description?: string | null }
): AccessSectorSummary {
  const now = new Date().toISOString();
  return {
    id: `sector_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as AccessSectorId,
    accountId,
    code: input.code,
    name: input.name,
    description: input.description ?? undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
}

export {
  DatabaseAccessControlRepository,
  type AccessControlRepository,
  type RoleRecord,
  type PermissionRecord,
  type AccessPermissionAssignmentRecord
} from './repositories/database-access-control.repository.js';

export {
  AbacEngine,
  DEFAULT_ABAC_POLICIES,
  resolveAttribute,
  type AbacEngineOptions,
  type AbacPolicy,
  type PolicyRule,
  type PolicyCondition,
  type ConditionOperator,
  type PolicyCombiningAlgorithm,
  type ActorAttributes,
  type ResourceAttributes,
  type EnvironmentAttributes,
  type ResourceType,
  type PolicyEvaluationResult
} from './abac.js';
