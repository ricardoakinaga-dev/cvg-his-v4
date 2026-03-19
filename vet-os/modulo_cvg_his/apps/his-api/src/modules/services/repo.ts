import type { ServiceRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreateServiceInput = {
  accountId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  basePrice: number;
  active?: boolean;
};

type UpdateServiceInput = Partial<Omit<CreateServiceInput, 'accountId'>>;

type ListServicesInput = {
  accountId: string;
  page: number;
  pageSize: number;
  q?: string;
  active?: boolean;
};

function mapServiceRow(row: Record<string, unknown>): ServiceRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    name: String(row.name),
    code: row.code ? String(row.code) : null,
    description: row.description ? String(row.description) : null,
    basePrice: Number(row.base_price ?? 0),
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export function createServicesRepo(db: DbClient) {
  return {
    async create(input: CreateServiceInput): Promise<ServiceRecord> {
      const queryResult = await db.$client.query(
        `
          insert into services (
            account_id,
            name,
            code,
            description,
            base_price,
            active
          ) values ($1, $2, $3, $4, $5, $6)
          returning *
        `,
        [input.accountId, input.name, input.code ?? null, input.description ?? null, input.basePrice, input.active ?? true]
      );

      return mapServiceRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, id: string): Promise<ServiceRecord | null> {
      const queryResult = await db.$client.query('select * from services where id = $1 and account_id = $2 limit 1', [id, accountId]);
      if (queryResult.rows.length === 0) {
        return null;
      }
      return mapServiceRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findByCode(accountId: string, code: string): Promise<ServiceRecord | null> {
      const queryResult = await db.$client.query('select * from services where account_id = $1 and code = $2 limit 1', [accountId, code]);
      if (queryResult.rows.length === 0) {
        return null;
      }
      return mapServiceRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(accountId: string, id: string, patch: UpdateServiceInput): Promise<ServiceRecord | null> {
      const fields: string[] = [];
      const values: Array<string | number | boolean | null> = [];
      let index = 1;

      if (patch.name !== undefined) {
        fields.push(`name = $${index++}`);
        values.push(patch.name);
      }
      if (patch.code !== undefined) {
        fields.push(`code = $${index++}`);
        values.push(patch.code ?? null);
      }
      if (patch.description !== undefined) {
        fields.push(`description = $${index++}`);
        values.push(patch.description ?? null);
      }
      if (patch.basePrice !== undefined) {
        fields.push(`base_price = $${index++}`);
        values.push(patch.basePrice);
      }
      if (patch.active !== undefined) {
        fields.push(`active = $${index++}`);
        values.push(patch.active);
      }

      if (fields.length === 0) {
        return this.findById(accountId, id);
      }

      fields.push('updated_at = now()');
      values.push(id, accountId);

      const queryResult = await db.$client.query(
        `
          update services
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapServiceRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListServicesInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number | boolean> = [input.accountId];
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
          `
            select *
            from services
            where ${whereClause}
            order by active desc, name asc, created_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from services where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapServiceRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
