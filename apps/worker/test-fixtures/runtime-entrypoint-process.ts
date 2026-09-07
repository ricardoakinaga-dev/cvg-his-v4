/** Test-only coverage launcher; all worker behavior stays in the real entrypoint. */
import { isCriticalProcessRuntimeFixture } from '../../../infra/scripts/critical-process-coverage.mjs';

if (!isCriticalProcessRuntimeFixture() || process.env.CVG_PROCESS_COVERAGE_CONTROL !== '1') {
  throw new Error('worker coverage launcher requires the explicit staging runtime fixture');
}

const { installProcessCoverageControl } =
  await import('../../../tests/helpers/process-coverage-control.mjs');
installProcessCoverageControl();
await import('../src/index.js');
