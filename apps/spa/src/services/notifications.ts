import { apiRequest } from './api';
import type { NotificationJobSummary, NotificationSummary } from '@cvg-his-v2/shared-types';

interface NotificationsResponse {
  items: readonly NotificationSummary[];
}

interface NotificationJobsResponse {
  items: readonly NotificationJobSummary[];
}

export const notificationService = {
  async list(status?: NotificationSummary['status']): Promise<NotificationSummary[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiRequest<NotificationsResponse>(`/notifications${params}`);
    return [...(response.items ?? [])];
  },

  async listJobs(): Promise<NotificationJobSummary[]> {
    const response = await apiRequest<NotificationJobsResponse>('/notifications/jobs');
    return [...(response.items ?? [])];
  },

  async processPending(limit = 10): Promise<NotificationSummary[]> {
    const response = await apiRequest<NotificationsResponse>('/notifications/process', {
      method: 'POST',
      body: JSON.stringify({ limit })
    });
    return [...(response.items ?? [])];
  }
};
