import { apiRequest } from './api';
import type { ApiKeySummary } from '@cvg-his-v2/shared-types';

interface ApiKeysResponse {
  items: readonly ApiKeySummary[];
}

export interface CreateApiKeyPayload {
  name: string;
  permissions: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: Omit<ApiKeySummary, 'keyHash'>;
  rawKey: string;
}

export const apiKeysService = {
  async list(): Promise<ApiKeySummary[]> {
    const response = await apiRequest<ApiKeysResponse>('/api-keys');
    return [...(response.items ?? [])];
  },

  async create(payload: CreateApiKeyPayload): Promise<CreateApiKeyResponse> {
    return apiRequest<CreateApiKeyResponse>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
