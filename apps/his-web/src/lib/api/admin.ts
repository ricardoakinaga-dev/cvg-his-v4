/**
 * Admin API Client
 * 
 * Provides functions for interacting with the admin endpoints
 */

import { api, fetchJson, buildUrl } from './client';

// ============================================
// Types
// ============================================

export type User = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  unitId: string | null;
  unitName: string | null;
  roles: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; key: string }>;
  createdAt: string;
};

export type Permission = {
  id: string;
  key: string;
  description: string | null;
  createdAt: string;
};

export type AuditEvent = {
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

// ============================================
// Users API
// ============================================

export type ListUsersParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
};

export async function listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<User>> {
  return api.get<PaginatedResponse<User>>('/admin/users', {
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
    includeInactive: params.includeInactive
  });
}

export type CreateUserParams = {
  email: string;
  fullName: string;
  password: string;
  unitId?: string | null;
  roleIds?: string[];
};

export async function createUser(params: CreateUserParams): Promise<User> {
  return api.post<User>('/admin/users', params);
}

export async function getUser(id: string): Promise<User> {
  return api.get<User>(`/admin/users/${id}`);
}

export type UpdateUserParams = {
  fullName?: string;
  unitId?: string | null;
  roleIds?: string[];
};

export async function updateUser(id: string, params: UpdateUserParams): Promise<User> {
  return api.put<User>(`/admin/users/${id}`, params);
}

export type DisableUserParams = {
  reason?: string;
};

export async function disableUser(id: string, params: DisableUserParams = {}): Promise<User> {
  return api.post<User>(`/admin/users/${id}/disable`, params);
}

export async function enableUser(id: string): Promise<User> {
  return api.post<User>(`/admin/users/${id}/enable`, {});
}

export async function updateUserRoles(id: string, roleIds: string[]): Promise<{ ok: boolean }> {
  return api.put<{ ok: boolean }>(`/admin/users/${id}/roles`, { roleIds });
}

// ============================================
// Roles API
// ============================================

export type ListRolesParams = {
  page?: number;
  pageSize?: number;
};

export async function listRoles(params: ListRolesParams = {}): Promise<PaginatedResponse<Role>> {
  return api.get<PaginatedResponse<Role>>('/admin/roles', {
    page: params.page,
    pageSize: params.pageSize
  });
}

export type CreateRoleParams = {
  name: string;
  description?: string | null;
};

export async function createRole(params: CreateRoleParams): Promise<Role> {
  return api.post<Role>('/admin/roles', params);
}

export async function getRole(id: string): Promise<Role> {
  return api.get<Role>(`/admin/roles/${id}`);
}

export type UpdateRoleParams = {
  name?: string;
  description?: string | null;
};

export async function updateRole(id: string, params: UpdateRoleParams): Promise<Role> {
  return api.put<Role>(`/admin/roles/${id}`, params);
}

export async function deleteRole(id: string): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/admin/roles/${id}`);
}

export async function updateRolePermissions(id: string, permissionIds: string[]): Promise<{ ok: boolean }> {
  return api.put<{ ok: boolean }>(`/admin/roles/${id}/permissions`, { permissionIds });
}

// ============================================
// Permissions API
// ============================================

export async function listPermissions(): Promise<Permission[]> {
  return api.get<Permission[]>('/admin/permissions');
}

// ============================================
// Audit API
// ============================================

export type ListAuditParams = {
  actorId?: string;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export async function listAuditEvents(params: ListAuditParams = {}): Promise<PaginatedResponse<AuditEvent>> {
  return api.get<PaginatedResponse<AuditEvent>>('/admin/audit', params);
}
