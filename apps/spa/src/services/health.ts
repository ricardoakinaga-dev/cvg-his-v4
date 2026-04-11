import { apiRequest } from './api';
import type { HealthStatus } from '@cvg-his-v2/shared-types';

export const healthService = {
  async get(): Promise<HealthStatus> {
    return apiRequest<HealthStatus>('/health', { skipAuth: true });
  }
};
