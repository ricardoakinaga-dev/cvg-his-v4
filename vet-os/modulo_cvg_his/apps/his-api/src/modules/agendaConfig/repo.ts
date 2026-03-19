import type { AvailabilityRecord, TypeConfigRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

// =====================
// Professional Availability
// =====================

type CreateAvailabilityInput = {
  accountId: string;
  professionalUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  notes?: string | null;
};

type UpdateAvailabilityInput = {
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
  notes?: string | null;
};

function mapAvailabilityRow(row: Record<string, unknown>): AvailabilityRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    professionalUserId: String(row.professional_user_id),
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    slotDurationMinutes: Number(row.slot_duration_minutes),
    notes: row.notes ? String(row.notes) : null
  };
}

export function createAvailabilityRepo(db: DbClient) {
  return {
    async create(input: CreateAvailabilityInput): Promise<AvailabilityRecord> {
      const queryResult = await db.$client.query(
        `
          insert into professional_availability (
            account_id, professional_user_id, day_of_week,
            start_time, end_time, slot_duration_minutes, notes
          ) values ($1, $2, $3, $4, $5, $6, $7)
          returning *
        `,
        [
          input.accountId,
          input.professionalUserId,
          input.dayOfWeek,
          input.startTime,
          input.endTime,
          input.slotDurationMinutes ?? 30,
          input.notes ?? null
        ]
      );
      return mapAvailabilityRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, id: string): Promise<AvailabilityRecord | null> {
      const queryResult = await db.$client.query(
        'select * from professional_availability where id = $1 and account_id = $2 limit 1',
        [id, accountId]
      );
      if (queryResult.rows.length === 0) return null;
      return mapAvailabilityRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(accountId: string, professionalUserId?: string) {
      const whereParts = ['account_id = $1'];
      const values: string[] = [accountId];
      let index = 2;

      if (professionalUserId) {
        whereParts.push(`professional_user_id = $${index}`);
        values.push(professionalUserId);
        index += 1;
      }

      const whereClause = whereParts.join(' and ');
      const queryResult = await db.$client.query(
        `select * from professional_availability where ${whereClause} order by professional_user_id, day_of_week`,
        values
      );

      return {
        data: queryResult.rows.map((row) => mapAvailabilityRow(row as Record<string, unknown>)),
        total: queryResult.rows.length
      };
    },

    async updateById(
      accountId: string,
      id: string,
      patch: UpdateAvailabilityInput
    ): Promise<AvailabilityRecord | null> {
      const fields: string[] = [];
      const values: (string | number | null)[] = [];
      let index = 1;

      if (patch.startTime !== undefined) {
        fields.push(`start_time = $${index++}`);
        values.push(patch.startTime);
      }
      if (patch.endTime !== undefined) {
        fields.push(`end_time = $${index++}`);
        values.push(patch.endTime);
      }
      if (patch.slotDurationMinutes !== undefined) {
        fields.push(`slot_duration_minutes = $${index++}`);
        values.push(patch.slotDurationMinutes);
      }
      if (patch.notes !== undefined) {
        fields.push(`notes = $${index++}`);
        values.push(patch.notes ?? null);
      }

      if (fields.length === 0) return this.findById(accountId, id);

      values.push(id, accountId);
      const queryResult = await db.$client.query(
        `update professional_availability set ${fields.join(', ')} where id = $${index++} and account_id = $${index} returning *`,
        values
      );

      if (queryResult.rows.length === 0) return null;
      return mapAvailabilityRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async deleteById(accountId: string, id: string): Promise<boolean> {
      const queryResult = await db.$client.query(
        'delete from professional_availability where id = $1 and account_id = $2',
        [id, accountId]
      );
      return (queryResult.rowCount ?? 0) > 0;
    }
  };
}

// =====================
// Appointment Type Configs
// =====================

type CreateTypeConfigInput = {
  accountId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultDurationMinutes?: number;
  color?: string | null;
  active?: boolean;
};

type UpdateTypeConfigInput = {
  name?: string;
  description?: string | null;
  defaultDurationMinutes?: number;
  color?: string | null;
  active?: boolean;
};

function mapTypeConfigRow(row: Record<string, unknown>): TypeConfigRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    code: String(row.code),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    defaultDurationMinutes: Number(row.default_duration_minutes),
    color: row.color ? String(row.color) : null,
    active: Boolean(row.active)
  };
}

type ListTypeConfigsInput = {
  accountId: string;
  page: number;
  pageSize: number;
  q?: string;
  active?: boolean;
};

export function createTypeConfigRepo(db: DbClient) {
  return {
    async create(input: CreateTypeConfigInput): Promise<TypeConfigRecord> {
      const queryResult = await db.$client.query(
        `
          insert into appointment_type_configs (
            account_id, code, name, description, default_duration_minutes, color, active
          ) values ($1, $2, $3, $4, $5, $6, $7)
          returning *
        `,
        [
          input.accountId,
          input.code,
          input.name,
          input.description ?? null,
          input.defaultDurationMinutes ?? 30,
          input.color ?? null,
          input.active ?? true
        ]
      );
      return mapTypeConfigRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, id: string): Promise<TypeConfigRecord | null> {
      const queryResult = await db.$client.query(
        'select * from appointment_type_configs where id = $1 and account_id = $2 limit 1',
        [id, accountId]
      );
      if (queryResult.rows.length === 0) return null;
      return mapTypeConfigRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findByCode(accountId: string, code: string): Promise<TypeConfigRecord | null> {
      const queryResult = await db.$client.query(
        'select * from appointment_type_configs where account_id = $1 and code = $2 limit 1',
        [accountId, code]
      );
      if (queryResult.rows.length === 0) return null;
      return mapTypeConfigRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListTypeConfigsInput) {
      const whereParts = ['account_id = $1'];
      const values: (string | number | boolean)[] = [input.accountId];
      let index = 2;

      if (input.q) {
        whereParts.push(`(name ilike $${index} or code ilike $${index} or description ilike $${index})`);
        values.push(`%${input.q}%`);
        index += 1;
      }

      if (input.active !== undefined) {
        whereParts.push(`active = $${index}`);
        values.push(input.active);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `select * from appointment_type_configs where ${whereClause} order by active desc, name asc limit $${index} offset $${index + 1}`,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from appointment_type_configs where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapTypeConfigRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    },

    async updateById(
      accountId: string,
      id: string,
      patch: UpdateTypeConfigInput
    ): Promise<TypeConfigRecord | null> {
      const fields: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      let index = 1;

      if (patch.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(patch.name);
      }
      if (patch.description !== undefined) {
        fields.push(`description = $${index++}`);
        values.push(patch.description ?? null);
      }
      if (patch.defaultDurationMinutes !== undefined) {
        fields.push(`default_duration_minutes = $${index++}`);
        values.push(patch.defaultDurationMinutes);
      }
      if (patch.color !== undefined) {
        fields.push(`color = $${index++}`);
        values.push(patch.color ?? null);
      }
      if (patch.active !== undefined) {
        fields.push(`active = $${index++}`);
        values.push(patch.active);
      }

      if (fields.length === 0) return this.findById(accountId, id);

      values.push(id, accountId);
      const queryResult = await db.$client.query(
        `update appointment_type_configs set ${fields.join(', ')} where id = $${index++} and account_id = $${index} returning *`,
        values
      );

      if (queryResult.rows.length === 0) return null;
      return mapTypeConfigRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async deleteById(accountId: string, id: string): Promise<boolean> {
      const queryResult = await db.$client.query(
        'delete from appointment_type_configs where id = $1 and account_id = $2',
        [id, accountId]
      );
      return (queryResult.rowCount ?? 0) > 0;
    }
  };
}
