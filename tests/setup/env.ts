import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

type TestDatabaseEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveTestDatabaseUrl(
  environment: TestDatabaseEnvironment = process.env,
  runtime: Readonly<{ pid: number; ppid: number }> = {
    pid: process.pid,
    ppid: process.ppid
  }
): string {
  const explicitUrl = environment.DATABASE_URL_TEST ?? environment.DATABASE_URL;
  const requestedSuffix = environment.TEST_DB_SUFFIX;
  const isEphemeral =
    environment.TEST_DB_EPHEMERAL === '1' ||
    (!environment.DATABASE_URL_TEST && !environment.DATABASE_URL);

  if (explicitUrl) {
    // globalSetup publishes the exact database URL to Vitest workers. Once the
    // URL is resolved, workers must reuse it byte-for-byte instead of deriving
    // another database name from their own PID.
    if (environment.TEST_DB_URL_RESOLVED === '1') {
      return explicitUrl;
    }

    const withSuffix = appendDatabaseSuffix(explicitUrl, requestedSuffix);
    // The canonical aggregate runner explicitly requests process isolation
    // because workspace package test controllers may execute concurrently.
    // Ordinary Vitest invocations keep one database shared by globalSetup and
    // their workers.
    if (isEphemeral && environment.TEST_DB_PROCESS_ISOLATION === '1') {
      return appendDatabaseSuffix(withSuffix, `p${runtime.pid}`);
    }
    return withSuffix;
  }

  const baseUrl = new URL(DEFAULT_TEST_DB_URL);
  const rawSuffix =
    requestedSuffix ??
    environment.VITEST_POOL_ID ??
    environment.VITEST_WORKER_ID ??
    `${runtime.ppid}_${runtime.pid}`;
  const suffix = sanitizeSuffix(rawSuffix);

  if (!suffix) {
    return baseUrl.toString();
  }

  baseUrl.pathname = `/${baseUrl.pathname.replace(/^\//, '')}_${suffix}`;
  return baseUrl.toString();
}

export function isDisposableTestDatabaseName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,63}$/.test(name) && /(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(name);
}

export const TEST_DB_URL = resolveTestDatabaseUrl();

export const TEST_DB_NAME = decodeURIComponent(new URL(TEST_DB_URL).pathname.replace(/^\/+/, ''));
export const TEST_DB_RUN_ID = /^[a-f0-9]{32}$/i.test(process.env.TEST_DB_RUN_ID ?? '')
  ? process.env.TEST_DB_RUN_ID!
  : randomUUID().replaceAll('-', '');
export const TEST_DB_OWNER_ROLE = `cvg_test_owner_${TEST_DB_RUN_ID}_p${process.pid}`;
export const TEST_DB_OWNER_COMMENT = `cvg-test-db-owner:${TEST_DB_RUN_ID}:${TEST_DB_NAME}`;
export const TEST_DB_IS_EPHEMERAL =
  process.env.TEST_DB_EPHEMERAL === '1' ||
  (!process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL);
export const DEFAULT_TEST_DB_OWNERSHIP_DIRECTORY = join(
  tmpdir(),
  'cvg-his-test-db-ownership',
  TEST_DB_RUN_ID
);

export function assertDisposableTestDatabaseTarget(): void {
  if (TEST_DB_IS_EPHEMERAL && !isDisposableTestDatabaseName(TEST_DB_NAME)) {
    throw new Error(
      `[test-db] Refusing to create database ${TEST_DB_NAME}: its name must contain a standalone test or e2e marker`
    );
  }
}

export const ADMIN_DB_URL = (() => {
  const url = new URL(TEST_DB_URL);
  url.pathname = '/postgres';
  return url.toString();
})();
