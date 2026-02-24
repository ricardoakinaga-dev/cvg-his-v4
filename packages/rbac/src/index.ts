import {
  type CanonicalPermission,
  type CanonicalRole,
  CANONICAL_PERMISSIONS,
  ROLE_PERMISSIONS
} from './permissions.js';

export { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS };
export * from './permissions.js';

export type RbacPrincipal = {
  permissions?: string[];
  role?: string;
  roles?: string[];
};

export function permissionsForRole(role: string): string[] {
  const rolePermissions = ROLE_PERMISSIONS[role as CanonicalRole];
  return rolePermissions ? [...rolePermissions] : [];
}

export function canonicalPermissions(): CanonicalPermission[] {
  return [...CANONICAL_PERMISSIONS];
}

export function can(principal: RbacPrincipal, permission: string): boolean {
  const directPermissions = principal.permissions ?? [];

  if (directPermissions.includes('*') || directPermissions.includes(permission)) {
    return true;
  }

  const roles = principal.roles ?? (principal.role ? [principal.role] : []);

  for (const role of roles) {
    const inherited = permissionsForRole(role);
    if (inherited.includes(permission)) {
      return true;
    }
  }

  return false;
}
