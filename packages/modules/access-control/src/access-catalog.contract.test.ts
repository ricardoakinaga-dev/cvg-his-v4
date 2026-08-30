import { describe, expect, it } from 'vitest';

import { V2_ACCESS_CONTROL_PERMISSION_SEEDS, V2_ACCESS_CONTROL_ROLE_SEEDS } from '@cvg-his-v2/rbac';

import { AccessControlService } from './index.js';

const REQUIRED_API_PERMISSIONS = [
  'auth.session.read',
  'auth.mfa.read',
  'auth.mfa.manage',
  'access.read',
  'users.read',
  'users.manage',
  'staff.read',
  'staff.manage',
  'audit.read',
  'lgpd.requests.read',
  'lgpd.requests.manage',
  'owners.read',
  'owners.manage',
  'patients.read',
  'patients.manage',
  'encounters.read',
  'encounters.manage',
  'medical-records.read',
  'medical-records.manage',
  'billing.read',
  'billing.manage',
  'inventory.read',
  'inventory.manage',
  'laboratory.results.write',
  'fiscal.read',
  'fiscal.manage',
  'flags.read',
  'flags.admin',
  'payments.manage'
] as const;

describe('canonical seven-profile access catalog', () => {
  it('contains every permission code used by protected application routes', () => {
    const service = new AccessControlService();
    const serviceCodes = service.listPermissions().map((permission) => permission.code);
    const seedCodes = V2_ACCESS_CONTROL_PERMISSION_SEEDS.map((permission) => permission.key);

    expect(new Set(serviceCodes).size).toBe(serviceCodes.length);
    expect(new Set(seedCodes).size).toBe(seedCodes.length);
    expect(serviceCodes).toEqual(seedCodes);
    expect(serviceCodes).toEqual(expect.arrayContaining(Array.from(REQUIRED_API_PERMISSIONS)));
  });

  it('keeps runtime role projections identical to the dependency-free baseline', () => {
    const service = new AccessControlService();
    const runtimeRoles = new Map(
      service.listRoles().map((role) => [role.code, [...role.permissionCodes].sort()])
    );

    expect(runtimeRoles.size).toBe(7);
    for (const role of V2_ACCESS_CONTROL_ROLE_SEEDS) {
      expect(runtimeRoles.get(role.name)).toEqual([...role.permissionCodes].sort());
    }

    const admin = runtimeRoles.get('admin') ?? [];
    expect(admin).toEqual(
      [...V2_ACCESS_CONTROL_PERMISSION_SEEDS.map((permission) => permission.key)].sort()
    );

    for (const roleName of [
      'reception',
      'nurse',
      'veterinarian',
      'finance',
      'inventory',
      'auditor'
    ]) {
      expect(runtimeRoles.get(roleName)).toEqual(
        expect.arrayContaining(Array.from(['auth.mfa.read', 'auth.mfa.manage']))
      );
    }
  });
});
