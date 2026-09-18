import { setTimeout as delay } from 'node:timers/promises';
import type { Pool } from 'pg';

export async function waitForDatabaseDisconnect(admin: Pool, databaseName: string): Promise<void> {
  // pg-pool can resolve end() before each client's socket has closed. Wait for
  // PostgreSQL to observe graceful disconnects instead of killing closing clients.
  const deadline = Date.now() + 10_000;
  while (true) {
    const result = await admin.query<{ readonly pid: number }>(
      'SELECT pid FROM pg_stat_activity WHERE datname = $1 ORDER BY pid',
      [databaseName]
    );
    if (result.rows.length === 0) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `Database ${databaseName} still has connected backends after shutdown: ${result.rows.map(({ pid }) => pid).join(', ')}`
      );
    }
    await delay(20);
  }
}
