import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const createUserBodySchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3).max(64).optional(),
  fullName: z.string().trim().min(3).max(255),
  unitId: z.string().uuid().optional(),
  password: z.string().min(8).max(128),
  mustChangePassword: z.boolean().optional().default(true),
  roleIds: z.array(z.string().uuid()).min(1)
});

export const updateUserBodySchema = z.object({
  email: z.string().email().optional(),
  username: z.string().trim().min(3).max(64).nullable().optional(),
  fullName: z.string().trim().min(3).max(255).optional(),
  unitId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  mustChangePassword: z.boolean().optional()
});

export const resetPasswordBodySchema = z.object({
  password: z.string().min(8).max(128),
  mustChangePassword: z.boolean().optional().default(true)
});

export const replaceUserRolesBodySchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1)
});

export const roleIdParamSchema = z.object({
  id: z.string().uuid()
});

export const userIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createRoleBodySchema = z.object({
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(500).nullable().optional()
});

export const updateRoleBodySchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  description: z.string().trim().max(500).nullable().optional()
});

export const replaceRolePermissionsBodySchema = z.object({
  permissionIds: z.array(z.string().uuid())
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createScopeBodySchema = z.object({
  scopeType: z.string().trim().min(2).max(32),
  scopeKey: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().max(512).nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

export const replaceUserScopesBodySchema = z.object({
  scopeIds: z.array(z.string().uuid()),
  expiresAt: z.string().datetime().nullable().optional()
});
