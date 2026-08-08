import pg from 'pg';

const connection = process.env.DATABASE_URL_TEST
  ? { connectionString: process.env.DATABASE_URL_TEST }
  : {
      host: '127.0.0.1',
      port: 5433,
      user: 'postgres',
      password: 'postgres',
      database: 'cvg_his_v2_test'
    };
const deadline = Date.now() + 30_000;

while (Date.now() < deadline) {
  const client = new pg.Client({ ...connection, connectionTimeoutMillis: 1_000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    process.stdout.write('[test-db] PostgreSQL is ready\n');
    process.exit(0);
  } catch {
    await client.end().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

process.stderr.write('[test-db] PostgreSQL did not become ready within 30 seconds\n');
process.exit(1);
