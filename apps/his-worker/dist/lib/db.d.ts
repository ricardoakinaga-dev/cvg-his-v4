import { closeDbConnection, db } from '@cvg-his/db';
export declare const workerDb: import("drizzle-orm/node-postgres").NodePgDatabase<typeof import("@cvg-his/db/dist/schema/index.js")> & {
    $client: import("pg").Pool;
};
export { closeDbConnection };
export type WorkerDb = typeof db;
export type WorkerPgClient = typeof db.$client;
//# sourceMappingURL=db.d.ts.map