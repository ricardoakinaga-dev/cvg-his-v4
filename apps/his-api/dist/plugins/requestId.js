import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';
export function resolveRequestId(headers) {
    const requestIdHeader = headers['request-id'];
    const xRequestIdHeader = headers['x-request-id'];
    if (typeof requestIdHeader === 'string' && requestIdHeader.trim().length > 0) {
        return requestIdHeader;
    }
    if (typeof xRequestIdHeader === 'string' && xRequestIdHeader.trim().length > 0) {
        return xRequestIdHeader;
    }
    return randomUUID();
}
const requestIdPluginImpl = async (app) => {
    app.addHook('onRequest', async (request, reply) => {
        reply.header('x-request-id', request.id);
        reply.header('request-id', request.id);
    });
    app.addHook('onSend', async (request, reply, payload) => {
        reply.header('x-request-id', request.id);
        reply.header('request-id', request.id);
        return payload;
    });
};
export const requestIdPlugin = fp(requestIdPluginImpl, {
    name: 'request-id-plugin'
});
//# sourceMappingURL=requestId.js.map