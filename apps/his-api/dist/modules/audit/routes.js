import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { auditFromRequest } from '../../hooks/auditHook.js';
const listAuditQuerySchema = z.object({
    entity_type: z.string().trim().max(64).optional(),
    entity_id: z.string().trim().max(128).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
});
export const auditRoutes = async (app) => {
    app.get('/audit', {
        preHandler: requirePermission('audit.read')
    }, async (request) => {
        const query = listAuditQuerySchema.parse(request.query);
        const whereParts = [];
        const values = [];
        let index = 1;
        if (query.entity_type) {
            whereParts.push(`entity_type = $${index++}`);
            values.push(query.entity_type);
        }
        if (query.entity_id) {
            whereParts.push(`entity_id = $${index++}`);
            values.push(query.entity_id);
        }
        const whereClause = whereParts.length > 0 ? `where ${whereParts.join(' and ')}` : '';
        const offset = (query.page - 1) * query.pageSize;
        const [eventsResult, totalResult] = await Promise.all([
            request.db.$client.query(`
            select
              id,
              created_at,
              actor_user_id,
              actor_roles,
              action,
              entity_type,
              entity_id,
              before_json,
              after_json,
              reason,
              request_id
            from audit_events
            ${whereClause}
            order by created_at desc
            limit $${index} offset $${index + 1}
          `, [...values, query.pageSize, offset]),
            request.db.$client.query(`select count(*)::int as total from audit_events ${whereClause}`, values)
        ]);
        return {
            page: query.page,
            pageSize: query.pageSize,
            total: Number(totalResult.rows[0]?.total ?? 0),
            data: eventsResult.rows
        };
    });
    app.post('/admin/audit-test', {
        preHandler: requirePermission('system.admin.test')
    }, async (request) => {
        const audit = auditFromRequest(request);
        const before = {
            status: 'pending',
            value: 1
        };
        const after = {
            status: 'done',
            value: 2
        };
        const result = await audit.append({
            action: 'system.audit.test',
            entityType: 'system_test',
            entityId: request.requestContext.requestId,
            beforeJson: before,
            afterJson: after,
            reason: 'Manual audit pipeline validation'
        });
        return {
            ok: true,
            ...result
        };
    });
};
//# sourceMappingURL=routes.js.map