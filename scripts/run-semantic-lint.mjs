import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = process.cwd();
const sourceRoot = resolve(packageRoot, 'src');
const eslintExecutable = resolve(repositoryRoot, 'node_modules/.bin/eslint');
const eslintConfig = resolve(repositoryRoot, '.eslintrc.semantic.cjs');

if (!existsSync(sourceRoot)) {
  process.stdout.write(`semantic lint: no src directory in ${packageRoot}; nothing applicable\n`);
  process.exit(0);
}

const result = spawnSync(
  eslintExecutable,
  [
    sourceRoot,
    '--no-eslintrc',
    '--config',
    eslintConfig,
    '--ext',
    '.ts,.tsx,.js,.jsx,.mjs,.cjs',
    '--no-error-on-unmatched-pattern'
  ],
  {
    cwd: repositoryRoot,
    stdio: 'inherit'
  }
);

if (result.error) {
  process.stderr.write(`semantic lint failed to start: ${result.error.message}\n`);
  process.exit(1);
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
