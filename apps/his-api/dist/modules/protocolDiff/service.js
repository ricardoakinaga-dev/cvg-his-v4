import { buildJsonDiff } from './diff.js';
function unauthorizedError(message) {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
}
function ensureAccountActor(requestContext) {
    const actor = requestContext.actor;
    if (!actor?.accountId) {
        throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
    }
    return actor;
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
        status: String(row.status),
        contentJson: asRecord(row.content_json)
    };
}
async function loadVersion(db, accountId, versionId) {
    const result = await db.$client.query(`
      select
        id,
        account_id,
        protocol_id,
        version_number,
        status,
        content_json
      from protocol_versions
      where id = $1
        and account_id = $2
      limit 1
    `, [versionId, accountId]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapVersionRow(result.rows[0]);
}
export function createProtocolDiffService(context) {
    return {
        async getVersionDiff(fromVersionId, toVersionId) {
            const actor = ensureAccountActor(context.requestContext);
            const fromVersion = await loadVersion(context.db, actor.accountId, fromVersionId);
            if (!fromVersion) {
                return { kind: 'from_not_found' };
            }
            const toVersion = await loadVersion(context.db, actor.accountId, toVersionId);
            if (!toVersion) {
                return { kind: 'to_not_found' };
            }
            if (fromVersion.protocolId !== toVersion.protocolId) {
                return { kind: 'different_protocols' };
            }
            return {
                kind: 'ok',
                diff: {
                    fromVersion: {
                        id: fromVersion.id,
                        protocolId: fromVersion.protocolId,
                        versionNumber: fromVersion.versionNumber,
                        status: fromVersion.status
                    },
                    toVersion: {
                        id: toVersion.id,
                        protocolId: toVersion.protocolId,
                        versionNumber: toVersion.versionNumber,
                        status: toVersion.status
                    },
                    changes: buildJsonDiff(fromVersion.contentJson, toVersion.contentJson)
                }
            };
        }
    };
}
//# sourceMappingURL=service.js.map