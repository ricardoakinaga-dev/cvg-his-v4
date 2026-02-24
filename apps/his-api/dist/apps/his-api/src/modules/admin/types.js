import { z } from 'zod';
// ============================================
// User Management Schemas
// ============================================
export const listUsersQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    includeInactive: z.coerce.boolean().optional().default(false)
});
export const createUserSchema = z.object({
    email: z.string().email().max(320),
    fullName: z.string().trim().min(1).max(255),
    password: z.string().min(8).max(128),
    unitId: z.string().uuid().optional().nullable(),
    roleIds: z.array(z.string().uuid()).optional().default([])
});
export const updateUserSchema = z.object({
    fullName: z.string().trim().min(1).max(255).optional(),
    unitId: z.string().uuid().optional().nullable(),
    roleIds: z.array(z.string().uuid()).optional()
});
export const disableUserSchema = z.object({
    reason: z.string().trim().max(500).optional()
});
// ============================================
// Role Management Schemas
// ============================================
export const listRolesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50)
});
export const createRoleSchema = z.object({
    name: z.string().trim().min(1).max(64),
    description: z.string().trim().max(500).optional().nullable()
});
export const updateRoleSchema = z.object({
    name: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(500).optional().nullable()
});
export const updateRolePermissionsSchema = z.object({
    permissionIds: z.array(z.string().uuid())
});
// ============================================
// User Roles Management Schemas
// ============================================
export const updateUserRolesSchema = z.object({
    roleIds: z.array(z.string().uuid())
});
// ============================================
// Audit Query Schemas
// ============================================
export const listAuditQuerySchema = z.object({
    actorId: z.string().uuid().optional(),
    entityType: z.string().trim().max(64).optional(),
    action: z.string().trim().max(64).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
});
//# sourceMappingURL=types.js.map