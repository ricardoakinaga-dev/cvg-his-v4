import fp from 'fastify-plugin';
import { resolveActorFromHeaders } from '../modules/auth/service.js';
const requestContextPluginImpl = async (app) => {
    app.addHook('onRequest', async (request) => {
        request.requestContext = {
            requestId: request.id,
            actor: resolveActorFromHeaders(request.headers)
        };
    });
};
export const requestContextPlugin = fp(requestContextPluginImpl, {
    name: 'request-context-plugin'
});
//# sourceMappingURL=requestContext.js.map