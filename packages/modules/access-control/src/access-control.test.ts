import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControlService } from './index.js';

describe('AccessControlService', () => {
  let service: AccessControlService;

  beforeEach(() => {
    service = new AccessControlService();
  });

  it('should list permissions', () => {
    const perms = service.listPermissions();
    expect(perms.length).toBeGreaterThan(0);
    expect(perms.some(p => p.code === 'owners.read')).toBe(true);
  });

  it('should list roles', () => {
    const roles = service.listRoles();
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.some(r => r.code === 'admin')).toBe(true);
  });

  it('should create a profile for admin', () => {
    const profile = service.createProfile({
      userId: 'user_1',
      accountId: 'acc_1',
      roleCodes: ['admin']
    });
    expect(profile.roleCodes.length).toBe(1);
    expect(profile.permissionCodes.length).toBeGreaterThan(0);
    expect(profile.capabilities.length).toBeGreaterThan(0);
  });

  it('should create profile for multiple roles', () => {
    const profile = service.createProfile({
      userId: 'user_1',
      accountId: 'acc_1',
      roleCodes: ['admin', 'veterinarian']
    });
    expect(profile.roleCodes.length).toBe(2);
    expect(profile.permissionCodes.length).toBeGreaterThan(10);
  });

  it('should throw for unauthorized permission', () => {
    const profile = service.createProfile({
      userId: 'user_1',
      accountId: 'acc_1',
      roleCodes: ['reception']
    });
    expect(() =>
      service.assertAuthorized({
        actor: { id: 'user_1', accountId: 'acc_1', status: 'active' },
        access: profile,
        permissionCode: 'audit.read',
        accountId: 'acc_1'
      })
    ).toThrow();
  });
});
