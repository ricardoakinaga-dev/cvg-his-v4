import type { FastifyPluginAsync } from 'fastify';
declare function loadDbModule(): Promise<typeof import("@cvg-his/db")>;
type DbModule = Awaited<ReturnType<typeof loadDbModule>>;
declare module 'fastify' {
    interface FastifyInstance {
        db: DbModule['db'];
        checkDbHealth: () => Promise<'ok' | 'fail'>;
    }
    interface FastifyRequest {
        db: DbModule['db'];
    }
}
export declare const dbPlugin: FastifyPluginAsync;
export {};
//# sourceMappingURL=db.d.ts.map