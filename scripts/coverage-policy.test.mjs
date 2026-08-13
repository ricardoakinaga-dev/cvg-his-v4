import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

function trackedSourceFiles() {
  const output = execFileSync(
    'rg',
    [
      '--files',
      'apps/api/src',
      'packages/modules',
      'packages/shared',
      'packages/db/src',
      'packages/tenant-context/src',
      '-g',
      '*.ts',
      '-g',
      '!*.test.ts',
      '-g',
      '!*.d.ts',
    ],
    { cwd: root, encoding: 'utf8' },
  );

  return output.trim().split('\n').filter(Boolean);
}

function productionPackageTsconfigs() {
  const output = execFileSync(
    'rg',
    [
      '--files',
      'packages/modules',
      'packages/shared',
      'packages/db',
      'packages/tenant-context',
      '-g',
      'tsconfig.json',
    ],
    { cwd: root, encoding: 'utf8' },
  );

  return output.trim().split('\n').filter(Boolean);
}

test('production sources contain no directives that hide executable code from coverage', () => {
  const violations = trackedSourceFiles().filter((file) => {
    const source = readFileSync(new URL(file, root), 'utf8');
    return /(?:v8|c8|istanbul)\s+ignore/i.test(source);
  });

  assert.deepEqual(violations, []);
});

test('coverage configuration does not exclude complete business, route or repository trees', () => {
  const config = readFileSync(new URL('vitest.config.ts', root), 'utf8');
  const coverageExcludes = config.match(/coverage:\s*\{[\s\S]*?exclude:\s*\[([\s\S]*?)\],\s*reportOnFailure/)?.[1] ?? '';
  const forbiddenPatterns = [
    /packages\/modules\/[^'\n]+\/src\/\*\*/,
    /packages\/\*\*\/src\/repositories\/\*\*/,
    /apps\/api\/src\/routes\/\*\*/,
    /apps\/api\/src\/repositories\/\*\*/,
  ];
  const violations = forbiddenPatterns
    .filter((pattern) => pattern.test(coverageExcludes))
    .map((pattern) => pattern.source);

  assert.deepEqual(violations, []);
});

test('production package tsconfigs do not hide executable TypeScript sources', () => {
  const violations = productionPackageTsconfigs().flatMap((file) => {
    const config = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    return (config.exclude ?? [])
      .filter((pattern) => {
        const normalized = String(pattern).replaceAll('\\', '/');
        return normalized.startsWith('src/')
          && !normalized.includes('.test.')
          && !normalized.includes('__tests__')
          && !normalized.endsWith('*.d.ts');
      })
      .map((pattern) => `${file}: ${pattern}`);
  });

  assert.deepEqual(violations, []);
});
