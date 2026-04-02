import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  SchedulingAppointmentSummary
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
    const pool = getPool();
    await pool.query(
      `INSERT INTO appointments (id, account_id, owner_id, patient_id, scheduled_at, duration, visit_type, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [appointment.id, appointment.accountId, appointment.ownerId, appointment.patientId,
       new Date(appointment.scheduledAt), null, appointment.visitType, appointment.reason ?? null,
       appointment.status, new Date(appointment.createdAt), new Date(appointment.updatedAt)]
    );
  }

  async updateAppointment(appointment: SchedulingAppointmentSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE appointments SET status = $2, updated_at = $3 WHERE id = $1`,
      [appointment.id, appointment.status, new Date(appointment.updatedAt)]
    );
  }

  async findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapAppointment(result.rows[0]);
  }

  async findAllAppointments(accountId?: AccountId): Promise<readonly SchedulingAppointmentSummary[]> {
    const pool = getPool();
    const result = accountId
      ? await pool.query('SELECT * FROM appointments WHERE account_id = $1 ORDER BY scheduled_at ASC', [
          accountId
        ])
      : await pool.query('SELECT * FROM appointments ORDER BY scheduled_at ASC');
    return result.rows.map((r: Record<string, unknown>) => this.mapAppointment(r));
  }

  async createQueueEntry(entry: QueueEntrySummary): Promise<void> {
    const pool = getPool();
    await pool.query(
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
  }

  async updateQueueEntry(entry: QueueEntrySummary): Promise<void> {
    const pool = getPool();
    await pool.query(
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
  }

  async findQueueEntryById(id: QueueEntryId): Promise<QueueEntrySummary | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM scheduling_queue_entries WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapQueueEntry(result.rows[0]);
  }

  async findAllQueueEntries(accountId?: AccountId): Promise<readonly QueueEntrySummary[]> {
    const pool = getPool();
    const result = accountId
      ? await pool.query(
          'SELECT * FROM scheduling_queue_entries WHERE account_id = $1 ORDER BY checked_in_at ASC',
          [accountId]
        )
      : await pool.query('SELECT * FROM scheduling_queue_entries ORDER BY checked_in_at ASC');
    return result.rows.map((r: Record<string, unknown>) => this.mapQueueEntry(r));
  }

  private mapAppointment(row: Record<string, unknown>): SchedulingAppointmentSummary {
    return {
      id: row.id as AppointmentId,
      accountId: row.account_id as AccountId,
      patientId: row.patient_id as PatientId,
      ownerId: row.owner_id as OwnerId,
      scheduledAt: new Date(row.scheduled_at as string).toISOString(),
      visitType: row.visit_type as SchedulingAppointmentSummary['visitType'],
      reason: (row.reason as string) ?? undefined,
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
