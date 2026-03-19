import type { AppointmentRecord, AppointmentStatus, AppointmentType } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreateAppointmentInput = {
  accountId: string;
  patientId: string;
  ownerId: string;
  professionalUserId: string;
  startAt: Date;
  endAt: Date;
  status?: AppointmentStatus;
  type?: AppointmentType;
  notes?: string | null;
};

type UpdateAppointmentInput = {
  professionalUserId?: string;
  startAt?: Date;
  endAt?: Date;
  status?: AppointmentStatus;
  type?: AppointmentType;
  notes?: string | null;
};

type ListAppointmentsInput = {
  accountId: string;
  page: number;
  pageSize: number;
  q?: string;
  professionalUserId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  dateFrom?: Date;
  dateTo?: Date;
};

function mapAppointmentRow(row: Record<string, unknown>): AppointmentRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    patientId: String(row.patient_id),
    ownerId: String(row.owner_id),
    professionalUserId: String(row.professional_user_id),
    startAt: new Date(String(row.start_at)),
    endAt: new Date(String(row.end_at)),
    status: String(row.status) as AppointmentStatus,
    type: String(row.type) as AppointmentType,
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export function createAppointmentsRepo(db: DbClient) {
  return {
    async create(input: CreateAppointmentInput): Promise<AppointmentRecord> {
      const queryResult = await db.$client.query(
        `
          insert into appointments (
            account_id,
            patient_id,
            owner_id,
            professional_user_id,
            start_at,
            end_at,
            status,
            type,
            notes
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          returning *
        `,
        [
          input.accountId,
          input.patientId,
          input.ownerId,
          input.professionalUserId,
          input.startAt,
          input.endAt,
          input.status ?? 'scheduled',
          input.type ?? 'consultation',
          input.notes ?? null
        ]
      );

      return mapAppointmentRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, id: string): Promise<AppointmentRecord | null> {
      const queryResult = await db.$client.query(
        'select * from appointments where id = $1 and account_id = $2 limit 1',
        [id, accountId]
      );
      if (queryResult.rows.length === 0) {
        return null;
      }
      return mapAppointmentRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(
      accountId: string,
      id: string,
      patch: UpdateAppointmentInput
    ): Promise<AppointmentRecord | null> {
      const fields: string[] = [];
      const values: Array<string | Date | null> = [];
      let index = 1;

      if (patch.professionalUserId !== undefined) {
        fields.push(`professional_user_id = $${index++}`);
        values.push(patch.professionalUserId);
      }
      if (patch.startAt !== undefined) {
        fields.push(`start_at = $${index++}`);
        values.push(patch.startAt);
      }
      if (patch.endAt !== undefined) {
        fields.push(`end_at = $${index++}`);
        values.push(patch.endAt);
      }
      if (patch.status !== undefined) {
        fields.push(`status = $${index++}`);
        values.push(patch.status);
      }
      if (patch.type !== undefined) {
        fields.push(`type = $${index++}`);
        values.push(patch.type);
      }
      if (patch.notes !== undefined) {
        fields.push(`notes = $${index++}`);
        values.push(patch.notes ?? null);
      }

      if (fields.length === 0) {
        return this.findById(accountId, id);
      }

      fields.push('updated_at = now()');
      values.push(id, accountId);

      const queryResult = await db.$client.query(
        `
          update appointments
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapAppointmentRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListAppointmentsInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | Date | number> = [input.accountId];
      let index = 2;

      if (input.professionalUserId) {
        whereParts.push(`professional_user_id = $${index}`);
        values.push(input.professionalUserId);
        index += 1;
      }

      if (input.patientId) {
        whereParts.push(`patient_id = $${index}`);
        values.push(input.patientId);
        index += 1;
      }

      if (input.status) {
        whereParts.push(`status = $${index}`);
        values.push(input.status);
        index += 1;
      }

      if (input.type) {
        whereParts.push(`type = $${index}`);
        values.push(input.type);
        index += 1;
      }

      if (input.dateFrom) {
        whereParts.push(`start_at >= $${index}`);
        values.push(input.dateFrom);
        index += 1;
      }

      if (input.dateTo) {
        whereParts.push(`start_at <= $${index}`);
        values.push(input.dateTo);
        index += 1;
      }

      if (input.q) {
        whereParts.push(
          `(notes ilike $${index} or id::text in (select id::text from patients where account_id = $1 and name ilike $${index}))`
        );
        values.push(`%${input.q}%`);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from appointments
            where ${whereClause}
            order by start_at asc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from appointments where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapAppointmentRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    },

    async cancel(accountId: string, id: string): Promise<AppointmentRecord | null> {
      return this.updateById(accountId, id, { status: 'cancelled' });
    }
  };
}
