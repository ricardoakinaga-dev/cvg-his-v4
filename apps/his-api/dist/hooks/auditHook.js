import { append } from '@cvg-his/audit';
export function auditFromRequest(request) {
    const actor = request.requestContext.actor;
    return {
        append: async (input) => append({
            ...input,
            actorUserId: actor?.userId,
            roles: actor?.roles ?? [],
            requestId: request.requestContext.requestId
        })
    };
}
//# sourceMappingURL=auditHook.js.map