import { apiRequest } from './api';
import type {
  WebhookSummary,
  WebhookDelivery,
  CreateWebhookRequest,
  UpdateWebhookRequest
} from '@/types/webhook';

interface WebhooksResponse {
  items: readonly WebhookSummary[];
}

interface WebhookDeliveriesResponse {
  items: readonly WebhookDelivery[];
}

export interface WebhookListFilters {
  url?: string;
  event?: string;
  active?: boolean;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  body?: string;
}

function buildWebhookQuery(filters?: WebhookListFilters): string {
  const params = new URLSearchParams();
  if (filters?.url) params.set('url', filters.url);
  if (filters?.event) params.set('event', filters.event);
  if (filters?.active !== undefined) params.set('active', String(filters.active));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const webhookService = {
  async list(filters?: WebhookListFilters): Promise<WebhookSummary[]> {
    const response = await apiRequest<WebhooksResponse>(`/webhooks${buildWebhookQuery(filters)}`);
    return [...(response.items ?? [])];
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
    await apiRequest<void>(`/webhooks/${id}`, { method: 'DELETE' });
  },

  async test(id: string): Promise<WebhookTestResult> {
    return apiRequest<WebhookTestResult>(`/webhooks/${id}/test`, { method: 'POST' });
  },

  async getDeliveries(id: string): Promise<WebhookDelivery[]> {
    const response = await apiRequest<WebhookDeliveriesResponse>(`/webhooks/${id}/deliveries`);
    return [...(response.items ?? [])];
  }
};
