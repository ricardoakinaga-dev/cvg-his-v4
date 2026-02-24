import { can } from '@cvg-his/rbac';
import { createOwnersRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access owner summary.');
    }
    return actor;
}
function mapAuditRow(row) {
    const createdAtValue = row.created_at;
    return {
        id: String(row.id),
        createdAt: createdAtValue instanceof Date
            ? createdAtValue.toISOString()
            : new Date(String(createdAtValue)).toISOString(),
        action: String(row.action),
        actorRole: row.actor_role ? String(row.actor_role) : null,
        reason: row.reason ? String(row.reason) : null,
        requestId: row.request_id ? String(row.request_id) : null
    };
}
export async function getOwnerSummary(db, requestContext, ownerId) {
    const actor = ensureActor(requestContext);
    const repo = createOwnersRepo(db);
    const owner = await repo.findById(actor.accountId, ownerId);
    if (!owner) {
        return null;
    }
    const canReadAudit = can(actor, 'audit.read');
    const auditTrail = canReadAudit
        ? (await db.$client.query(`
            select id, created_at, action, actor_role, reason, request_id
            from audit_events ae
            where ae.entity_type = 'owner'
              and ae.entity_id = $1
              and ae.account_id = $2
            order by created_at desc
            limit 10
          `, [ownerId, actor.accountId])).rows.map((row) => mapAuditRow(row))
        : [];
    return {
        owner: {
            id: owner.id,
            fullName: owner.fullName,
            document: owner.document,
            email: owner.email,
            phoneMain: owner.phoneMain,
            phoneAlt: owner.phoneAlt,
            updatedAt: owner.updatedAt.toISOString()
        },
        auditTrail,
        encounters: [],
        documents: []
    };
}
//# sourceMappingURL=summary.js.map