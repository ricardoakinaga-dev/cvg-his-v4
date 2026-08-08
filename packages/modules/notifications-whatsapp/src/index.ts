import type { AccountId, OwnerId, PatientId } from '@cvg-his-v2/shared-types';

import type {
  NotificationChannelConfig,
  WhatsAppMessagePayload,
  WhatsAppProvider,
  WhatsAppProviderType
} from './types.js';
import { ProviderNotConfiguredError, MissingCredentialsError } from './types.js';
import { createWhatsAppProvider } from './adapters.js';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';

export interface AppointmentReminderData {
  readonly appointmentId: string;
  readonly accountId: AccountId;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
  readonly patientName: string;
  readonly ownerPhone: string;
  readonly ownerName: string;
  readonly scheduledAt: string;
  readonly visitType: string;
  readonly clinicName: string;
}

export interface NotificationSettingsProvider {
  getWhatsAppConfig(accountId: AccountId): Promise<NotificationChannelConfig | null>;
}

export interface OwnerLookup {
  getOwnerPhone(ownerId: OwnerId): string | null;
  getOwnerName(ownerId: OwnerId): string | null;
}

export interface PatientLookup {
  getPatientName(patientId: PatientId): string | null;
}

export interface SettingsLookup {
  getClinicName(accountId: AccountId): string | null;
}

export interface WhatsAppReminderSendResult {
  readonly sent: boolean;
  readonly messageId?: string;
  readonly error?: string;
  readonly provider?: WhatsAppProviderType;
}

export interface WhatsAppCampaignMessageData {
  readonly accountId: AccountId;
  readonly campaignId: string;
  readonly ownerId: OwnerId;
  readonly patientId?: PatientId;
  readonly recipient: string;
  readonly recipientName: string;
  readonly body: string;
}

export class WhatsAppProviderService {
  readonly #settingsProvider: NotificationSettingsProvider;
  readonly #ownerLookup: OwnerLookup;
  readonly #patientLookup: PatientLookup;
  #providers = new Map<string, WhatsAppProvider>();

  public constructor(
    settingsProvider: NotificationSettingsProvider,
    ownerLookup: OwnerLookup,
    patientLookup: PatientLookup
  ) {
    this.#settingsProvider = settingsProvider;
    this.#ownerLookup = ownerLookup;
    this.#patientLookup = patientLookup;
  }

  async #getProvider(accountId: AccountId): Promise<WhatsAppProvider> {
    const cached = this.#providers.get(accountId);
    if (cached) return cached;

    const config = await this.#settingsProvider.getWhatsAppConfig(accountId);
    if (!config) {
      throw new ProviderNotConfiguredError('no-config');
    }

    const provider = createWhatsAppProvider(config);
    this.#providers.set(accountId, provider);
    return provider;
  }

  async sendAppointmentReminder(
    data: AppointmentReminderData
  ): Promise<WhatsAppReminderSendResult> {
    try {
      const provider = await this.#getProvider(data.accountId);

      const validation = await provider.validateConfiguration();
      if (!validation.valid) {
        return { sent: false, error: validation.error, provider: provider.type };
      }

      const templateBody = this.#buildReminderTemplate(data);

      const payload: WhatsAppMessagePayload = {
        recipient: data.ownerPhone,
        recipientName: data.ownerName,
        body: templateBody,
        templateName: 'appointment_reminder',
        templateVariables: [
          data.patientName,
          this.#formatScheduledAt(data.scheduledAt),
          data.visitType,
          data.clinicName
        ],
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        ownerId: data.ownerId
      };

      const result = await provider.sendMessage(payload);
      return {
        sent: result.success,
        messageId: result.messageId,
        error: result.success ? undefined : result.errorMessage,
        provider: provider.type
      };
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        return { sent: false, error: `Provider not configured for account ${data.accountId}` };
      }
      if (err instanceof MissingCredentialsError) {
        return { sent: false, error: err.message };
      }
      return {
        sent: false,
        error: err instanceof Error ? err.message : 'Unknown error sending WhatsApp reminder'
      };
    }
  }

  async sendCampaignMessage(
    data: WhatsAppCampaignMessageData
  ): Promise<WhatsAppReminderSendResult> {
    try {
      const provider = await this.#getProvider(data.accountId);
      const validation = await provider.validateConfiguration();
      if (!validation.valid) {
        return { sent: false, error: validation.error, provider: provider.type };
      }

      const result = await provider.sendMessage({
        recipient: data.recipient,
        recipientName: data.recipientName,
        body: data.body,
        templateName: 'marketing_campaign',
        templateVariables: [],
        appointmentId: `campaign:${data.campaignId}`,
        patientId: data.patientId ?? ('marketing' as PatientId),
        ownerId: data.ownerId
      });
      return {
        sent: result.success,
        messageId: result.messageId,
        error: result.success ? undefined : result.errorMessage,
        provider: provider.type
      };
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError || err instanceof MissingCredentialsError) {
        return { sent: false, error: err.message };
      }
      return {
        sent: false,
        error: err instanceof Error ? err.message : 'Unknown error sending WhatsApp campaign'
      };
    }
  }

  #buildReminderTemplate(data: AppointmentReminderData): string {
    return `Olá, ${data.ownerName}! Lembrete: ${data.patientName} tem consulta marcada para ${this.#formatScheduledAt(data.scheduledAt)}.\n\nTipo: ${data.visitType}\n\nPara confirmar ou remarcar, entre em contato com a clínica.`;
  }

  #formatScheduledAt(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export class InMemoryNotificationSettingsProvider implements NotificationSettingsProvider {
  #configs = new Map<AccountId, NotificationChannelConfig>();

  setConfig(accountId: AccountId, config: NotificationChannelConfig): void {
    this.#configs.set(accountId, config);
  }

  async getWhatsAppConfig(accountId: AccountId): Promise<NotificationChannelConfig | null> {
    return this.#configs.get(accountId) ?? null;
  }
}

export class EnvNotificationSettingsProvider implements NotificationSettingsProvider {
  readonly #defaultAccountId?: AccountId;
  readonly #enabled: boolean;
  readonly #providerType: 'twilio' | '360dialog';
  readonly #apiKey: string;
  readonly #fromNumber: string;

  public constructor(defaultAccountId?: AccountId) {
    this.#defaultAccountId = defaultAccountId;
    this.#enabled = process.env['WHATSAPP_ENABLED'] === 'true';
    this.#providerType = (process.env['WHATSAPP_PROVIDER'] as 'twilio' | '360dialog') ?? 'twilio';
    this.#apiKey = process.env['WHATSAPP_API_KEY'] ?? '';
    this.#fromNumber = process.env['WHATSAPP_FROM_NUMBER'] ?? '';
  }

  async getWhatsAppConfig(accountId: AccountId): Promise<NotificationChannelConfig | null> {
    if (!this.#enabled) {
      return null;
    }
    if (!this.#apiKey || this.#apiKey.trim().length === 0) {
      return null;
    }
    if (!this.#fromNumber || this.#fromNumber.trim().length === 0) {
      return null;
    }
    return {
      providerType: this.#providerType,
      enabled: true,
      apiKey: this.#apiKey,
      fromNumber: this.#fromNumber,
      accountId: accountId || this.#defaultAccountId || ('account_env' as AccountId)
    };
  }
}

export class InMemoryOwnerLookup implements OwnerLookup {
  #phones = new Map<OwnerId, string>();
  #names = new Map<OwnerId, string>();

  setPhone(ownerId: OwnerId, phone: string): void {
    this.#phones.set(ownerId, phone);
  }

  setName(ownerId: OwnerId, name: string): void {
    this.#names.set(ownerId, name);
  }

  getOwnerPhone(ownerId: OwnerId): string | null {
    return this.#phones.get(ownerId) ?? null;
  }

  getOwnerName(ownerId: OwnerId): string | null {
    return this.#names.get(ownerId) ?? null;
  }
}

export class InMemoryPatientLookup implements PatientLookup {
  #names = new Map<PatientId, string>();

  setName(patientId: PatientId, name: string): void {
    this.#names.set(patientId, name);
  }

  getPatientName(patientId: PatientId): string | null {
    return this.#names.get(patientId) ?? null;
  }
}

export class RuntimeOwnerLookup implements OwnerLookup {
  readonly #owners: OwnersService;

  public constructor(owners: OwnersService) {
    this.#owners = owners;
  }

  getOwnerPhone(ownerId: OwnerId): string | null {
    try {
      const owner = this.#owners.getOrThrow(ownerId);
      const whatsappContact = owner.contacts.find((c) => c.type === 'whatsapp');
      if (whatsappContact?.value) {
        return whatsappContact.value.replace(/\D/g, '');
      }
      const phoneContact = owner.contacts.find((c) => c.type === 'phone');
      if (phoneContact?.value) {
        return phoneContact.value.replace(/\D/g, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  getOwnerName(ownerId: OwnerId): string | null {
    try {
      return this.#owners.getOrThrow(ownerId).fullName;
    } catch {
      return null;
    }
  }
}

export class RuntimePatientLookup implements PatientLookup {
  readonly #patients: PatientsService;

  public constructor(patients: PatientsService) {
    this.#patients = patients;
  }

  getPatientName(patientId: PatientId): string | null {
    try {
      return this.#patients.getOrThrow(patientId).name;
    } catch {
      return null;
    }
  }
}

export class RuntimeSettingsLookup implements SettingsLookup {
  #clinicNames = new Map<AccountId, string>();

  setClinicName(accountId: AccountId, name: string): void {
    this.#clinicNames.set(accountId, name);
  }

  getClinicName(accountId: AccountId): string | null {
    return this.#clinicNames.get(accountId) ?? 'Clínica Veterinária';
  }
}

export { AppointmentReminderWorkflow, InMemorySettingsLookup } from './reminder-workflow.js';
