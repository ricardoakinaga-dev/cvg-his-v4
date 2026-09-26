import type { Pool } from 'pg';

import type {
  AppointmentReminderData,
  WhatsAppReminderSendResult
} from '@cvg-his-v2/module-notifications-whatsapp';
import { runInTenantTransaction } from '@cvg-his-v2/shared-database';
import type { AccountId, OwnerId, PatientId } from '@cvg-his-v2/shared-types';

import type { WorkflowTaskHandler } from '../workflow-task-runner.js';

export interface AppointmentReminderRow {
  readonly id: string;
  readonly start_at: Date | string;
  readonly status: string;
  readonly type: string | null;
  readonly patient_id: string;
  readonly owner_id: string;
  readonly patient_name: string | null;
  readonly owner_name: string | null;
  readonly owner_phone: string | null;
}

export interface AppointmentReminderHandlerDeps {
  readonly loadAppointment: (
    accountId: string,
    appointmentId: string
  ) => Promise<AppointmentReminderRow | null>;
  readonly send: (data: AppointmentReminderData) => Promise<WhatsAppReminderSendResult>;
  readonly clinicName: string;
  readonly now?: () => Date;
  readonly onSkipped?: (reason: string, appointmentId: string) => void;
}

const REMINDABLE_STATUSES = new Set(['scheduled', 'confirmed']);

const VISIT_LABELS: Readonly<Record<string, string>> = {
  consultation: 'Consulta',
  vaccination: 'Vacinação',
  surgery: 'Cirurgia',
  exam: 'Exame',
  return: 'Retorno',
  other: 'Atendimento'
};

/**
 * Worker side of R2-NOT-01. The appointment is re-read at delivery time, so a
 * cancelled, completed or past appointment (or a tutor whose contact data was
 * erased) completes the task without sending. A provider failure throws, which
 * lets the workflow runner apply its bounded retry and DLQ.
 */
export function createAppointmentReminderHandler(
  deps: AppointmentReminderHandlerDeps
): WorkflowTaskHandler {
  const now = deps.now ?? (() => new Date());
  return async (task, context) => {
    const appointmentId = task.metadata?.appointmentId;
    if (typeof appointmentId !== 'string' || appointmentId.length === 0) {
      throw new Error('Appointment reminder task has no appointmentId');
    }
    const row = await deps.loadAppointment(context.accountId, appointmentId);
    const skip = (reason: string) => deps.onSkipped?.(reason, appointmentId);
    if (!row) return skip('appointment_not_found');
    if (!REMINDABLE_STATUSES.has(row.status)) return skip(`appointment_${row.status}`);
    const scheduledAt = new Date(row.start_at);
    if (scheduledAt.getTime() <= now().getTime()) return skip('appointment_in_past');
    const phone = row.owner_phone?.trim();
    if (!phone) return skip('tutor_without_phone');

    const result = await deps.send({
      appointmentId: row.id,
      accountId: context.accountId as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      patientName: row.patient_name?.trim() || 'seu pet',
      ownerName: row.owner_name?.trim() || 'Tutor',
      ownerPhone: phone,
      scheduledAt: scheduledAt.toISOString(),
      visitType: VISIT_LABELS[row.type ?? ''] ?? 'Atendimento',
      clinicName: deps.clinicName
    });
    if (!result.sent) {
      throw new Error(`WhatsApp reminder not sent: ${(result.error ?? 'unknown').slice(0, 200)}`);
    }
  };
}

export function createAppointmentReminderLoader(pool: Pool) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return async (accountId: string, appointmentId: string): Promise<AppointmentReminderRow | null> => {
    if (!uuid.test(appointmentId)) return null;
    return runInTenantTransaction(pool, accountId, async (client) => {
      const result = await client.query<AppointmentReminderRow>(
        `SELECT a.id, a.start_at, a.status::text AS status, a.type::text AS type,
                a.patient_id, a.owner_id, p.name AS patient_name,
                o.full_name AS owner_name, o.phone_main AS owner_phone
           FROM appointments AS a
           JOIN patients AS p ON p.id = a.patient_id AND p.account_id = a.account_id
           JOIN owners AS o ON o.id = a.owner_id AND o.account_id = a.account_id
          WHERE a.id = $1 AND a.account_id = $2`,
        [appointmentId, accountId]
      );
      return result.rows[0] ?? null;
    });
  };
}
