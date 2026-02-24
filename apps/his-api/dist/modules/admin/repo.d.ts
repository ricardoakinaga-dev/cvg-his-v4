import type { UserResponse, RoleResponse, PermissionResponse, AuditEventResponse } from './types.js';
export declare function findUsers(db: typeof import('@cvg-his/db').db, accountId: string, options: {
    q?: string;
    page: number;
    pageSize: number;
    includeInactive?: boolean;
}): Promise<{
    data: UserResponse[];
    total: number;
}>;
export declare function findUserById(db: typeof import('@cvg-his/db').db, accountId: string, userId: string): Promise<UserResponse | null>;
export declare function createUser(db: typeof import('@cvg-his/db').db, accountId: string, data: {
    email: string;
    fullName: string;
    passwordHash: string;
    unitId?: string | null;
}): Promise<UserResponse>;
export declare function updateUser(db: typeof import('@cvg-his/db').db, accountId: string, userId: string, data: {
    fullName?: string;
    unitId?: string | null;
}): Promise<UserResponse | null>;
export declare function setUserActiveStatus(db: typeof import('@cvg-his/db').db, accountId: string, userId: string, isActive: boolean): Promise<UserResponse | null>;
export declare function replaceUserRoles(db: typeof import('@cvg-his/db').db, accountId: string, userId: string, roleIds: string[]): Promise<void>;
export declare function findRoles(db: typeof import('@cvg-his/db').db, options: {
    page: number;
    pageSize: number;
}): Promise<{
    data: RoleResponse[];
    total: number;
}>;
export declare function findRoleById(db: typeof import('@cvg-his/db').db, roleId: string): Promise<RoleResponse | null>;
export declare function createRole(db: typeof import('@cvg-his/db').db, data: {
    name: string;
    description?: string | null;
}): Promise<RoleResponse>;
export declare function updateRole(db: typeof import('@cvg-his/db').db, roleId: string, data: {
    name?: string;
    description?: string | null;
}): Promise<RoleResponse | null>;
export declare function deleteRole(db: typeof import('@cvg-his/db').db, roleId: string): Promise<boolean>;
export declare function replaceRolePermissions(db: typeof import('@cvg-his/db').db, roleId: string, permissionIds: string[]): Promise<void>;
export declare function isRoleInUse(db: typeof import('@cvg-his/db').db, roleId: string): Promise<boolean>;
export declare function findAllPermissions(db: typeof import('@cvg-his/db').db): Promise<PermissionResponse[]>;
export declare function findAuditEvents(db: typeof import('@cvg-his/db').db, accountId: string, options: {
    actorId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
}): Promise<{
    data: AuditEventResponse[];
    total: number;
}>;
//# sourceMappingURL=repo.d.ts.map