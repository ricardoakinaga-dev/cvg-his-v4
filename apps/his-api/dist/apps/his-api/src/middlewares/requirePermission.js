function replyAuthError(reply, statusCode, message) {
    void reply.status(statusCode).send({ message });
}
export function requirePermission(permission) {
    return async (request, reply) => {
        const actor = request.requestContext.actor;
        if (!actor?.accountId) {
            replyAuthError(reply, 401, 'Missing or invalid actor context. Provide a valid Bearer token.');
            return;
        }
        const permissions = actor.permissions ?? [];
        if (!permissions.includes('*') && !permissions.includes(permission)) {
            replyAuthError(reply, 403, `Missing required permission: ${permission}`);
            return;
        }
    };
}
//# sourceMappingURL=requirePermission.js.map