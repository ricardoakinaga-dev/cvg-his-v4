import { writeFileSync, realpathSync } from 'node:fs';
import { relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { threadId } from 'node:worker_threads';
import { acquireCriticalProcessCoverage } from '../../infra/scripts/critical-process-coverage.mjs';
import { startExecutedScriptCapture } from './executed-script-capture.mjs';

export const PROCESS_SOURCE_CAPTURE = Symbol.for('cvg.test.executed-script-persistence');

// Writes observations only. The finalizer must bind code, maps and original
// sources to the frozen execution inputs before treating them as coverage.
export async function startProcessScriptPersistence({ root = fileURLToPath(new URL('../../', import.meta.url)), maxBytes, maxScripts } = {}) {
  const location = acquireCriticalProcessCoverage();
  if (!location) throw new Error('executed script persistence requires enabled coverage');
  let capture;
  let closed = false;
  try {
    const repository = realpathSync(root);
    capture = await startExecutedScriptCapture({
      maxBytes,
      maxScripts,
      // Also covers captures made by later synchronous exit listeners, after
      // the preload's exit checkpoint has already run.
      onFailure() { process.exitCode = 1; },
      acceptUrl(url) {
        if (!url.startsWith('file:')) return false;
        const path = relative(repository, fileURLToPath(url));
        const segments = path.split(sep);
        // V8, not the source suffix, determines whether this is executable JS.
        // Loaders may report JSX, Vue, query-bearing or extensionless URLs.
        return !isAbsolute(path) && ['apps', 'packages'].includes(segments[0]) &&
          !segments.includes('node_modules');
      },
      onScript(script) {
        if (!/^[0-9]+$/.test(script.scriptId)) throw new Error('invalid executed script identity');
        const name = `executed-script-${process.pid}-${threadId}-${script.scriptId}.json`;
        writeFileSync(`${location.environment.NODE_V8_COVERAGE}/${name}`, JSON.stringify({
          schemaVersion: 1, kind: 'executed-script-observation',
          pid: process.pid, threadId, ...script
        }), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      }
    });
    return Object.freeze({
      flush() {
        if (closed) throw new Error('executed script persistence is closed');
        capture.snapshot(); // Includes callback/write failures and pending source reads.
      },
      close() {
        if (!closed) { closed = true; capture.close(); location.close(); }
      }
    });
  } catch (error) {
    capture?.close();
    location.close();
    throw error;
  }
}
