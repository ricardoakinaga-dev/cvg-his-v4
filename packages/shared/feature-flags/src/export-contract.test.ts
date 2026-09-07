import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

test('clean compilation emits every advertised JS/types export and package subpaths import', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const temporary = mkdtempSync(join(tmpdir(), 'feature-flags-export-contract-'));
  try {
    const require = createRequire(import.meta.url);
    const result = spawnSync(
      process.execPath,
      [
        require.resolve('typescript/bin/tsc'),
        '-p',
        join(root, 'tsconfig.json'),
        '--outDir',
        join(temporary, 'dist'),
        '--tsBuildInfoFile',
        join(temporary, 'build.tsbuildinfo')
      ],
      { encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    for (const [subpath, targets] of Object.entries(manifest.exports) as [
      string,
      Record<string, string>
    ][]) {
      for (const target of Object.values(targets))
        assert.ok(existsSync(join(temporary, target)), `clean output missing ${target}`);
      const loaded = await import(manifest.name + (subpath === '.' ? '' : subpath.slice(1)));
      assert.ok(Object.keys(loaded).length > 0);
    }
    const repositories = await import('@cvg-his-v2/shared-feature-flags/repositories');
    const provider = await import('@cvg-his-v2/shared-feature-flags/database-provider');
    assert.equal(typeof repositories.DatabaseFeatureFlagRepository, 'function');
    assert.equal(typeof repositories.AuditableFeatureFlagRepository, 'function');
    assert.equal(typeof provider.createDatabaseFeatureFlagProvider, 'function');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
