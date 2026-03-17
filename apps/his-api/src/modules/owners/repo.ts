import type { OwnerRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreateOwnerInput = {
  accountId: string;
  unitId?: string | null;
  fullName: string;
  document?: string | null;
  email?: string | null;
  phoneMain?: string | null;
  phoneAlt?: string | null;
  addressJson?: Record<string, unknown> | null;
};

type UpdateOwnerInput = Partial<Omit<CreateOwnerInput, 'accountId'>>;

type ListOwnersInput = {
  accountId: string;
  page: number;
  pageSize: number;
  q?: string;
};

function mapOwnerRow(row: Record<string, unknown>): OwnerRecord {
  const addressJsonRaw = row.address_json;

  return {
    id: String(row.id),
    accountId: String(row.account_id),
    unitId: row.unit_id ? String(row.unit_id) : null,
    fullName: String(row.full_name),
    document: row.document ? String(row.document) : null,
    email: row.email ? String(row.email) : null,
    phoneMain: row.phone_main ? String(row.phone_main) : null,
    phoneAlt: row.phone_alt ? String(row.phone_alt) : null,
    addressJson:
      typeof addressJsonRaw === 'object' && addressJsonRaw !== null
        ? (addressJsonRaw as Record<string, unknown>)
        : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

export function createOwnersRepo(db: DbClient) {
  return {
    async create(input: CreateOwnerInput): Promise<OwnerRecord> {
      const queryResult = await db.$client.query(
        `
          insert into owners (
            account_id,
            unit_id,
            full_name,
            document,
            email,
            phone_main,
            phone_alt,
            address_json
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning *
        `,
        [
          input.accountId,
          input.unitId ?? null,
          input.fullName,
          input.document ?? null,
          input.email ?? null,
          input.phoneMain ?? null,
          input.phoneAlt ?? null,
          input.addressJson ?? null
        ]
      );

      return mapOwnerRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, ownerId: string): Promise<OwnerRecord | null> {
      const queryResult = await db.$client.query(
        'select * from owners where id = $1 and account_id = $2 limit 1',
        [ownerId, accountId]
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapOwnerRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async updateById(
      accountId: string,
      ownerId: string,
      patch: UpdateOwnerInput
    ): Promise<OwnerRecord | null> {
      const fields: string[] = [];
      const values: Array<string | Record<string, unknown> | null> = [];
      let index = 1;

      if (patch.unitId !== undefined) {
        fields.push(`unit_id = $${index++}`);
        values.push(patch.unitId ?? null);
      }

      if (patch.fullName !== undefined) {
        fields.push(`full_name = $${index++}`);
        values.push(patch.fullName);
      }

      if (patch.document !== undefined) {
        fields.push(`document = $${index++}`);
        values.push(patch.document ?? null);
      }

      if (patch.email !== undefined) {
        fields.push(`email = $${index++}`);
        values.push(patch.email ?? null);
      }

      if (patch.phoneMain !== undefined) {
        fields.push(`phone_main = $${index++}`);
        values.push(patch.phoneMain ?? null);
      }

      if (patch.phoneAlt !== undefined) {
        fields.push(`phone_alt = $${index++}`);
        values.push(patch.phoneAlt ?? null);
      }

      if (patch.addressJson !== undefined) {
        fields.push(`address_json = $${index++}`);
        values.push(patch.addressJson ?? null);
      }

      if (fields.length === 0) {
        return this.findById(accountId, ownerId);
      }

      fields.push('updated_at = now()');
      values.push(ownerId, accountId);

      const queryResult = await db.$client.query(
        `
          update owners
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `,
        values
      );

      if (queryResult.rows.length === 0) {
        return null;
      }

      return mapOwnerRow(queryResult.rows[0] as Record<string, unknown>);
    },

    async list(input: ListOwnersInput) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;

      if (input.q) {
        whereParts.push(
          `(full_name ilike $${index} or document ilike $${index} or phone_main ilike $${index} or phone_alt ilike $${index})`
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
            from owners
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `,
          [...values, input.pageSize, offset]
        ),
        db.$client.query(`select count(*)::int as total from owners where ${whereClause}`, values)
      ]);

      return {
        data: rowsResult.rows.map((row) => mapOwnerRow(row as Record<string, unknown>)),
        page: input.page,
        pageSize: input.pageSize,
        total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0)
      };
    }
  };
}
