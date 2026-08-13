import pg from 'pg';

const { Client } = pg;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForPostgres({
  databaseUrl,
  attempts = 30,
  intervalMs = 1000,
  connectionTimeoutMs = 5000,
  createClient = (options) => new Client(options),
}) {
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('databaseUrl is required');
  }
  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new Error('attempts must be a positive integer');
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error('intervalMs must be a non-negative number');
  }
  if (!Number.isFinite(connectionTimeoutMs) || connectionTimeoutMs <= 0) {
    throw new Error('connectionTimeoutMs must be a positive number');
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = createClient({
      connectionString: databaseUrl,
      connectionTimeoutMillis: connectionTimeoutMs,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      return true;
    } catch {
      if (attempt < attempts && intervalMs > 0) {
        await sleep(intervalMs);
      }
    } finally {
      try {
        await client.end();
      } catch {
        // Cleanup errors do not change the connection probe result.
      }
    }
  }

  return false;
}
