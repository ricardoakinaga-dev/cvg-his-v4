import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  AppointmentId,
  OwnerId,
  PatientId,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';

export interface SchedulingRepository {
  createAppointment(appointment: SchedulingAppointmentSummary): Promise<void>;
  updateAppointment(appointment: SchedulingAppointmentSummary): Promise<void>;
  findAppointmentById(id: AppointmentId): Promise<SchedulingAppointmentSummary | null>;
  findAllAppointments(accountId: AccountId): Promise<readonly SchedulingAppointmentSummary[]>;
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

  async findAllAppointments(accountId: AccountId): Promise<readonly SchedulingAppointmentSummary[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM appointments WHERE account_id = $1 ORDER BY scheduled_at ASC',
      [accountId]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapAppointment(r));
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
}
