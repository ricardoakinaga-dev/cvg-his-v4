import { SpanStatusCode, trace } from '@opentelemetry/api';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from './schemas/index.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

type QueryArgs = Parameters<Pool['query']>;
type QueryResult = Awaited<ReturnType<Pool['query']>>;

function extractQueryText(args: readonly unknown[]): string {
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    return firstArg;
  }

  if (typeof firstArg === 'object' && firstArg !== null && 'text' in firstArg) {
    const text = (firstArg as { text?: unknown }).text;
    return typeof text === 'string' ? text : 'unknown';
  }

  return 'unknown';
}

function summarizeQuery(text: string): { operation: string; statement: string } {
  const compact = text.replace(/\s+/g, ' ').trim();
  const statement = compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
  const match = /^([a-zA-Z]+)/.exec(compact);
  return {
    operation: match?.[1]?.toUpperCase() ?? 'UNKNOWN',
    statement
  };
}

async function withDatabaseSpan<T>(
  args: readonly unknown[],
  fn: () => Promise<T>
): Promise<T> {
  const text = extractQueryText(args);
  const { operation, statement } = summarizeQuery(text);
  const tracer = trace.getTracer('cvg-his-v2.database');

  return await tracer.startActiveSpan(
    `db.query ${operation}`,
    {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.statement': statement
      }
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

function instrumentPool(targetPool: Pool): Pool {
  const originalQuery = targetPool.query.bind(targetPool);
  const originalPromiseQuery = originalQuery as (...args: QueryArgs) => Promise<QueryResult>;
  targetPool.query = ((...args: QueryArgs) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      return originalQuery(...args);
    }

    return withDatabaseSpan(args, () => originalPromiseQuery(...args));
  }) as Pool['query'];

  const originalConnect = targetPool.connect.bind(targetPool);
  targetPool.connect = (async (): Promise<PoolClient> => {
    const client = await originalConnect();
    const instrumentedClient = client as PoolClient & { __otelInstrumented?: boolean };

    if (!instrumentedClient.__otelInstrumented) {
      const originalClientQuery = client.query.bind(client);
      const originalClientPromiseQuery =
        originalClientQuery as (...args: Parameters<PoolClient['query']>) => Promise<unknown>;
      instrumentedClient.query = ((...args: Parameters<PoolClient['query']>) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          return originalClientQuery(...args);
        }

        return withDatabaseSpan(args, () => originalClientPromiseQuery(...args));
      }) as PoolClient['query'];
      instrumentedClient.__otelInstrumented = true;
    }

    return client;
  }) as Pool['connect'];

  return targetPool;
}

export function createDatabaseClient(connectionString: string) {
  if (pool && db) {
    return db;
  }

  const basePool = new Pool({ connectionString });
  const otelEnabled = process.env.OTEL_ENABLED === 'true' || process.env.OTEL_ENABLED === '1';
  pool = otelEnabled ? instrumentPool(basePool) : basePool;
  db = drizzle(pool, { schema });
  return db;
}

export function getDatabaseClient() {
  if (!db) {
    throw new Error('Database client not initialized. Call createDatabaseClient first.');
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDatabaseClient first.');
  }
  return pool;
}

export async function closeDatabaseClient() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function checkDatabaseHealth(): Promise<{ healthy: boolean; detail: string }> {
  try {
    if (!pool) {
      return { healthy: false, detail: 'Database pool not initialized' };
    }
    const result = await pool.query('SELECT 1');
    return { healthy: true, detail: 'Database connection healthy' };
  } catch (error) {
    return {
      healthy: false,
      detail: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

export type DatabaseClient = ReturnType<typeof drizzle>;
export { schema };
