function mapVersionStatus(value) {
    const raw = String(value);
    if (raw === 'published') {
        return 'published';
    }
    if (raw === 'publishing') {
        return 'publishing';
    }
    if (raw === 'failed') {
        return 'failed';
    }
    return 'draft';
}
function asRecord(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {};
    }
    return value;
}
function mapProtocolVersionRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        protocolId: String(row.protocol_id),
        versionNumber: Number(row.version_number),
        status: mapVersionStatus(row.status),
        contentJson: asRecord(row.content_json),
        changeReason: row.change_reason ? String(row.change_reason) : null,
        publishedAt: row.published_at ? new Date(String(row.published_at)) : null,
        publishedByUserId: row.published_by_user_id ? String(row.published_by_user_id) : null,
        buildError: row.build_error ? String(row.build_error) : null,
        createdByUserId: String(row.created_by_user_id),
        updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at))
    };
}
export function createProtocolVersionsRepo(db) {
    return {
        async findProtocolInAccount(accountId, protocolId) {
            const result = await db.$client.query(`
          select id, title
          from protocols
          where id = $1 and account_id = $2
          limit 1
        `, [protocolId, accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: String(row.id),
                title: String(row.title)
            };
        },
        async createDraftVersion(input) {
            const result = await db.$client.query(`
          with protocol_row as (
            select p.id, p.account_id, p.title
            from protocols p
            where p.id = $1
              and p.account_id = $2
            for update
          ),
          latest_version as (
            select pv.content_json
            from protocol_versions pv
            join protocol_row pr
              on pr.id = pv.protocol_id
             and pr.account_id = pv.account_id
            order by pv.version_number desc
            limit 1
          ),
          next_version as (
            select coalesce(max(pv.version_number), 0) + 1 as version_number
            from protocol_versions pv
            join protocol_row pr
              on pr.id = pv.protocol_id
             and pr.account_id = pv.account_id
          )
          insert into protocol_versions (
            account_id,
            protocol_id,
            version_number,
            status,
            content_json,
            change_reason,
            created_by_user_id,
            updated_by_user_id
          )
          select
            pr.account_id,
            pr.id,
            nv.version_number,
            'draft',
            coalesce(
              lv.content_json,
              jsonb_build_object(
                'protocolId', pr.id::text,
                'title', pr.title,
                'severityLevels', '[]'::jsonb
              )
            ),
            null,
            $3,
            null
          from protocol_row pr
          cross join next_version nv
          left join latest_version lv on true
          returning *
        `, [input.protocolId, input.accountId, input.createdByUserId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapProtocolVersionRow(result.rows[0]);
        },
        async listByProtocol(input) {
            const offset = (input.page - 1) * input.pageSize;
            const [rowsResult, totalResult] = await Promise.all([
                db.$client.query(`
            select *
            from protocol_versions
            where account_id = $1
              and protocol_id = $2
            order by version_number desc
            limit $3 offset $4
          `, [input.accountId, input.protocolId, input.pageSize, offset]),
                db.$client.query(`
            select count(*)::int as total
            from protocol_versions
            where account_id = $1
              and protocol_id = $2
          `, [input.accountId, input.protocolId])
            ]);
            return {
                data: rowsResult.rows.map((row) => mapProtocolVersionRow(row)),
                page: input.page,
                pageSize: input.pageSize,
                total: Number(totalResult.rows[0]?.total ?? 0)
            };
        },
        async findById(accountId, versionId) {
            const result = await db.$client.query(`
          select *
          from protocol_versions
          where id = $1
            and account_id = $2
          limit 1
        `, [versionId, accountId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapProtocolVersionRow(result.rows[0]);
        },
        async updateDraftById(input) {
            const result = await db.$client.query(`
          update protocol_versions
          set
            content_json = $3,
            change_reason = $4,
            updated_by_user_id = $5,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'draft'
          returning *
        `, [
                input.versionId,
                input.accountId,
                input.contentJson,
                input.changeReason ?? null,
                input.updatedByUserId
            ]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapProtocolVersionRow(result.rows[0]);
        }
    };
}
//# sourceMappingURL=repo.js.map