import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import ts from 'typescript';

test('emitting application and package TypeScript configs preserve JavaScript source maps', () => {
  const paths = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      'apps/**/tsconfig.json',
      'packages/**/tsconfig.json'
    ],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  assert.ok(paths.includes('packages/secrets/tsconfig.json'));
  const missing = [];
  for (const path of new Set(paths)) {
    // Git still lists deleted files before the archive is committed. A removed
    // workspace is not an emitter; a missing config in a present package is an error.
    if (!existsSync(path) && !existsSync(resolve(dirname(path), 'package.json'))) continue;
    const config = ts.getParsedCommandLineOfConfigFile(
      resolve(path),
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
      }
    );
    assert.ok(config, path);
    assert.equal(config.errors.length, 0, path);
    const options = config.options;
    if (
      !options.noEmit &&
      !options.emitDeclarationOnly &&
      !options.sourceMap &&
      !options.inlineSourceMap
    )
      missing.push(path);
  }
  assert.deepEqual(
    missing,
    [],
    'generated JavaScript must remain traceable to its original source'
  );
});
