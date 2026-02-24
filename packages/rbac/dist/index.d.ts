import { type CanonicalPermission, CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from './permissions.js';
export { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS };
export * from './permissions.js';
export type RbacPrincipal = {
    permissions?: string[];
    role?: string;
    roles?: string[];
};
export declare function permissionsForRole(role: string): string[];
export declare function canonicalPermissions(): CanonicalPermission[];
export declare function can(principal: RbacPrincipal, permission: string): boolean;
//# sourceMappingURL=index.d.ts.map