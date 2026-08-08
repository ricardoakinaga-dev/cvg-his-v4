import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import type {
  AgendaConfigRepository,
  AppointmentTypeConfigRecord,
  ProfessionalAvailabilityRecord
} from './agenda-config-repository.js';

function normalizeTime(value: unknown): string {
  return String(value ?? '').slice(0, 5);
}

function mapAvailability(row: Record<string, unknown>): ProfessionalAvailabilityRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    professionalUserId: String(row.professional_user_id),
    dayOfWeek: Number(row.day_of_week),
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    slotDurationMinutes: Number(row.slot_duration_minutes),
    timezone: String(row.timezone ?? 'America/Sao_Paulo'),
    effectiveFrom: row.effective_from ? String(row.effective_from).slice(0, 10) : null,
    effectiveUntil: row.effective_until ? String(row.effective_until).slice(0, 10) : null,
    notes: row.notes === null || row.notes === undefined ? null : String(row.notes)
  };
}

function mapAppointmentType(row: Record<string, unknown>): AppointmentTypeConfigRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    code: String(row.code),
    name: String(row.name),
    description:
      row.description === null || row.description === undefined ? null : String(row.description),
    defaultDurationMinutes: Number(row.default_duration_minutes),
    color: row.color === null || row.color === undefined ? null : String(row.color),
    active: Boolean(row.active)
  };
}

export class DatabaseAgendaConfigRepository implements AgendaConfigRepository {
  async listAvailability(
    accountId: string,
    professionalUserId?: string
  ): Promise<readonly ProfessionalAvailabilityRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = professionalUserId
        ? await client.query(
            `SELECT * FROM professional_availability
             WHERE account_id = $1
               AND professional_user_id = $2
               AND account_id = app.current_account_id()
             ORDER BY day_of_week, start_time`,
            [accountId, professionalUserId]
          )
        : await client.query(
            `SELECT * FROM professional_availability
             WHERE account_id = $1
               AND account_id = app.current_account_id()
             ORDER BY day_of_week, start_time`,
            [accountId]
          );
      return result.rows.map((row: Record<string, unknown>) => mapAvailability(row));
    });
  }

  async createAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO professional_availability
           (id, account_id, professional_user_id, day_of_week, start_time, end_time,
            slot_duration_minutes, notes, timezone, effective_from, effective_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          record.id,
          record.accountId,
          record.professionalUserId,
          record.dayOfWeek,
          record.startTime,
          record.endTime,
          record.slotDurationMinutes,
          record.notes,
          record.timezone ?? 'America/Sao_Paulo',
          record.effectiveFrom ?? null,
          record.effectiveUntil ?? null
        ]
      );
      return mapAvailability(result.rows[0] as Record<string, unknown>);
    });
  }

  async findAvailabilityById(
    accountId: string,
    id: string
  ): Promise<ProfessionalAvailabilityRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM professional_availability
         WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()`,
        [id, accountId]
      );
      return result.rows[0]
        ? mapAvailability(result.rows[0] as Record<string, unknown>)
        : null;
    });
  }

  async updateAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE professional_availability
            SET start_time = $3,
                end_time = $4,
                slot_duration_minutes = $5,
                notes = $6,
                timezone = $7,
                effective_from = $8,
                effective_until = $9
          WHERE id = $1
            AND account_id = $2
            AND account_id = app.current_account_id()
         RETURNING *`,
        [
          record.id,
          record.accountId,
          record.startTime,
          record.endTime,
          record.slotDurationMinutes,
          record.notes,
          record.timezone ?? 'America/Sao_Paulo',
          record.effectiveFrom ?? null,
          record.effectiveUntil ?? null
        ]
      );
      if (!result.rows[0]) throw new Error('Availability not found');
      return mapAvailability(result.rows[0] as Record<string, unknown>);
    });
  }

  async deleteAvailability(accountId: string, id: string): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `DELETE FROM professional_availability
          WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()`,
        [id, accountId]
      );
      return result.rowCount === 1;
    });
  }

  async listAppointmentTypes(
    accountId: string,
    filters: { query?: string; active?: boolean } = {}
  ): Promise<readonly AppointmentTypeConfigRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const params: unknown[] = [accountId];
      const where = ['account_id = $1', 'account_id = app.current_account_id()'];
      if (filters.query) {
        params.push(`%${filters.query}%`);
        where.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length} OR description ILIKE $${params.length})`);
      }
      if (filters.active !== undefined) {
        params.push(filters.active);
        where.push(`active = $${params.length}`);
      }
      const result = await client.query(
        `SELECT * FROM appointment_type_configs
          WHERE ${where.join(' AND ')}
          ORDER BY name`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapAppointmentType(row));
    });
  }

  async createAppointmentType(
    record: AppointmentTypeConfigRecord
  ): Promise<AppointmentTypeConfigRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO appointment_type_configs
           (id, account_id, code, name, description, default_duration_minutes, color, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          record.id,
          record.accountId,
          record.code,
          record.name,
          record.description,
          record.defaultDurationMinutes,
          record.color,
          record.active
        ]
      );
      return mapAppointmentType(result.rows[0] as Record<string, unknown>);
    });
  }

  async findAppointmentTypeById(
    accountId: string,
    id: string
  ): Promise<AppointmentTypeConfigRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM appointment_type_configs
         WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()`,
        [id, accountId]
      );
      return result.rows[0]
        ? mapAppointmentType(result.rows[0] as Record<string, unknown>)
        : null;
    });
  }

  async updateAppointmentType(
    record: AppointmentTypeConfigRecord
  ): Promise<AppointmentTypeConfigRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE appointment_type_configs
            SET name = $3,
                description = $4,
                default_duration_minutes = $5,
                color = $6,
                active = $7
          WHERE id = $1
            AND account_id = $2
            AND account_id = app.current_account_id()
         RETURNING *`,
        [
          record.id,
          record.accountId,
          record.name,
          record.description,
          record.defaultDurationMinutes,
          record.color,
          record.active
        ]
      );
      if (!result.rows[0]) throw new Error('Appointment type not found');
      return mapAppointmentType(result.rows[0] as Record<string, unknown>);
    });
  }

  async deleteAppointmentType(accountId: string, id: string): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `DELETE FROM appointment_type_configs
          WHERE id = $1 AND account_id = $2 AND account_id = app.current_account_id()`,
        [id, accountId]
      );
      return result.rowCount === 1;
    });
  }
}
