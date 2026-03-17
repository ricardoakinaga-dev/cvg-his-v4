import { permissionsForRole } from '@cvg-his/rbac';
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
function parseCsv(value) {
    return (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function dedupe(values) {
    return Array.from(new Set(values));
}
export function resolveActorFromHeaders(headers) {
    const accountId = asString(headers['x-account-id']);
    if (!accountId) {
        return undefined;
    }
    const userId = asString(headers['x-user-id']);
    const unitId = asString(headers['x-unit-id']);
    const role = asString(headers['x-role']);
    const explicitRoles = parseCsv(asString(headers['x-roles']));
    const explicitPermissions = parseCsv(asString(headers['x-permissions']));
    const roles = dedupe(explicitRoles.length > 0 ? explicitRoles : role ? [role] : []);
    const inheritedPermissions = roles.flatMap((roleName) => permissionsForRole(roleName));
    const permissions = dedupe([
        ...inheritedPermissions,
        ...explicitPermissions
    ]);
    return {
        accountId,
        userId,
        unitId,
        role: role ?? roles[0],
        roles,
        permissions
    };
}
//# sourceMappingURL=service.js.map