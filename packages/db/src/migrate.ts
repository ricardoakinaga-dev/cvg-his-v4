import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { closeDbConnection, db } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../migrations');

export async function runMigrations(): Promise<void> {
  try {
    await migrate(db, { migrationsFolder });
    console.info('Migrations applied successfully.');
  } finally {
    await closeDbConnection();
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  void runMigrations().catch((error) => {
    console.error('Failed to run migrations.', error);
    process.exitCode = 1;
  });
}
