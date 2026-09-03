import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve('tsx/cli');

/**
 * Runs a TypeScript entrypoint without a shell.
 *
 * Keeping the executable and every argument separate makes test setup work
 * from paths containing spaces or Unicode and prevents command injection.
 */
export function runTsxFileSync(
  scriptPath: string,
  args: readonly string[] = [],
  options: ExecFileSyncOptions = {}
): void {
  execFileSync(process.execPath, [TSX_CLI, scriptPath, ...args], options);
}
