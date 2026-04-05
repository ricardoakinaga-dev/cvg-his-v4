import { beforeEach, describe, expect, it } from 'vitest';

import { AccessControlService } from './index.js';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

describe('AccessControlService', () => {
  let service: AccessControlService;
  const accountId = 'acc_1' as AccountId;
  const userId = 'user_1' as UserId;

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
});
