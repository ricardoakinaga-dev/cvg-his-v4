import { beforeEach, describe, expect, it } from 'vitest';

import { ForbiddenError } from '@cvg-his-v2/shared-errors';

import { AccessControlService } from './index.js';
import { AbacEngine } from './abac.js';
import type { AccountId, UserId, UserSummary } from '@cvg-his-v2/shared-types';
import type {
  AccessControlRepository,
  AccessMembershipRecord,
  AccessPermissionAssignmentRecord,
  PermissionRecord,
  RoleRecord
} from './repositories/database-access-control.repository.js';

describe('AccessControlService', () => {
  let service: AccessControlService;
  const accountId = 'acc_1' as AccountId;
  const userId = 'user_1' as UserId;

  function makeActor(status: 'active' | 'inactive', overrideAccountId?: AccountId): UserSummary {
    return {
      id: userId,
      accountId: overrideAccountId ?? accountId,
      username: 'testuser',
      email: 'test@cvg.local',
      displayName: 'Test User',
      status,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
  }

  beforeEach(() => {
    service = new AccessControlService();
  });

  it('lists legacy permissions and roles', () => {
    expect(service.listPermissions().some((permission) => permission.code === 'owners.read')).toBe(
      true
    );
    expect(service.listRoles().some((role) => role.code === 'admin')).toBe(true);
  });

  it('creates legacy profile from roles', () => {
    const profile = service.createProfile({ roleCodes: ['admin'] });
    expect(profile.permissionCodes).toContain('users.manage');
    expect(profile.capabilities).toContain('cap:users.manage');
  });

  it('supports teams, sectors and explicit grants with precedence', async () => {
    const team = await service.createTeam(accountId, {
      code: 'equipe_medica',
      name: 'Equipe Médica'
    });
    const sector = await service.createSector(accountId, {
      code: 'internacao',
      name: 'Internação'
    });

    await service.replaceLegacyRoles(userId, ['reception']);
    await service.replaceUserTeams(userId, [team.id]);
    await service.replaceUserSectors(userId, [sector.id]);
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'team',
      subjectId: team.id,
      permissionCode: 'medical-records.read',
      effect: 'allow'
    });
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'sector',
      subjectId: sector.id,
      permissionCode: 'medical-records.read',
      effect: 'deny'
    });
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'user',
      subjectId: userId,
      permissionCode: 'medical-records.read',
      effect: 'allow'
    });

    const effective = service
      .getEffectivePermissions({ accountId, userId })
      .find((permission) => permission.permissionCode === 'medical-records.read');

    expect(effective?.effective).toBe(true);
    expect(effective?.resolution).toBe('user_allow');
    expect(effective?.sources.some((source) => source.kind === 'team')).toBe(true);
    expect(effective?.sources.some((source) => source.kind === 'sector')).toBe(true);
  });

  it('removes explicit grant when inherit is selected', async () => {
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'user',
      subjectId: userId,
      permissionCode: 'users.read',
      effect: 'allow'
    });
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'user',
      subjectId: userId,
      permissionCode: 'users.read',
      effect: 'inherit'
    });

    const assignments = service.listAssignments().userPermissions;
    expect(assignments.some((assignment) => assignment.permissionCode === 'users.read')).toBe(
      false
    );
  });

  it('lists memberships by user', async () => {
    const team = await service.createTeam(accountId, { code: 'recepcao', name: 'Recepção' });
    const sector = await service.createSector(accountId, {
      code: 'administrativo',
      name: 'Administrativo'
    });
    await service.replaceUserTeams(userId, [team.id]);
    await service.replaceUserSectors(userId, [sector.id]);

    const memberships = service.listMemberships(userId);
    expect(memberships.teams[0]?.id).toBe(team.id);
    expect(memberships.sectors[0]?.id).toBe(sector.id);
  });

  it('creates and updates teams', async () => {
    const team = await service.createTeam(accountId, {
      code: 'equipe_nova',
      name: 'Equipe Nova',
      description: 'Uma nova equipe'
    });

    expect(team.code).toBe('equipe_nova');
    expect(team.name).toBe('Equipe Nova');
    expect(team.description).toBe('Uma nova equipe');
    expect(team.status).toBe('active');

    const updated = await service.updateTeam(team.id, {
      name: 'Equipe Atualizada',
      isActive: false
    });

    expect(updated.name).toBe('Equipe Atualizada');
    expect(updated.status).toBe('inactive');
    expect(updated.code).toBe('equipe_nova'); // code unchanged
  });

  it('creates and updates sectors', async () => {
    const sector = await service.createSector(accountId, {
      code: 'setor_novo',
      name: 'Setor Novo'
    });

    expect(sector.code).toBe('setor_novo');
    expect(sector.name).toBe('Setor Novo');
    expect(sector.status).toBe('active');

    const updated = await service.updateSector(sector.id, {
      description: 'Descricao do setor',
      isActive: false
    });

    expect(updated.description).toBe('Descricao do setor');
    expect(updated.status).toBe('inactive');
  });

  it('lists teams and sectors by account', async () => {
    await service.createTeam(accountId, { code: 'team1', name: 'Team 1' });
    await service.createTeam(accountId, { code: 'team2', name: 'Team 2' });
    await service.createTeam('other_account' as AccountId, { code: 'team3', name: 'Team 3' });

    const teams = service.listTeams(accountId);
    expect(teams).toHaveLength(2);
    expect(teams.some((t) => t.code === 'team1')).toBe(true);
    expect(teams.some((t) => t.code === 'team3')).toBe(false);
  });

  it('replaces user teams and sectors', async () => {
    const team1 = await service.createTeam(accountId, { code: 'team1', name: 'Team 1' });
    const team2 = await service.createTeam(accountId, { code: 'team2', name: 'Team 2' });
    const sector1 = await service.createSector(accountId, { code: 'sector1', name: 'Sector 1' });

    await service.replaceUserTeams(userId, [team1.id]);
    await service.replaceUserSectors(userId, [sector1.id]);

    let memberships = service.listMemberships(userId);
    expect(memberships.teams).toHaveLength(1);
    expect(memberships.sectors).toHaveLength(1);

    // Replace with different teams
    await service.replaceUserTeams(userId, [team2.id]);
    memberships = service.listMemberships(userId);
    expect(memberships.teams).toHaveLength(1);
    expect(memberships.teams[0]?.id).toBe(team2.id);
  });

  it('gets legacy role codes', async () => {
    await service.replaceLegacyRoles(userId, ['admin', 'veterinarian']);
    const roles = service.getLegacyRoleCodes(userId);
    expect(roles).toContain('admin');
    expect(roles).toContain('veterinarian');
    expect(roles).toHaveLength(2);
  });

  it('creates profile with user context', async () => {
    await service.replaceLegacyRoles(userId, ['admin']);
    const profile = service.createProfile({
      accountId,
      userId,
      roleCodes: ['admin']
    });

    expect(profile.roleCodes).toContain('admin');
    expect(profile.permissionCodes.length).toBeGreaterThan(0);
    expect(profile.capabilities).toContain('identity.authenticated');
    expect(profile.effectivePermissions?.length ?? 0).toBeGreaterThan(0);
  });

  it('preserves session role permissions when hydrated memberships exist without database roles', async () => {
    const repository: AccessControlRepository = {
      async createRole(_role: RoleRecord) {},
      async findRoleById(_id) {
        return null;
      },
      async findRoleByName(_name) {
        return null;
      },
      async findAllRoles() {
        return [];
      },
      async createPermission(_permission: PermissionRecord) {},
      async findPermissionByKey(_key) {
        return null;
      },
      async findAllPermissions() {
        return [];
      },
      async addPermissionToRole(_roleId, _permissionId) {},
      async removePermissionFromRole(_roleId, _permissionId) {},
      async findPermissionsByRole(_roleId) {
        return [];
      },
      async assignRoleToUser(_userId, _roleId) {},
      async removeRoleFromUser(_userId, _roleId) {},
      async findRolesByUser(_userId) {
        return [];
      },
      async createTeam(_input) {
        throw new Error('Not implemented in test');
      },
      async updateTeam(_id, _input) {
        throw new Error('Not implemented in test');
      },
      async findAllTeams(_accountId) {
        return [];
      },
      async createSector(_input) {
        throw new Error('Not implemented in test');
      },
      async updateSector(_id, _input) {
        throw new Error('Not implemented in test');
      },
      async findAllSectors(_accountId) {
        return [];
      },
      async replaceUserTeams(_userId, _teamIds) {},
      async replaceUserSectors(_userId, _sectorIds) {},
      async findTeamMemberships(_accountId) {
        return [
          {
            userId,
            subjectType: 'team',
            subjectId: 'team_1' as any,
            createdAt: '2026-01-01T00:00:00.000Z'
          } as AccessMembershipRecord
        ];
      },
      async findSectorMemberships(_accountId) {
        return [];
      },
      async upsertPermissionAssignment(_input) {},
      async removePermissionAssignment(_input) {},
      async findPermissionAssignments(_accountId) {
        return [] satisfies readonly AccessPermissionAssignmentRecord[];
      }
    };

    const hydratedService = new AccessControlService({ repository });
    await hydratedService.hydrateFromDatabase(accountId);

    const profile = hydratedService.createProfile({
      accountId,
      userId,
      roleCodes: ['admin']
    });

    expect(profile.permissionCodes).toContain('auth.session.read');
    expect(profile.permissionCodes).toContain('users.manage');
  });

  it('preserves account A access state after hydrating account B', async () => {
    const accountA = 'account_a' as AccountId;
    const accountB = 'account_b' as AccountId;
    const userA = 'user_a' as UserId;
    const userB = 'user_b' as UserId;
    const roleOnlyUserA = 'role_only_user_a' as UserId;
    const createdAt = '2026-01-01T00:00:00.000Z';
    const updatedAt = '2026-01-02T00:00:00.000Z';
    const teamsByAccount = {
      [accountA]: [
        {
          id: 'team_a' as never,
          accountId: accountA,
          code: 'team_a',
          name: 'Team A',
          status: 'active' as const,
          createdAt,
          updatedAt
        }
      ],
      [accountB]: [
        {
          id: 'team_b' as never,
          accountId: accountB,
          code: 'team_b',
          name: 'Team B',
          status: 'active' as const,
          createdAt,
          updatedAt
        }
      ]
    };
    const sectorsByAccount = {
      [accountA]: [
        {
          id: 'sector_a' as never,
          accountId: accountA,
          code: 'sector_a',
          name: 'Sector A',
          status: 'active' as const,
          createdAt,
          updatedAt
        }
      ],
      [accountB]: [
        {
          id: 'sector_b' as never,
          accountId: accountB,
          code: 'sector_b',
          name: 'Sector B',
          status: 'active' as const,
          createdAt,
          updatedAt
        }
      ]
    };
    const repository: AccessControlRepository = {
      async createRole(_role: RoleRecord) {},
      async findRoleById(_id) {
        return null;
      },
      async findRoleByName(_name) {
        return null;
      },
      async findAllRoles() {
        return [
          {
            id: 'role_veterinarian' as never,
            code: 'veterinarian',
            name: 'Veterinarian',
            createdAt,
            permissionCodes: ['patients.read']
          },
          {
            id: 'role_reception' as never,
            code: 'reception',
            name: 'Reception',
            createdAt,
            permissionCodes: ['patients.read']
          }
        ];
      },
      async createPermission(_permission: PermissionRecord) {},
      async findPermissionByKey(_key) {
        return null;
      },
      async findAllPermissions() {
        return [
          {
            id: 'permission_patients_read' as never,
            key: 'patients.read',
            createdAt
          }
        ];
      },
      async addPermissionToRole(_roleId, _permissionId) {},
      async removePermissionFromRole(_roleId, _permissionId) {},
      async findPermissionsByRole(_roleId) {
        return [];
      },
      async assignRoleToUser(_userId, _roleId) {},
      async removeRoleFromUser(_userId, _roleId) {},
      async findRolesByUser(targetUserId) {
        const code =
          targetUserId === userA || targetUserId === roleOnlyUserA
            ? 'veterinarian'
            : 'reception';
        return [
          {
            id: `role_${code}` as never,
            code,
            name: code,
            createdAt,
            permissionCodes: ['patients.read']
          }
        ];
      },
      async findUserIdsByAccount(targetAccountId) {
        return targetAccountId === accountA ? [userA, roleOnlyUserA] : [userB];
      },
      async createTeam(_input) {
        throw new Error('Not implemented in test');
      },
      async updateTeam(_id, _input) {
        throw new Error('Not implemented in test');
      },
      async findAllTeams(targetAccountId) {
        return teamsByAccount[targetAccountId as keyof typeof teamsByAccount] ?? [];
      },
      async createSector(_input) {
        throw new Error('Not implemented in test');
      },
      async updateSector(_id, _input) {
        throw new Error('Not implemented in test');
      },
      async findAllSectors(targetAccountId) {
        return sectorsByAccount[targetAccountId as keyof typeof sectorsByAccount] ?? [];
      },
      async replaceUserTeams(_userId, _teamIds) {},
      async replaceUserSectors(_userId, _sectorIds) {},
      async findTeamMemberships(targetAccountId) {
        return [
          {
            userId: targetAccountId === accountA ? userA : userB,
            subjectType: 'team',
            subjectId: targetAccountId === accountA ? ('team_a' as never) : ('team_b' as never),
            createdAt
          }
        ];
      },
      async findSectorMemberships(targetAccountId) {
        return [
          {
            userId: targetAccountId === accountA ? userA : userB,
            subjectType: 'sector',
            subjectId:
              targetAccountId === accountA ? ('sector_a' as never) : ('sector_b' as never),
            createdAt
          }
        ];
      },
      async upsertPermissionAssignment(_input) {},
      async removePermissionAssignment(_input) {},
      async findPermissionAssignments(targetAccountId) {
        const targetUserId = targetAccountId === accountA ? userA : userB;
        const suffix = targetAccountId === accountA ? 'a' : 'b';
        return [
          {
            accountId: targetAccountId,
            subjectType: 'user',
            subjectId: targetUserId,
            permissionCode: 'patients.read',
            effect: 'allow',
            createdAt,
            updatedAt
          },
          {
            accountId: targetAccountId,
            subjectType: 'team',
            subjectId: `team_${suffix}`,
            permissionCode: 'patients.read',
            effect: 'allow',
            createdAt,
            updatedAt
          },
          {
            accountId: targetAccountId,
            subjectType: 'sector',
            subjectId: `sector_${suffix}`,
            permissionCode: 'patients.read',
            effect: 'deny',
            createdAt,
            updatedAt
          }
        ];
      }
    };

    const hydratedService = new AccessControlService({ repository });
    await hydratedService.hydrateFromDatabase(accountA);
    await hydratedService.hydrateFromDatabase(accountB);

    expect(hydratedService.listTeams(accountA).map((team) => team.id)).toEqual(['team_a']);
    expect(hydratedService.listSectors(accountA).map((sector) => sector.id)).toEqual(['sector_a']);
    expect(hydratedService.listMemberships(userA).teams.map((team) => team.id)).toEqual(['team_a']);
    expect(hydratedService.listMemberships(userA).sectors.map((sector) => sector.id)).toEqual([
      'sector_a'
    ]);
    expect(hydratedService.getLegacyRoleCodes(userA)).toEqual(['veterinarian']);
    expect(hydratedService.getLegacyRoleCodes(roleOnlyUserA)).toEqual(['veterinarian']);

    const assignments = hydratedService.listAssignments();
    expect(assignments.userPermissions.some((assignment) => assignment.subjectId === userA)).toBe(
      true
    );
    expect(assignments.teamPermissions.some((assignment) => assignment.subjectId === 'team_a')).toBe(
      true
    );
    expect(
      assignments.sectorPermissions.some((assignment) => assignment.subjectId === 'sector_a')
    ).toBe(true);
  });

  it('asserts authorization for active user with permission', async () => {
    const actor = makeActor('active');
    const profile = service.createProfile({ roleCodes: ['admin'] });

    expect(() =>
      service.assertAuthorized({
        actor,
        access: profile,
        permissionCode: 'users.manage'
      })
    ).not.toThrow();
  });

  it('throws ForbiddenError for inactive user', async () => {
    const actor = makeActor('inactive');
    const profile = service.createProfile({ roleCodes: ['admin'] });

    expect(() =>
      service.assertAuthorized({
        actor,
        access: profile,
        permissionCode: 'users.manage'
      })
    ).toThrow('Inactive users cannot perform this action');
  });

  it('throws ForbiddenError for missing permission', async () => {
    const actor = makeActor('active');
    const profile = service.createProfile({ roleCodes: ['guest'] });

    expect(() =>
      service.assertAuthorized({
        actor,
        access: profile,
        permissionCode: 'users.manage'
      })
    ).toThrow('Missing required permission');
  });

  it('throws ForbiddenError for cross-account access', async () => {
    const actor = makeActor('active', 'acc_other' as AccountId);
    const profile = service.createProfile({ roleCodes: ['admin'] });

    expect(() =>
      service.assertAuthorized({
        actor,
        accountId,
        access: profile,
        permissionCode: 'users.manage'
      })
    ).toThrow('Cross-account access is not allowed');
  });

  it('returns in-memory persistence mode without repository', () => {
    expect(service.persistenceMode).toBe('in-memory');
  });

  it('lists all assignments', async () => {
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'user',
      subjectId: userId,
      permissionCode: 'users.read',
      effect: 'allow'
    });
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'team',
      subjectId: 'team_1' as any,
      permissionCode: 'patients.read',
      effect: 'allow'
    });

    const assignments = service.listAssignments();
    expect(assignments.userPermissions.length).toBeGreaterThan(0);
    expect(assignments.teamPermissions.length).toBeGreaterThan(0);
  });

  it('allows ABAC role checks against actor role arrays for admin', () => {
    const engine = new AbacEngine();

    expect(() =>
      engine.enforce(
        'medical-records.manage',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: [],
          teamIds: [],
          sectorIds: [],
          sectorCodes: [],
          isActive: true
        },
        {
          resourceType: 'patient',
          resourceId: 'patient-1'
        },
        {
          timestamp: new Date().toISOString(),
          dayOfWeek: 1,
          hourOfDay: 10
        }
      )
    ).not.toThrow();
  });

  it('handles sector deny precedence over team allow', async () => {
    const team = await service.createTeam(accountId, { code: 'team', name: 'Team' });
    const sector = await service.createSector(accountId, { code: 'sector', name: 'Sector' });

    await service.replaceUserTeams(userId, [team.id]);
    await service.replaceUserSectors(userId, [sector.id]);
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'team',
      subjectId: team.id,
      permissionCode: 'patients.read',
      effect: 'allow'
    });
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'sector',
      subjectId: sector.id,
      permissionCode: 'patients.read',
      effect: 'deny'
    });

    const effective = service.getEffectivePermissions({ accountId, userId });
    const patientsPerm = effective.find((p) => p.permissionCode === 'patients.read');

    expect(patientsPerm?.effective).toBe(false);
    expect(patientsPerm?.resolution).toBe('sector_deny');
  });

  it('handles team deny precedence over role allow', async () => {
    const team = await service.createTeam(accountId, { code: 'team', name: 'Team' });

    await service.replaceLegacyRoles(userId, ['admin']);
    await service.replaceUserTeams(userId, [team.id]);
    await service.setPermissionAssignment({
      accountId,
      subjectType: 'team',
      subjectId: team.id,
      permissionCode: 'users.manage',
      effect: 'deny'
    });

    const effective = service.getEffectivePermissions({ accountId, userId });
    const usersPerm = effective.find((p) => p.permissionCode === 'users.manage');

    expect(usersPerm?.effective).toBe(false);
    expect(usersPerm?.resolution).toBe('team_deny');
  });

  it('enforces owner sector isolation only when actor lacks the requested sector code', () => {
    const engine = new AbacEngine();
    const environment = {
      timestamp: new Date('2026-04-18T10:00:00.000Z').toISOString(),
      dayOfWeek: 5 as const,
      hourOfDay: 10
    };

    expect(() =>
      engine.enforce(
        'owners.read',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: [],
          teamIds: [],
          sectorIds: [],
          sectorCodes: ['icu'],
          isActive: true
        },
        {
          resourceType: 'owner',
          resourceId: 'owner-1',
          accountId,
          sectorCode: 'icu'
        },
        environment
      )
    ).not.toThrow();

    expect(() =>
      engine.enforce(
        'owners.read',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: [],
          teamIds: [],
          sectorIds: [],
          sectorCodes: ['reception'],
          isActive: true
        },
        {
          resourceType: 'owner',
          resourceId: 'owner-1',
          accountId,
          sectorCode: 'icu'
        },
        environment
      )
    ).toThrow(ForbiddenError);
  });

  it('denies ABAC access when the resource belongs to another account even if sector matches', () => {
    const engine = new AbacEngine();

    expect(() =>
      engine.enforce(
        'owners.read',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: [],
          teamIds: [],
          sectorIds: [],
          sectorCodes: ['icu'],
          isActive: true
        },
        {
          resourceType: 'owner',
          resourceId: 'owner-2',
          accountId: 'acc_other' as AccountId,
          sectorCode: 'icu'
        },
        {
          timestamp: new Date('2026-04-18T10:00:00.000Z').toISOString(),
          dayOfWeek: 5,
          hourOfDay: 10
        }
      )
    ).toThrow(/Cross-account ABAC access is not allowed/);
  });

  it('permits same-account owner access only when tenant and sector constraints both hold', () => {
    const engine = new AbacEngine();

    expect(() =>
      engine.enforce(
        'owners.manage',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: ['branch_a'],
          teamIds: [],
          sectorIds: [],
          sectorCodes: ['triage', 'icu'],
          isActive: true
        },
        {
          resourceType: 'owner',
          resourceId: 'owner-3',
          accountId,
          branchId: 'branch_a',
          sectorCode: 'triage'
        },
        {
          timestamp: new Date('2026-04-18T14:00:00.000Z').toISOString(),
          dayOfWeek: 5,
          hourOfDay: 14
        }
      )
    ).not.toThrow();
  });

  it('denies same-account owner access when branch isolation fails even if sector matches', () => {
    const engine = new AbacEngine();

    expect(() =>
      engine.enforce(
        'owners.read',
        {
          userId,
          accountId,
          roleCodes: ['admin'],
          branchIds: ['branch_b'],
          teamIds: [],
          sectorIds: [],
          sectorCodes: ['triage'],
          isActive: true
        },
        {
          resourceType: 'owner',
          resourceId: 'owner-branch',
          accountId,
          branchId: 'branch_a',
          sectorCode: 'triage'
        },
        {
          timestamp: new Date('2026-04-18T14:00:00.000Z').toISOString(),
          dayOfWeek: 5,
          hourOfDay: 14
        }
      )
    ).toThrow(ForbiddenError);
  });

  it('denies inventory writes outside business hours for non-admin roles', () => {
    const engine = new AbacEngine();

    expect(() =>
      engine.enforce(
        'inventory.manage',
        {
          userId,
          accountId,
          roleCodes: ['inventory'],
          branchIds: [],
          teamIds: [],
          sectorIds: [],
          sectorCodes: [],
          isActive: true
        },
        {
          resourceType: 'inventory_item',
          resourceId: 'item-1',
          accountId
        },
        {
          timestamp: new Date('2026-04-18T22:00:00.000Z').toISOString(),
          dayOfWeek: 5,
          hourOfDay: 22
        }
      )
    ).toThrow(ForbiddenError);
  });
});
