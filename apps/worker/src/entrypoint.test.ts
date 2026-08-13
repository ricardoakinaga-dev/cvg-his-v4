import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

function productionEnvironmentWithoutAccounts(): NodeJS.ProcessEnv {
  const sanitized = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => key !== 'WORKER_ACCOUNT_ID' && key !== 'WORKER_ACCOUNT_IDS'
    )
  );

  const unavailableDatabaseUrl = new URL('postgresql://127.0.0.1:1/unused');
  unavailableDatabaseUrl.username = 'runtime';
  unavailableDatabaseUrl.password = 'unused';

  return {
    ...sanitized,
    NODE_ENV: 'production',
    DATABASE_URL: unavailableDatabaseUrl.toString()
  };
}

for (const entrypoint of ['index.js', 'run-once.js']) {
  test(`${entrypoint} exits fail-closed before bootstrap when WORKER_ACCOUNT_IDS is absent`, () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL(`./${entrypoint}`, import.meta.url))],
      {
        encoding: 'utf8',
        env: productionEnvironmentWithoutAccounts()
      }
    );

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Production-like worker requires WORKER_ACCOUNT_IDS with at least one UUID/
    );
    assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
  });
}
