import { z } from 'zod';

export const iamRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable()
});

export const iamPermissionSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  description: z.string().nullable()
});

export const iamScopeSchema = z.object({
  id: z.string().uuid(),
  scopeType: z.string().min(1),
  scopeKey: z.string().min(1),
  name: z.string().min(1),
  expiresAt: z.string().datetime().nullable().optional()
});

export const iamUserCoreSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  unitId: z.string().uuid().nullable(),
  email: z.string().email(),
  username: z.string().nullable(),
  fullName: z.string().min(1),
  passwordHash: z.string().min(1),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  failedLoginAttempts: z.number().int().nonnegative(),
  lockedUntil: z.string().datetime().nullable()
});

export const iamAuthProfileSchema = iamUserCoreSchema.extend({
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  scopes: z.array(iamScopeSchema)
});

export type IamAuthProfile = z.infer<typeof iamAuthProfileSchema>;
