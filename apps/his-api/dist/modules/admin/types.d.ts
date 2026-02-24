import { z } from 'zod';
export declare const listUsersQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    includeInactive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    includeInactive: boolean;
    q?: string | undefined;
}, {
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    includeInactive?: boolean | undefined;
}>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    fullName: z.ZodString;
    password: z.ZodString;
    unitId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    roleIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    email: string;
    password: string;
    roleIds: string[];
    unitId?: string | null | undefined;
}, {
    fullName: string;
    email: string;
    password: string;
    unitId?: string | null | undefined;
    roleIds?: string[] | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    unitId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    roleIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    unitId?: string | null | undefined;
    roleIds?: string[] | undefined;
}, {
    fullName?: string | undefined;
    unitId?: string | null | undefined;
    roleIds?: string[] | undefined;
}>;
export declare const disableUserSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const listRolesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const createRoleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
}>;
export declare const updateRoleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
}>;
export declare const updateRolePermissionsSchema: z.ZodObject<{
    permissionIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    permissionIds: string[];
}, {
    permissionIds: string[];
}>;
export declare const updateUserRolesSchema: z.ZodObject<{
    roleIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    roleIds: string[];
}, {
    roleIds: string[];
}>;
export declare const listAuditQuerySchema: z.ZodObject<{
    actorId: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    entityType?: string | undefined;
    action?: string | undefined;
    actorId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    entityType?: string | undefined;
    action?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    actorId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type UserResponse = {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    unitId: string | null;
    unitName: string | null;
    roles: Array<{
        id: string;
        name: string;
    }>;
    createdAt: string;
    updatedAt: string;
};
export type RoleResponse = {
    id: string;
    name: string;
    description: string | null;
    permissions: Array<{
        id: string;
        key: string;
    }>;
    createdAt: string;
};
export type PermissionResponse = {
    id: string;
    key: string;
    description: string | null;
    createdAt: string;
};
export type AuditEventResponse = {
    id: string;
    createdAt: string;
    actorUserId: string | null;
    actorRoles: string[];
    action: string;
    entityType: string;
    entityId: string;
    beforeJson: Record<string, unknown> | null;
    afterJson: Record<string, unknown> | null;
    reason: string | null;
    requestId: string | null;
};
export type PaginatedResponse<T> = {
    page: number;
    pageSize: number;
    total: number;
    data: T[];
};
//# sourceMappingURL=types.d.ts.map