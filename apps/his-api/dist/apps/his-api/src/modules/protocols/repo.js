function mapStatus(value) {
    return String(value) === 'published' ? 'published' : 'draft';
}
function mapProtocolRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        title: String(row.title),
        slug: String(row.slug),
        domain: row.domain ? String(row.domain) : null,
        specialty: row.specialty ? String(row.specialty) : null,
        status: mapStatus(row.status),
        currentPublishedVersionId: row.current_published_version_id
            ? String(row.current_published_version_id)
            : null,
        createdByUserId: String(row.created_by_user_id),
        updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
    };
}
export function createProtocolsRepo(db) {
    return {
        async create(input) {
            const queryResult = await db.$client.query(`
          insert into protocols (
            account_id,
            title,
            slug,
            domain,
            specialty,
            status,
            created_by_user_id
          ) values (
            $1, $2, $3, $4, $5, 'draft', $6
          )
          returning *
        `, [
                input.accountId,
                input.title,
                input.slug,
                input.domain ?? null,
                input.specialty ?? null,
                input.createdByUserId
            ]);
            return mapProtocolRow(queryResult.rows[0]);
        },
        async findById(accountId, protocolId) {
            const queryResult = await db.$client.query(`
          select *
          from protocols
          where id = $1 and account_id = $2
          limit 1
        `, [protocolId, accountId]);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapProtocolRow(queryResult.rows[0]);
        },
        async updateById(input) {
            const fields = [];
            const values = [];
            let index = 1;
            if (input.patch.title !== undefined) {
                fields.push(`title = $${index++}`);
                values.push(input.patch.title);
            }
            if (input.patch.domain !== undefined) {
                fields.push(`domain = $${index++}`);
                values.push(input.patch.domain ?? null);
            }
            if (input.patch.specialty !== undefined) {
                fields.push(`specialty = $${index++}`);
                values.push(input.patch.specialty ?? null);
            }
            if (input.patch.status !== undefined) {
                fields.push(`status = $${index++}`);
                values.push(input.patch.status);
            }
            if (fields.length === 0) {
                return this.findById(input.accountId, input.protocolId);
            }
            fields.push(`updated_by_user_id = $${index++}`);
            values.push(input.updatedByUserId);
            fields.push('updated_at = now()');
            values.push(input.protocolId, input.accountId);
            const queryResult = await db.$client.query(`
          update protocols
          set ${fields.join(', ')}
          where id = $${index++}
            and account_id = $${index}
          returning *
        `, values);
            if (queryResult.rows.length === 0) {
                return null;
            }
            return mapProtocolRow(queryResult.rows[0]);
        },
        async list(input) {
            const whereParts = ['account_id = $1'];
            const values = [input.accountId];
            let index = 2;
            if (input.q) {
                whereParts.push(`(title ilike $${index} or slug ilike $${index})`);
                values.push(`%${input.q}%`);
                index += 1;
            }
            if (input.status) {
                whereParts.push(`status = $${index}`);
                values.push(input.status);
                index += 1;
            }
            if (input.specialty) {
                whereParts.push(`specialty = $${index}`);
                values.push(input.specialty);
                index += 1;
            }
            if (input.domain) {
                whereParts.push(`domain = $${index}`);
                values.push(input.domain);
                index += 1;
            }
            const whereClause = whereParts.join(' and ');
            const offset = (input.page - 1) * input.pageSize;
            const [rowsResult, totalResult] = await Promise.all([
                db.$client.query(`
            select *
            from protocols
            where ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `, [...values, input.pageSize, offset]),
                db.$client.query(`
            select count(*)::int as total
            from protocols
            where ${whereClause}
          `, values)
            ]);
            return {
                data: rowsResult.rows.map((row) => mapProtocolRow(row)),
                page: input.page,
                pageSize: input.pageSize,
                total: Number(totalResult.rows[0]?.total ?? 0)
            };
        }
    };
}
//# sourceMappingURL=repo.js.map