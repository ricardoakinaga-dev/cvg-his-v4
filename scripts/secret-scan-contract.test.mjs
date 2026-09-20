import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('secret scan keeps a synthetic PostgreSQL connection string as a known-bad', () => {
  const directory = mkdtempSync(join(root, '.secret-scan-'));
  try {
    const fixturePath = join(directory, 'known-bad.mjs');
    const fixtureValue = [
      'post',
      'gres',
      ':',
      '//secret-user:secret-password@127.0.0.1:5433/cvg_his_v2_secret_scan'
    ].join('');
    writeFileSync(fixturePath, `const DATABASE_URL = ${JSON.stringify(fixtureValue)};\n`);

    const result = spawnSync(
      'pnpm',
      [
        'exec',
        'secretlint',
        '--secretlintrc',
        join(root, '.secretlintrc.json'),
        '--secretlintignore',
        join(root, '.secretlintignore'),
        fixturePath
      ],
      { cwd: root, encoding: 'utf8' }
    );

    assert.notEqual(result.status, 0, 'known-bad secret fixture unexpectedly passed');
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /PostgreSQLConnection/,
      'known-bad fixture did not trigger the database connection rule'
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
