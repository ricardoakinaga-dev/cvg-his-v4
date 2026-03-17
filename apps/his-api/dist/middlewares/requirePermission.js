import { can } from '@cvg-his/rbac';
function replyAuthError(reply, statusCode, message) {
    void reply.status(statusCode).send({ message });
}
export function requirePermission(permission) {
    return async (request, reply) => {
        if (!request.requestContext.actor?.accountId) {
            replyAuthError(reply, 401, 'Missing actor context. Provide x-account-id header.');
            return;
        }
        if (!can(request.requestContext.actor, permission)) {
            replyAuthError(reply, 403, `Missing required permission: ${permission}`);
            return;
        }
    };
}
//# sourceMappingURL=requirePermission.js.map