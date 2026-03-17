import { AuthSession } from './auth';

export type Permission = string;

export function resolvePermissions(
    session: AuthSession | null,
    rolePermissions: Record<string, string[]>
): Set<string> {
    const permissions = new Set<string>();
    if (!session) {
        return permissions;
    }

    const roleCandidates = [
        session.role,
        ...(Array.isArray(session.roles) ? session.roles : [])
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    for (const role of roleCandidates) {
        const fromRole = rolePermissions[role] ?? [];
        for (const permission of fromRole) {
            permissions.add(permission);
        }
    }

    const explicitPermissions = Array.isArray(session.permissions) ? session.permissions : [];
    for (const permission of explicitPermissions) {
        permissions.add(permission);
    }

    return permissions;
}

export function can(permissions: Set<string>, permission: string): boolean {
    return permissions.has('*') || permissions.has(permission);
}
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ['*'],
    vet: ['medorder.read', 'medorder.write', 'medorder.stop', 'medadmin.read', 'medlog.read', 'audit.read'],
    enfermagem: ['medorder.read', 'medadmin.read', 'medlog.read'],
    recepcao: []
};
