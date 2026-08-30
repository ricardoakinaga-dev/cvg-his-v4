import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const guardScript = join(repositoryRoot, 'scripts/check-package-namespace-boundaries.mjs');

function runGuard(root: string) {
  return spawnSync(process.execPath, [guardScript, '--root', root], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  });
}

describe('canonical package namespace guard', () => {
  it('accepts the repository graph after canonical migration', () => {
    const result = runGuard(repositoryRoot);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  it('reports legacy manifest and source edges in a fixture', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'cvg-namespace-boundary-'));
    try {
      const packageRoot = join(fixture, 'packages/rbac');
      mkdirSync(join(packageRoot, 'src'), { recursive: true });
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({
          name: '@cvg-his-v2/example',
          dependencies: { '@cvg-his/legacy-contract': 'workspace:*' }
        })
      );
      writeFileSync(
        join(packageRoot, 'src/index.ts'),
        "import /* comment */ '@cvg-his/legacy-side-effect';\nimport { legacy } from '@cvg-his/legacy-contract';\nimport legacyEquals = require('@cvg-his/legacy-import-equals');\nexport { legacy } from /* comment */ '@cvg-his/legacy-export';\nconst dynamic = import(/* comment */ `@cvg-his/legacy-dynamic`);\nconst dynamicTemplate = import(`@cvg-his/legacy-dynamic-template/${suffix}`);\nconst required = require(/* comment */ `@cvg-his/legacy-require`);\nconst requiredTemplate = require(`@cvg-his/legacy-require-template/${suffix}`);\nconst resolved = require.resolve(/* comment */ '@cvg-his/legacy-resolve');\nvoid dynamic;\nvoid dynamicTemplate;\nvoid required;\nvoid requiredTemplate;\nvoid resolved;\nvoid legacyEquals;\n"
      );

      const result = runGuard(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /manifest dependency/);
      assert.match(result.stdout, /source import.*legacy-side-effect/);
      assert.match(result.stdout, /source import.*legacy-contract/);
      assert.match(result.stdout, /source import.*legacy-import-equals/);
      assert.match(result.stdout, /source import.*legacy-export/);
      assert.match(result.stdout, /source import.*legacy-dynamic/);
      assert.match(result.stdout, /source import.*legacy-dynamic-template/);
      assert.match(result.stdout, /source import.*legacy-require/);
      assert.match(result.stdout, /source import.*legacy-require-template/);
      assert.match(result.stdout, /source import.*legacy-resolve/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('ignores legacy namespace text inside comments and ordinary strings', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'cvg-namespace-boundary-clean-'));
    try {
      const packageRoot = join(fixture, 'packages/example');
      mkdirSync(join(packageRoot, 'src'), { recursive: true });
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: '@cvg-his-v2/example' })
      );
      writeFileSync(
        join(packageRoot, 'src/index.ts'),
        "// import '@cvg-his/comment';\nconst text = \"require('@cvg-his/string')\";\nconst template = `import('@cvg-his/template')`;\n"
      );

      const result = runGuard(fixture);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
