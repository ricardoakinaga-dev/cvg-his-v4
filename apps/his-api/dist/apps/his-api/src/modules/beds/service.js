import { append } from '@cvg-his/audit';
import { createBedsRepo } from './repo.js';
function ensureActor(context) {
    const actor = context.actor;
    if (!actor?.accountId) {
        throw new Error('Actor context is required to access beds.');
    }
    return actor;
}
export function createBedsService(context) {
    const repo = createBedsRepo(context.db);
    return {
        async create(input) {
            const actor = ensureActor(context.requestContext);
            const wardExists = await repo.wardExistsInAccount(actor.accountId, input.wardId);
            if (!wardExists) {
                return { kind: 'ward_not_found' };
            }
            const bed = await repo.create({
                accountId: actor.accountId,
                ...input
            });
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'bed',
                entityId: bed.id,
                action: 'bed.create',
                beforeJson: null,
                afterJson: bed,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'created',
                bed
            };
        },
        async update(bedId, patch) {
            const actor = ensureActor(context.requestContext);
            const before = await repo.findById(actor.accountId, bedId);
            if (!before) {
                return { kind: 'bed_not_found' };
            }
            if (patch.wardId) {
                const wardExists = await repo.wardExistsInAccount(actor.accountId, patch.wardId);
                if (!wardExists) {
                    return { kind: 'ward_not_found' };
                }
            }
            const after = await repo.updateById(actor.accountId, bedId, patch);
            if (!after) {
                return { kind: 'bed_not_found' };
            }
            await append({
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                entityType: 'bed',
                entityId: bedId,
                action: 'bed.update',
                beforeJson: before,
                afterJson: after,
                requestId: context.requestContext.requestId
            });
            return {
                kind: 'updated',
                bed: after
            };
        },
        async list(query) {
            const actor = ensureActor(context.requestContext);
            return repo.list({
                accountId: actor.accountId,
                page: query.page,
                pageSize: query.pageSize,
                wardId: query.wardId,
                q: query.q
            });
        }
    };
}
//# sourceMappingURL=service.js.map