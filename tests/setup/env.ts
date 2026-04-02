import 'dotenv/config';

export const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/cvg_his_v2_test';

export const TEST_DB_NAME = new URL(TEST_DB_URL).pathname.replace(/^\//, '');

export const ADMIN_DB_URL = (() => {
  const url = new URL(TEST_DB_URL);
  url.pathname = '/postgres';
  return url.toString();
})();
