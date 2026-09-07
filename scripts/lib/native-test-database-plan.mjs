// No connection or mutation here. Native API integration must explicitly create
// this new database, apply schema/seed, and prove ownership before cleanup.
export function createNativeDatabasePlan(adminUrl, runId) {
  if (typeof adminUrl !== 'string' || !adminUrl.trim()) throw new Error('NATIVE_TEST_DATABASE_ADMIN_URL is required; no application database fallback');
  if (typeof runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId)) throw new Error('native database run ID must be a UUID');
  let url;
  try { url = new URL(adminUrl); } catch { throw new Error('invalid native test administrator URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/postgres' || url.search || url.hash || (url.port && (!/^\d+$/.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535))) throw new Error('native test administrator URL must target local /postgres without query overrides');
  const databaseName = `cvg_his_v2_test_native_${runId.replaceAll('-', '').toLowerCase()}`;
  const databaseUrl = new URL(url);
  databaseUrl.pathname = `/${databaseName}`;
  return {
    adminUrl: url.toString(), databaseUrl: databaseUrl.toString(), databaseName,
    environment: {
      NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null',
      DATABASE_URL: databaseUrl.toString(), DATABASE_URL_TEST: databaseUrl.toString(), E2E_DATABASE_URL: databaseUrl.toString(),
    },
    evidence: { runId, databaseName, host: url.hostname, port: Number(url.port || 5432), policy: 'create-new-owned-database-only' },
  };
}
