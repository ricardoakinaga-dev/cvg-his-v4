import { append } from '@cvg-his/audit';
import { createOwnersRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access owners.');
    }
    return actor;
}
export function createOwnersService(context) {
    const repo = createOwnersRepo(context.db);
    return {
        async create(input) {
            const actor = ensureActor(context.requestContext);
            const created = await repo.create({
                accountId: actor.accountId,
                unitId: actor.unitId ?? null,
                ...input
            });
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'owner',
                entityId: created.id,
                action: 'owner.create',
                beforeJson: null,
                afterJson: created,
                requestId: context.requestContext.requestId
            });
            return created;
        },
        async getById(ownerId) {
            const actor = ensureActor(context.requestContext);
            return repo.findById(actor.accountId, ownerId);
        },
        async update(ownerId, patch) {
            const actor = ensureActor(context.requestContext);
            const before = await repo.findById(actor.accountId, ownerId);
            if (!before) {
                return null;
            }
            const after = await repo.updateById(actor.accountId, ownerId, patch);
            if (!after) {
                return null;
            }
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'owner',
                entityId: ownerId,
                action: 'owner.update',
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