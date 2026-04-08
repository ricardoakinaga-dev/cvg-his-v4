import { apiRequest } from './api';
import type {
  WebhookSummary,
  WebhookDelivery,
  CreateWebhookRequest,
  UpdateWebhookRequest
} from '@/types/webhook';

export const webhookService = {
  async list(): Promise<WebhookSummary[]> {
    const response = await apiRequest<{ items: WebhookSummary[] }>('/webhooks');
    return response.items ?? [];
  },

  async getById(id: string): Promise<WebhookSummary> {
    return apiRequest<WebhookSummary>(`/webhooks/${id}`);
  },

  async create(payload: CreateWebhookRequest): Promise<WebhookSummary> {
    return apiRequest<WebhookSummary>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: UpdateWebhookRequest): Promise<WebhookSummary> {
    return apiRequest<WebhookSummary>(`/webhooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/webhooks/${id}`, {
      method: 'DELETE'
    });
  },

  async listDeliveries(id: string): Promise<WebhookDelivery[]> {
    const response = await apiRequest<{ items: WebhookDelivery[] }>(`/webhooks/${id}/deliveries`);
    return response.items ?? [];
  }
};
