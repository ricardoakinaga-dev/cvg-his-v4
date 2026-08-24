import 'dotenv/config';

const DEFAULT_TEST_DB_URL = 'postgres://postgres:postgres@localhost:5433/cvg_his_v2_test';

function sanitizeSuffix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function appendDatabaseSuffix(urlString: string, suffix: string | undefined): string {
  if (!suffix) {
    return urlString;
  }

  const sanitizedSuffix = sanitizeSuffix(suffix);
  if (!sanitizedSuffix) {
    return urlString;
  }

  const url = new URL(urlString);
  const databaseName = url.pathname.replace(/^\//, '');
  if (databaseName.endsWith(`_${sanitizedSuffix}`)) {
    return urlString;
  }

  url.pathname = `/${databaseName}_${sanitizedSuffix}`;
  return url.toString();
}

function resolveDefaultTestDbUrl(): string {
  const explicitUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  const requestedSuffix = process.env.TEST_DB_SUFFIX;

  if (explicitUrl) {
    return appendDatabaseSuffix(explicitUrl, requestedSuffix);
  }

  const baseUrl = new URL(DEFAULT_TEST_DB_URL);
  const rawSuffix =
    requestedSuffix ??
    process.env.VITEST_POOL_ID ??
    process.env.VITEST_WORKER_ID ??
    `${process.ppid}_${process.pid}`;
  const suffix = sanitizeSuffix(rawSuffix);

  if (!suffix) {
    return baseUrl.toString();
  }

  baseUrl.pathname = `/${baseUrl.pathname.replace(/^\//, '')}_${suffix}`;
  return baseUrl.toString();
}

export const TEST_DB_URL = resolveDefaultTestDbUrl();

export const TEST_DB_NAME = new URL(TEST_DB_URL).pathname.replace(/^\//, '');
export const TEST_DB_IS_EPHEMERAL =
  process.env.TEST_DB_EPHEMERAL === '1' ||
  (!process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL);

export const ADMIN_DB_URL = (() => {
  const url = new URL(TEST_DB_URL);
  url.pathname = '/postgres';
  return url.toString();
})();
