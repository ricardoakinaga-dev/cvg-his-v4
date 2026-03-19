type DbClient = typeof import('@cvg-his/db').db;

export type BedRecord = {
  id: string;
  accountId: string;
  wardId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CreateBedInput = {
  accountId: string;
  wardId: string;
  name: string;
  code?: string;
  isActive?: boolean;
};

type UpdateBedInput = {
  wardId?: string;
  name?: string;
  code?: string | null;
  isActive?: boolean;
};

type ListBedsInput = {
  accountId: string;
  page: number;
  pageSize: number;
  wardId?: string;
  q?: string;
};

function mapBedRow(row: Record<string, unknown>): BedRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    wardId: String(row.ward_id),
    name: String(row.name),
    code: row.code ? String(row.code) : null,
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export function createBedsRepo(db: DbClient) {
  return {
    async wardExistsInAccount(accountId: string, wardId: string): Promise<boolean> {
      const queryResult = await db.$client.query(
        'select 1 from wards where id = $1 and account_id = $2 limit 1',
        [wardId, accountId]
      );

      return queryResult.rows.length > 0;
    },

    async create(input: CreateBedInput): Promise<BedRecord> {
      const queryResult = await db.$client.query(
        `
          insert into beds (
            account_id,
            ward_id,
            name,
            code,
            is_active
          ) values ($1, $2, $3, $4, $5)
          returning *
        `,
        [input.accountId, input.wardId, input.name, input.code ?? null, input.isActive ?? true]
      );

      return mapBedRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, bedId: string): Promise<BedRecord | null> {
      const queryResult = await db.$client.query(
        'select * from beds where id = $1 and account_id = $2 limit 1',
        [bedId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapBedRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(accountId: string, bedId: string, patch: UpdateBedInput): Promise<BedRecord | null> {
      const fields: string[] = [];
      const values: Array<string | boolean | null> = [];
      let index = 1;

      if (patch.wardId !== undefined) {
        fields.push(`ward_id = $${index++}`);
        values.push(patch.wardId);
      }

      if (patch.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(patch.name);
      }

      if (patch.code !== undefined) {
        fields.push(`code = $${index++}`);
        values.push(patch.code ?? null);
      }

      if (patch.isActive !== undefined) {
        fields.push(`is_active = $${index++}`);
        values.push(patch.isActive);
      }

      if (fields.length === 0) {
        return this.findById(accountId, bedId);
      }

      fields.push('updated_at = now()');
      values.push(bedId, accountId);

      const queryResult = await db.$client.query(
        `
          update beds
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapBedRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListBedsInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.wardId) {
        whereParts.push(`ward_id = $${index}`);
        values.push(input.wardId);
        index += 1;
      }

      if (input.q) {
        whereParts.push(`(name ilike $${index} or code ilike $${index})`);
        values.push(`%${input.q}%`);
        index += 1;
      }

      const offset = (input.page - 1) * input.pageSize;
      const whereClause = whereParts.join(' and ');

      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(
          `
            select *
            from beds
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from beds where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapBedRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
