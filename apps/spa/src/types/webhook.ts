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
  status: 'pending' | 'processing' | 'retrying' | 'delivered' | 'failed';
  attempts: number;
  maxAttempts?: number;
  lastAttemptAt?: string | null;
  responseStatus?: number | null;
  responseBody?: string | null;
  responseError?: string | null;
  nextRetryAt?: string | null;
  deadLetteredAt?: string | null;
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
