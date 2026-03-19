import { getAuthSession } from './auth';
import { can, RbacPrincipal, permissionsForRole, PERMISSIONS } from '@cvg-his/rbac';

export { PERMISSIONS };

export function getCurrentPrincipal(): RbacPrincipal {
    const session = getAuthSession();
    if (!session) {
        return {
            permissions: [],
            roles: []
        };
    }

    return {
        role: session.role,
        roles: session.roles,
        permissions: session.permissions
    };
}

export function usePermission(permission: string): boolean {
    // In a real app with React Context, this would react to session changes.
    // Since we use a simple singleton/localStorage approach for now,
    // we can read directly. For reactivity, we'd need a Context Provider or
    // useSyncExternalStore. Given the current "Phase 1" architecture,
    // direct access during render is acceptable as session changes cause full reload/redirect.
    const principal = getCurrentPrincipal();
    return can(principal, permission);
}

export function useRole(role: string): boolean {
    const principal = getCurrentPrincipal();
    if (principal.role === role) return true;
    if (principal.roles && principal.roles.includes(role)) return true;
    return false;
}
