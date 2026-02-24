function mapWardRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        name: String(row.name),
        code: row.code ? String(row.code) : null,
        isActive: Boolean(row.is_active),
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
    };
}
export function createWardsRepo(db) {
    return {
        async create(input) {
            const queryResult = await db.$client.query(`
          insert into wards (
            account_id,
            name,
            code,
            is_active
          ) values ($1, $2, $3, $4)
          returning *
        `, [input.accountId, input.name, input.code ?? null, input.isActive ?? true]);
            return mapWardRow(queryResult.rows[0]);
        },
        async findById(accountId, wardId) {
            const queryResult = await db.$client.query('select * from wards where id = $1 and account_id = $2 limit 1', [wardId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapWardRow(queryResult.rows[0]);
        },
        async updateById(accountId, wardId, patch) {
            const fields = [];
            const values = [];
            let index = 1;
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
                return this.findById(accountId, wardId);
            }
            fields.push('updated_at = now()');
            values.push(wardId, accountId);
            const queryResult = await db.$client.query(`
          update wards
          set ${fields.join(', ')}
          where id = $${index++} and account_id = $${index}
          returning *
        `, values);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapWardRow(queryResult.rows[0]);
        },
        async list(input) {
            const whereParts = ['account_id = $1'];
            const values = [input.accountId];
            let index = 2;
            if (input.q) {
                whereParts.push(`(name ilike $${index} or code ilike $${index})`);
                values.push(`%${input.q}%`);
                index += 1;
            }
            const offset = (input.page - 1) * input.pageSize;
            const whereClause = whereParts.join(' and ');
            const [rowsResult, totalResult] = await Promise.all([
                db.$client.query(`
            select *
            from wards
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `, [...values, input.pageSize, offset]),
                db.$client.query(`select count(*)::int as total from wards where ${whereClause}`, values)
            ]);
            return {
                data: rowsResult.rows.map((row) => mapWardRow(row)),
                page: input.page,
                pageSize: input.pageSize,
                total: Number(totalResult.rows[0]?.total ?? 0)
            };
        }
    };
}
//# sourceMappingURL=repo.js.map