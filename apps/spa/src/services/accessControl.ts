import { apiRequest } from './api';
import type { PermissionDefinition } from '@cvg-his-v2/shared-types';

interface AccessControlResponse {
  permissions: readonly PermissionDefinition[];
}

export const accessControlService = {
  async listPermissions(): Promise<PermissionDefinition[]> {
    const response = await apiRequest<AccessControlResponse>('/access-control');
    return [...(response.permissions ?? [])];
  }
};
