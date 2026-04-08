export interface WebhookSummary {
  id: string;
  accountId: string;
  url: string;
  events: readonly string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt: string;
  responseStatus: number | null;
  responseBody: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export const AVAILABLE_EVENTS = [
  'billing.record.created',
  'billing.status_changed',
  'encounter.created',
  'encounter.status_changed',
  'patient.created',
  'appointment.scheduled',
  'appointment.status_changed',
  'notification.sent'
] as const;
