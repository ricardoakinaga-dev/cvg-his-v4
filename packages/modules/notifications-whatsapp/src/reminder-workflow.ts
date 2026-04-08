import type { AccountId, OwnerId, PatientId } from '@cvg-his-v2/shared-types';

import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import type {
  NotificationSettingsProvider,
  OwnerLookup,
  PatientLookup,
  SettingsLookup
} from './index.js';

import { WhatsAppProviderService } from './index.js';
import type { AppointmentReminderData } from './index.js';

export class AppointmentReminderWorkflow {
  readonly #whatsAppProvider: WhatsAppProviderService;
  readonly #ownerLookup: OwnerLookup;
  readonly #patientLookup: PatientLookup;
  readonly #settingsLookup: SettingsLookup;

  public constructor(
    whatsAppProvider: WhatsAppProviderService,
    ownerLookup: OwnerLookup,
    patientLookup: PatientLookup,
    settingsLookup: SettingsLookup
  ) {
    this.#whatsAppProvider = whatsAppProvider;
    this.#ownerLookup = ownerLookup;
    this.#patientLookup = patientLookup;
    this.#settingsLookup = settingsLookup;
  }

  async onAppointmentScheduled(
    appointment: SchedulingAppointmentSummary
  ): Promise<{ processed: boolean; sent: boolean; error?: string }> {
    const ownerPhone = this.#ownerLookup.getOwnerPhone(appointment.ownerId);
    if (!ownerPhone || ownerPhone.trim().length === 0) {
      return {
        processed: true,
        sent: false,
        error: `No WhatsApp contact found for owner ${appointment.ownerId}`
      };
    }

    const ownerName = this.#ownerLookup.getOwnerName(appointment.ownerId);
    const patientName = this.#patientLookup.getPatientName(appointment.patientId) ?? 'Pet';
    const clinicName = this.#settingsLookup.getClinicName(appointment.accountId) ?? 'Nossa Clínica';

    const reminderData: AppointmentReminderData = {
      appointmentId: appointment.id,
      accountId: appointment.accountId,
      patientId: appointment.patientId,
      ownerId: appointment.ownerId,
      patientName,
      ownerPhone,
      ownerName: ownerName ?? 'Tutor',
      scheduledAt: appointment.scheduledAt,
      visitType: this.#formatVisitType(appointment.visitType),
      clinicName
    };

    const result = await this.#whatsAppProvider.sendAppointmentReminder(reminderData);
    return {
      processed: true,
      sent: result.sent,
      error: result.error
    };
  }

  #formatVisitType(visitType: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Consulta agendada',
      return: 'Retorno',
      emergency: 'Emergência',
      follow_up: 'Acompanhamento',
      check_up: 'Check-up',
      procedure: 'Procedimento'
    };
    return labels[visitType] ?? visitType;
  }
}

export class InMemorySettingsLookup implements SettingsLookup {
  #clinicNames = new Map<AccountId, string>();

  setClinicName(accountId: AccountId, name: string): void {
    this.#clinicNames.set(accountId, name);
  }

  getClinicName(accountId: AccountId): string | null {
    return this.#clinicNames.get(accountId) ?? null;
  }
}
