import { apiRequest } from './api';
import type {
  AccessPermissionAssignmentSummary,
  AccessSectorSummary,
  AccessTeamSummary,
  EffectivePermissionSummary,
  PermissionDefinition,
  RoleDefinition
} from '@cvg-his-v2/shared-types';
import type { UserSummary } from '@/types/user';

export interface AccessControlUserRoleSummary {
  userId: string;
  roleCodes: string[];
}

export interface AccessControlMembershipsResponse {
  userTeams: Array<{ userId: string; teamId: string }>;
  userSectors: Array<{ userId: string; sectorId: string }>;
}

export interface AccessControlAssignmentsResponse {
  userPermissions: readonly AccessPermissionAssignmentSummary[];
  teamPermissions: readonly AccessPermissionAssignmentSummary[];
  sectorPermissions: readonly AccessPermissionAssignmentSummary[];
}

export interface AccessControlResponse {
  roles: readonly RoleDefinition[];
  permissions: readonly PermissionDefinition[];
  teams: readonly AccessTeamSummary[];
  sectors: readonly AccessSectorSummary[];
  users: readonly UserSummary[];
  assignments: AccessControlAssignmentsResponse;
  memberships: AccessControlMembershipsResponse;
  legacyRoles: readonly AccessControlUserRoleSummary[];
}

export const accessControlService = {
  async getCatalog(): Promise<AccessControlResponse> {
    return apiRequest<AccessControlResponse>('/access-control');
  },

  async listPermissions(): Promise<PermissionDefinition[]> {
    const response = await apiRequest<AccessControlResponse>('/access-control');
    return [...(response.permissions ?? [])];
  },

  async createTeam(payload: {
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessTeamSummary> {
    return apiRequest<AccessTeamSummary>('/access-control/teams', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateTeam(
    teamId: string,
    payload: {
      code?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    }
  ): Promise<AccessTeamSummary> {
    return apiRequest<AccessTeamSummary>(`/access-control/teams/${encodeURIComponent(teamId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async createSector(payload: {
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessSectorSummary> {
    return apiRequest<AccessSectorSummary>('/access-control/org-sectors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSector(
    sectorId: string,
    payload: {
      code?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    }
  ): Promise<AccessSectorSummary> {
    return apiRequest<AccessSectorSummary>(
      `/access-control/org-sectors/${encodeURIComponent(sectorId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }
    );
  },

  async setGrant(payload: {
    subjectType: 'user' | 'team' | 'sector';
    subjectId: string;
    permissionCode: string;
    effect?: 'allow' | 'deny' | 'inherit';
  }): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/access-control/grants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async replaceUserRoles(userId: string, roleCodes: readonly string[]): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/access-control/users/${encodeURIComponent(userId)}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roleCodes })
    });
  },

  async replaceUserTeams(userId: string, teamIds: readonly string[]): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/access-control/users/${encodeURIComponent(userId)}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamIds })
    });
  },

  async replaceUserSectors(userId: string, sectorIds: readonly string[]): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/access-control/users/${encodeURIComponent(userId)}/sectors`, {
      method: 'POST',
      body: JSON.stringify({ sectorIds })
    });
  },

  async getEffectivePermissions(userId: string): Promise<{
    user: UserSummary;
    memberships: { teams: readonly AccessTeamSummary[]; sectors: readonly AccessSectorSummary[] };
    effectivePermissions: readonly EffectivePermissionSummary[];
  }> {
    return apiRequest<{
      user: UserSummary;
      memberships: { teams: readonly AccessTeamSummary[]; sectors: readonly AccessSectorSummary[] };
      effectivePermissions: readonly EffectivePermissionSummary[];
    }>(`/access-control/users/${encodeURIComponent(userId)}/effective`);
  }
};
