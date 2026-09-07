import pg from 'pg';
import { createNativeDatabasePlan } from './native-test-database-plan.mjs';

// Only databases created successfully by this invocation may be removed.
// Failed/ambiguous ownership verification retains the database for inspection.
export async function withNativeTestDatabase({ adminUrl, runId, prepare, run, deadlineMs = 120000, cleanupTimeoutMs = 15000, clientFactory = (connectionString) => new pg.Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 15000, statement_timeout: 15000 }) }) {
  const plan = createNativeDatabasePlan(adminUrl, runId);
  if (typeof prepare !== 'function' || typeof run !== 'function') throw new Error('native database preparation and execution callbacks are required');
  if (![deadlineMs, cleanupTimeoutMs].every((value) => Number.isSafeInteger(value) && value > 0 && value <= 3600000)) throw new Error('invalid native database lifecycle deadline');
  let client;
  const marker = `native-coverage:${runId}`;
  const identifier = `"${plan.databaseName}"`;
  let created = false;
  let identity;
  let value;
  let phase = 'client-factory';
  let failedPhase;
  let cleanup = 'not-created';
  let timedOut = false;
  const controller = new AbortController();
  const expiresAt = Date.now() + deadlineMs;
  const bounded = async (operation, milliseconds) => {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error('native lifecycle deadline exceeded')); }, Math.max(1, milliseconds)); }),
      ]);
    } finally { clearTimeout(timer); }
  };
  const execute = (operation) => bounded(operation, expiresAt - Date.now());
  const lookup = () => client.query("SELECT oid::text AS oid, shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname = $1", [plan.databaseName]);
  try {
    client = clientFactory(plan.adminUrl);
    phase = 'connect';
    await execute(() => client.connect());
    phase = 'create';
    await execute(() => client.query(`CREATE DATABASE ${identifier} TEMPLATE template0`));
    created = true;
    phase = 'record-ownership';
    const result = await execute(lookup);
    if (result.rows.length !== 1 || !/^[1-9][0-9]*$/.test(result.rows[0].oid) || result.rows[0].marker != null) throw new Error('created database identity unavailable or already marked');
    identity = result.rows[0].oid;
    await execute(() => client.query(`COMMENT ON DATABASE ${identifier} IS '${marker}'`));
    const owned = await execute(lookup);
    if (owned.rows.length !== 1 || owned.rows[0].oid !== identity || owned.rows[0].marker !== marker) throw new Error('database ownership was not recorded');
    phase = 'prepare';
    await execute(() => prepare(plan, { signal: controller.signal }));
    phase = 'run';
    value = await execute(() => run(plan, { signal: controller.signal }));
  } catch {
    // Driver/callback errors may contain credentials or connection URLs.
    failedPhase = phase;
  } finally {
    if (created && timedOut) cleanup = 'retained-operation-timeout';
    else if (created) {
      cleanup = 'retained-unverified';
      try {
        const current = await bounded(lookup, cleanupTimeoutMs);
        if (!identity || current.rows.length !== 1 || current.rows[0].oid !== identity || current.rows[0].marker !== marker) throw new Error('ownership changed');
        await bounded(() => client.query(`DROP DATABASE ${identifier} WITH (FORCE)`), cleanupTimeoutMs);
        cleanup = 'dropped-owned-database';
      } catch { failedPhase ??= 'cleanup'; }
    }
    if (client) try { await bounded(() => client.end(), cleanupTimeoutMs); } catch { failedPhase ??= 'close-administrator'; }
  }
  const evidence = { ...plan.evidence, created, cleanup, timedOut, status: failedPhase ? 'failed' : 'passed', failedPhase: failedPhase ?? null };
  if (failedPhase) {
    const error = new Error(`native test database lifecycle failed during ${failedPhase}; ${cleanup}`);
    error.evidence = evidence;
    throw error;
  }
  return { value, evidence };
}
