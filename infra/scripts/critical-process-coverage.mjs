import { openSync, closeSync, statSync, fstatSync, constants } from 'node:fs';

const DIRECTORY_DESCRIPTOR = /^\/proc\/[1-9][0-9]*\/fd\/[0-9]+$/;

// Only the isolated real-worker fixture exercises production-like guards.
// Keep NODE_ENV=staging intact: instrumentation must not change runtime policy.
// These flags scope test instrumentation; they are not a security sandbox.
export function isCriticalProcessRuntimeFixture(environment = process.env) {
  return (
    process.platform === 'linux' &&
    environment.NODE_ENV === 'staging' &&
    environment.CVG_CRITICAL_PROCESS_RUNNER === '1' &&
    environment.CVG_CRITICAL_PROCESS_RUNTIME_FIXTURE === 'worker-entrypoint' &&
    environment.CVG_CRITICAL_PROCESS_COVERAGE === '1' &&
    environment.CVG_CRITICAL_PROCESS_SOURCE_CAPTURE === '1' &&
    typeof environment.NODE_V8_COVERAGE === 'string' &&
    DIRECTORY_DESCRIPTOR.test(environment.NODE_V8_COVERAGE)
  );
}

// The outer coverage controller owns a directory descriptor. Duplicate that
// capability for the entire suite lifetime; never propagate a replaceable path.
export function acquireCriticalProcessCoverage(environment = process.env) {
  if (environment.CVG_CRITICAL_PROCESS_COVERAGE !== '1') return null;
  const source = environment.NODE_V8_COVERAGE;
  if (
    process.platform !== 'linux' ||
    (environment.NODE_ENV !== 'test' && !isCriticalProcessRuntimeFixture(environment)) ||
    typeof source !== 'string' ||
    !DIRECTORY_DESCRIPTOR.test(source)
  ) {
    throw new Error(
      'critical process coverage requires Linux, NODE_ENV=test or the explicit staging worker fixture, and an explicit procfs directory descriptor'
    );
  }
  const before = statSync(source);
  if (!before.isDirectory())
    throw new Error('critical process coverage descriptor is not a directory');
  const descriptor = openSync(source, constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    const opened = fstatSync(descriptor);
    if (opened.dev !== before.dev || opened.ino !== before.ino)
      throw new Error('critical process coverage directory identity changed');
    let closed = false;
    return {
      environment: Object.freeze({
        CVG_CRITICAL_PROCESS_COVERAGE: '1',
        CVG_CRITICAL_PROCESS_SOURCE_CAPTURE: '1',
        NODE_OPTIONS: `--import=${new URL('../../scripts/lib/critical-process-source-preload.mjs', import.meta.url).href}`,
        NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${descriptor}`
      }),
      close() {
        if (!closed) {
          closeSync(descriptor);
          closed = true;
        }
      }
    };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}
