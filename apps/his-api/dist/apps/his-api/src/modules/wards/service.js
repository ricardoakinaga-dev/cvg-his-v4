import { append } from '@cvg-his/audit';
import { createWardsRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access wards.');
    }
    return actor;
}
export function createWardsService(context) {
    const repo = createWardsRepo(context.db);
    return {
        async create(input) {
            const actor = ensureActor(context.requestContext);
            const created = await repo.create({
                accountId: actor.accountId,
                ...input
            });
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'ward',
                entityId: created.id,
                action: 'ward.create',
                beforeJson: null,
                afterJson: created,
                requestId: context.requestContext.requestId
            });
            return created;
        },
        async update(wardId, patch) {
            const actor = ensureActor(context.requestContext);
            const before = await repo.findById(actor.accountId, wardId);
            if (!before) {
                return null;
            }
            const after = await repo.updateById(actor.accountId, wardId, patch);
            if (!after) {
                return null;
            }
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'ward',
                entityId: wardId,
                action: 'ward.update',
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return after;
        },
        async list(query) {
            const actor = ensureActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                page: query.page,
                pageSize: query.pageSize,
                q: query.q
            });
        }
    };
}
//# sourceMappingURL=service.js.map