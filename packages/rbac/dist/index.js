import { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from './permissions.js';
export { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS };
export * from './permissions.js';
export function permissionsForRole(role) {
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions ? [...rolePermissions] : [];
}
export function canonicalPermissions() {
    return [...CANONICAL_PERMISSIONS];
}
export function can(principal, permission) {
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
//# sourceMappingURL=index.js.map