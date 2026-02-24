import { append } from '@cvg-his/audit';
export function auditFromRequest(request) {
    const actor = request.requestContext.actor;
    return {
        append: async (input) => {
            if (!actor?.accountId) {
                throw new Error('Missing actor accountId for audit append.');
            }
            return append({
                ...input,
                accountId: actor.accountId,
                actorUserId: actor.userId,
                roles: actor.roles,
                requestId: request.requestContext.requestId
            });
        }
    };
}
//# sourceMappingURL=auditHook.js.map