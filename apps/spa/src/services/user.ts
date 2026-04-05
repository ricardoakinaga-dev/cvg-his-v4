import { apiRequest } from './api';
import type {
  UserSummary,
  UsersListResponse,
  CreateUserRequest,
  UpdateUserRequest
} from '@/types/user';

export const userService = {
  async list(): Promise<UserSummary[]> {
    const response = await apiRequest<UsersListResponse>('/users');
    return response.items ?? [];
  },

  async getById(id: string): Promise<UserSummary> {
    return apiRequest<UserSummary>(`/users/${id}`);
  },

  async create(payload: CreateUserRequest): Promise<UserSummary> {
    return apiRequest<UserSummary>('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: UpdateUserRequest): Promise<UserSummary> {
    return apiRequest<UserSummary>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
