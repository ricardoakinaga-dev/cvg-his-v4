import { type FastifyInstance } from 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        requestStartTimeMs: number;
    }
}
export declare function buildServer(): Promise<FastifyInstance>;
//# sourceMappingURL=server.d.ts.map