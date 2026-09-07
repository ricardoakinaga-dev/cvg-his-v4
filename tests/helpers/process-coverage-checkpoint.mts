import { takeCoverage } from 'node:v8';
import { isCriticalProcessRuntimeFixture } from '../../infra/scripts/critical-process-coverage.mjs';

/**
 * Test-only checkpoint: preserve hits before notifying the parent that it may
 * SIGKILL this process. No signal handlers, waits, commits or graceful shutdown.
 * V8 resets counters after each capture, so reports represent additive intervals.
 */
export function flushProcessCoverageCheckpoint(): void {
  if (process.env.CVG_CRITICAL_PROCESS_COVERAGE !== '1') return;
  if (
    (process.env.NODE_ENV !== 'test' && !isCriticalProcessRuntimeFixture()) ||
    !process.env.NODE_V8_COVERAGE
  ) {
    throw new Error(
      'process checkpoint coverage requires NODE_ENV=test and NODE_V8_COVERAGE (or the explicit staging worker fixture)'
    );
  }
  if (process.env.CVG_CRITICAL_PROCESS_SOURCE_CAPTURE === '1') {
    const capture = (globalThis as Record<symbol, unknown>)[
      Symbol.for('cvg.test.executed-script-persistence')
    ] as { flush?: () => void } | undefined;
    if (typeof capture?.flush !== 'function')
      throw new Error('executed script persistence is not installed');
    capture.flush();
  }
  takeCoverage();
}
