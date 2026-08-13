const REHEARSAL_ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

function buildDatabaseUrl({ username, password, database }) {
  const url = new URL('postgresql://postgres:5432');
  url.username = username;
  url.password = password;
  url.pathname = `/${database}`;
  return url.toString();
}

export function buildRehearsalEnvironment(processId) {
  if (!Number.isInteger(processId) || processId <= 0) {
    throw new Error('processId must be a positive integer');
  }

  const database = 'cvg_his_v2_rehearsal';
  const adminPassword = `postgres_${processId}_pw`;
  const runtimePassword = `runtime_${processId}_pw`;
  const runtimeUser = 'cvg_runtime';
  const runtimeUrl = buildDatabaseUrl({
    username: runtimeUser,
    password: runtimePassword,
    database,
  });

  return Object.freeze({
    NODE_ENV: 'production',
    POSTGRES_DB: database,
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: adminPassword,
    DATABASE_ADMIN_URL: buildDatabaseUrl({
      username: 'postgres',
      password: adminPassword,
      database,
    }),
    DATABASE_RUNTIME_USER: runtimeUser,
    DATABASE_RUNTIME_PASSWORD: runtimePassword,
    DATABASE_RUNTIME_URL_DOCKER: runtimeUrl,
    DATABASE_URL: runtimeUrl,
    WORKER_ACCOUNT_IDS: REHEARSAL_ACCOUNT_ID,
    AUTH_SECRET: `local_rehearsal_auth_secret_${processId}_01234567890123456789`,
    CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3002',
    VITE_APP_NAME: 'CVG HIS V2 Rehearsal',
    VITE_DISABLE_PWA: '1',
    OTEL_ENABLED: 'false',
    BACKUP_INCLUDE_STORAGE: 'true',
  });
}

export function serializeRehearsalEnvironment(environment) {
  return `${Object.entries(environment).map(([name, value]) => `${name}=${value}`).join('\n')}\n`;
}
