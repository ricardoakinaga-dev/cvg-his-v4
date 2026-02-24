function asRecordOrNull(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }
    return value;
}
function mapRefType(value) {
    const raw = String(value);
    if (raw === 'url') {
        return 'url';
    }
    if (raw === 'pdf') {
        return 'pdf';
    }
    if (raw === 'doi') {
        return 'doi';
    }
    if (raw === 'book') {
        return 'book';
    }
    return 'qdrant_chunk';
}
function mapScore(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function mapReferenceRow(row) {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        protocolId: String(row.protocol_id),
        refType: mapRefType(row.ref_type),
        title: row.title ? String(row.title) : null,
        url: row.url ? String(row.url) : null,
        sourceId: row.source_id ? String(row.source_id) : null,
        score: mapScore(row.score),
        metadataJson: asRecordOrNull(row.metadata_json),
        createdByUserId: String(row.created_by_user_id),
        createdAt: new Date(String(row.created_at))
    };
}
export function createProtocolReferencesRepo(db) {
    return {
        async protocolExistsInAccount(accountId, protocolId) {
            const result = await db.$client.query(`
          select 1
          from protocols
          where id = $1
            and account_id = $2
          limit 1
        `, [protocolId, accountId]);
            return result.rows.length > 0;
        },
        async listByProtocol(accountId, protocolId) {
            const result = await db.$client.query(`
          select *
          from protocol_references
          where account_id = $1
            and protocol_id = $2
          order by created_at desc
        `, [accountId, protocolId]);
            return result.rows.map((row) => mapReferenceRow(row));
        },
        async create(input) {
            const result = await db.$client.query(`
          insert into protocol_references (
            account_id,
            protocol_id,
            ref_type,
            title,
            url,
            source_id,
            score,
            metadata_json,
            created_by_user_id
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
          returning *
        `, [
                input.accountId,
                input.protocolId,
                input.refType,
                input.title ?? null,
                input.url ?? null,
                input.sourceId ?? null,
                input.score ?? null,
                input.metadataJson ?? null,
                input.createdByUserId
            ]);
            return mapReferenceRow(result.rows[0]);
        },
        async findById(accountId, protocolId, refId) {
            const result = await db.$client.query(`
          select *
          from protocol_references
          where id = $1
            and account_id = $2
            and protocol_id = $3
          limit 1
        `, [refId, accountId, protocolId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapReferenceRow(result.rows[0]);
        },
        async deleteById(accountId, protocolId, refId) {
            const result = await db.$client.query(`
          delete from protocol_references
          where id = $1
            and account_id = $2
            and protocol_id = $3
          returning *
        `, [refId, accountId, protocolId]);
            if (result.rows.length === 0) {
                return null;
            }
            return mapReferenceRow(result.rows[0]);
        }
    };
}
//# sourceMappingURL=repo.js.map