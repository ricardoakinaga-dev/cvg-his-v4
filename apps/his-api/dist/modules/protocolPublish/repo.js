function mapStatus(value) {
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
function mapVersionRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        protocolId: String(row.protocol_id),
        versionNumber: Number(row.version_number),
        status: mapStatus(row.status),
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
export function createProtocolPublishRepo(db) {
    return {
        async findVersionById(accountId, versionId) {
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
            return mapVersionRow(result.rows[0]);
        },
        async markPublishing(input) {
            const result = await db.$client.query(`
          update protocol_versions
          set
            status = 'publishing',
            build_error = null,
            updated_by_user_id = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status in ('draft', 'failed')
          returning *
        `, [input.versionId, input.accountId, input.updatedByUserId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapVersionRow(result.rows[0]);
        },
        async markFailed(input) {
            const result = await db.$client.query(`
          update protocol_versions
          set
            status = 'failed',
            build_error = $4,
            updated_by_user_id = $3,
            updated_at = now()
          where id = $1
            and account_id = $2
            and status = 'publishing'
          returning *
        `, [input.versionId, input.accountId, input.updatedByUserId, input.buildError]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapVersionRow(result.rows[0]);
        }
    };
}
//# sourceMappingURL=repo.js.map