import type {
  AccountId,
  OwnerId,
  PatientId,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';

export type WhatsAppProviderType = 'twilio' | '360dialog';

export interface WhatsAppMessagePayload {
  readonly recipient: string;
  readonly recipientName: string;
  readonly body: string;
  readonly templateName: string;
  readonly templateVariables: readonly string[];
  readonly appointmentId: string;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
}

export interface WhatsAppDeliveryResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface WhatsAppProvider {
  readonly type: WhatsAppProviderType;
  sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppDeliveryResult>;
  validateConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

export interface NotificationChannelConfig {
  readonly providerType: WhatsAppProviderType;
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly fromNumber: string;
  readonly accountId: AccountId;
}

export interface ReminderContext {
  readonly appointment: SchedulingAppointmentSummary;
  readonly patientName: string;
  readonly ownerPhone: string;
  readonly ownerName: string;
  readonly clinicName: string;
}

export class MissingCredentialsError extends Error {
  constructor(provider: string, field: string) {
    super(`Missing ${field} for WhatsApp provider: ${provider}`);
    this.name = 'MissingCredentialsError';
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`WhatsApp provider '${provider}' is not configured or disabled`);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderDeliveryError extends Error {
  constructor(provider: string, code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'ProviderDeliveryError';
  }
}
