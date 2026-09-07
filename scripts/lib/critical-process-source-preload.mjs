import { startProcessScriptPersistence, PROCESS_SOURCE_CAPTURE } from './process-script-persistence.mjs';

if (process.env.CVG_CRITICAL_PROCESS_SOURCE_CAPTURE === '1') {
  if (globalThis[PROCESS_SOURCE_CAPTURE]) throw new Error('executed script persistence already installed');
  const capture = await startProcessScriptPersistence();
  Object.defineProperty(globalThis, PROCESS_SOURCE_CAPTURE, { value: capture });
  process.once('exit', () => {
    try { capture.flush(); }
    catch {
      process.exitCode = 1;
      process.stderr.write('[critical-process-coverage] executed script persistence failed\n');
    }
    // Keep observing through later synchronous exit listeners. Local inspector
    // sessions and open file descriptors do not keep the event loop alive;
    // native process teardown closes them, including after SIGKILL.
  });
}
