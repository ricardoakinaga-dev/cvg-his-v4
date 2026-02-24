import fp from 'fastify-plugin';
import { resolveActorFromHeaders } from '../modules/auth/service.js';
const requestContextPluginImpl = async (app) => {
    const parseAudience = (value) => (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const jwtSecret = app.hasDecorator('env') ? app.env.JWT_SECRET : (process.env.JWT_SECRET ?? '');
    const jwtIssuer = app.hasDecorator('env') ? app.env.JWT_ISSUER : (process.env.JWT_ISSUER ?? '');
    const jwtAudience = app.hasDecorator('env')
        ? parseAudience(app.env.JWT_AUDIENCE)
        : parseAudience(process.env.JWT_AUDIENCE);
    app.addHook('onRequest', async (request) => {
        request.requestContext = {
            requestId: request.id,
            actor: resolveActorFromHeaders(request.headers, {
                jwtSecret,
                jwtIssuer,
                jwtAudience
            })
        };
    });
};
export const requestContextPlugin = fp(requestContextPluginImpl, {
    name: 'request-context-plugin'
});
//# sourceMappingURL=requestContext.js.map