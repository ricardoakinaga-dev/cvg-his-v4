import { Pool } from 'pg';
import * as schema from './schema/index.js';
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export declare function closeDbConnection(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map