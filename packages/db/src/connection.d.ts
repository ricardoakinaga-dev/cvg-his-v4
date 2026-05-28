import { Pool } from 'pg';
import type { NodePgClient } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
export type { Pool } from 'pg';
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: NodePgClient;
};
export declare function closeDbConnection(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map
