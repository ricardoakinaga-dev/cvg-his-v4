import type { FastifyPluginAsync } from 'fastify';
import type { AuthActor } from '../modules/auth/service.js';
export type RequestContext = {
    requestId: string;
    actor?: AuthActor;
};
declare module 'fastify' {
    interface FastifyRequest {
        requestContext: RequestContext;
    }
}
export declare const requestContextPlugin: FastifyPluginAsync;
//# sourceMappingURL=requestContext.d.ts.map