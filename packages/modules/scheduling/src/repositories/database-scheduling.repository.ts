import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  SchedulingAppointmentSummary,
  StaffId
} from '@cvg-his-v2/shared-types';

export interface SchedulingRepository {
  createAppointment(appointment: SchedulingAppointmentSummary): Promise<void>;
  updateAppointment(appointment: SchedulingAppointmentSummary): Promise<void>;
  findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null>;
  findAllAppointments(accountId?: AccountId): Promise<readonly SchedulingAppointmentSummary[]>;
  createQueueEntry(entry: QueueEntrySummary): Promise<void>;
  updateQueueEntry(entry: QueueEntrySummary): Promise<void>;
  findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null>;
  findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]>;
}

export class DatabaseSchedulingRepository implements SchedulingRepository {
  async createAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO appointments
           (id, account_id, owner_id, patient_id, scheduled_at, duration, visit_type, reason, practitioner_staff_id, service_id, unit, specialty, resource_label, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          appointment.id,
          appointment.accountId,
          appointment.ownerId,
          appointment.patientId,
          new Date(appointment.scheduledAt),
          appointment.durationMinutes ?? null,
          appointment.visitType,
          appointment.reason ?? null,
          appointment.practitionerStaffId ?? null,
          appointment.serviceId ?? null,
          appointment.unit ?? null,
          appointment.specialty ?? null,
          appointment.resourceLabel ?? null,
          appointment.status,
          new Date(appointment.createdAt),
          new Date(appointment.updatedAt)
        ]
      );
    });
  }

  async updateAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `UPDATE appointments
            SET status = $2,
                reason = $3,
                scheduled_at = $4,
                duration = $5,
                visit_type = $6,
                practitioner_staff_id = $7,
                service_id = $8,
                unit = $9,
                specialty = $10,
                resource_label = $11,
                updated_at = $12
          WHERE id = $1`,
        [
          appointment.id,
          appointment.status,
          appointment.reason ?? null,
          new Date(appointment.scheduledAt),
          appointment.durationMinutes ?? null,
          appointment.visitType,
          appointment.practitionerStaffId ?? null,
          appointment.serviceId ?? null,
          appointment.unit ?? null,
          appointment.specialty ?? null,
          appointment.resourceLabel ?? null,
          new Date(appointment.updatedAt)
        ]
      );
    });
  }

  async findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM appointments WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapAppointment(result.rows[0]);
    });
  }

  async findAllAppointments(accountId?: AccountId): Promise<readonly SchedulingAppointmentSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query('SELECT * FROM appointments WHERE account_id = $1 ORDER BY scheduled_at ASC', [
            accountId
          ])
        : await client.query('SELECT * FROM appointments ORDER BY scheduled_at ASC');
      return result.rows.map((r: Record<string, unknown>) => this.mapAppointment(r));
    });
  }

  async createQueueEntry(entry: QueueEntrySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO scheduling_queue_entries
           (id, account_id, patient_id, owner_id, appointment_id, encounter_id, reason, priority, status, checked_in_at, called_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          entry.id,
          entry.accountId,
          entry.patientId,
          entry.ownerId,
          entry.appointmentId ?? null,
          entry.encounterId ?? null,
          entry.reason,
          entry.priority,
          entry.status,
          new Date(entry.checkedInAt),
          entry.calledAt ? new Date(entry.calledAt) : null,
          new Date(entry.createdAt),
          new Date(entry.updatedAt)
        ]
      );
    });
  }

  async updateQueueEntry(entry: QueueEntrySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `UPDATE scheduling_queue_entries
            SET appointment_id = $2,
                encounter_id = $3,
                reason = $4,
                priority = $5,
                status = $6,
                checked_in_at = $7,
                called_at = $8,
                updated_at = $9
          WHERE id = $1`,
        [
          entry.id,
          entry.appointmentId ?? null,
          entry.encounterId ?? null,
          entry.reason,
          entry.priority,
          entry.status,
          new Date(entry.checkedInAt),
          entry.calledAt ? new Date(entry.calledAt) : null,
          new Date(entry.updatedAt)
        ]
      );
    });
  }

  async findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM scheduling_queue_entries WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapQueueEntry(result.rows[0]);
    });
  }

  async findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(
            'SELECT * FROM scheduling_queue_entries WHERE account_id = $1 ORDER BY checked_in_at ASC',
            [accountId]
          )
        : await client.query('SELECT * FROM scheduling_queue_entries ORDER BY checked_in_at ASC');
      return result.rows.map((r: Record<string, unknown>) => this.mapQueueEntry(r));
    });
  }

  private mapAppointment(row: Record<string, unknown>): SchedulingAppointmentSummary {
    return {
      id: row.id as AppointmentId,
      accountId: row.account_id as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      scheduledAt: new Date(row.scheduled_at as string).toISOString(),
      durationMinutes: (row.duration as number | null) ?? undefined,
      visitType: row.visit_type as SchedulingAppointmentSummary['visitType'],
      reason: (row.reason as string) ?? undefined,
      practitionerStaffId: (row.practitioner_staff_id as StaffId | null) ?? undefined,
      serviceId: (row.service_id as string | null) ?? undefined,
      unit: (row.unit as string | null) ?? undefined,
      specialty: (row.specialty as string | null) ?? undefined,
      resourceLabel: (row.resource_label as string | null) ?? undefined,
      status: row.status as SchedulingAppointmentSummary['status'],
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapQueueEntry(row: Record<string, unknown>): QueueEntrySummary {
    return {
      id: row.id as QueueEntryId,
      accountId: row.account_id as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      appointmentId: (row.appointment_id as AppointmentId) ?? undefined,
      encounterId: (row.encounter_id as EncounterId) ?? undefined,
      reason: row.reason as string,
      priority: row.priority as QueueEntrySummary['priority'],
      status: row.status as QueueEntrySummary['status'],
      checkedInAt: new Date(row.checked_in_at as string).toISOString(),
      calledAt: row.called_at ? new Date(row.called_at as string).toISOString() : undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
