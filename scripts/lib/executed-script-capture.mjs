import { Session } from 'node:inspector';
import { createHash } from 'node:crypto';

// Capture code from the executing V8 isolate, not by guessing the loader's
// transform. This is an observation component, not source-map authentication.
export async function startExecutedScriptCapture({ acceptUrl, maxBytes = 128 * 1024 * 1024, maxScripts = 10000, onScript, onFailure }) {
  if (typeof acceptUrl !== 'function' || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || !Number.isSafeInteger(maxScripts) || maxScripts <= 0 || (onScript !== undefined && typeof onScript !== 'function') || (onFailure !== undefined && typeof onFailure !== 'function')) throw new Error('invalid executed-script capture configuration');
  const session = new Session();
  const scripts = new Map();
  let pending = 0;
  let failed = false;
  let totalBytes = 0;
  let closed = false;
  const fail = () => {
    failed = true;
    try { onFailure?.(); } catch { /* Failure remains sticky even if its observer fails. */ }
  };
  session.connect();
  session.on('Debugger.scriptParsed', ({ params }) => {
    try {
      if (failed || !acceptUrl(params.url)) return;
      if (scripts.has(params.scriptId) || scripts.size + pending >= maxScripts) { fail(); return; }
      pending += 1;
      session.post('Debugger.getScriptSource', { scriptId: params.scriptId }, (error, result) => {
        pending -= 1;
        if (error || typeof result?.scriptSource !== 'string') { fail(); return; }
        const code = result.scriptSource;
        if (code.length > maxBytes - totalBytes || params.url.length > maxBytes - totalBytes) { fail(); return; }
        const script = Object.freeze({
          scriptId: params.scriptId, url: params.url, code,
          sha256: createHash('sha256').update(code).digest('hex')
        });
        // Bound retained payload including metadata, not just source text.
        // The separate count limit also bounds Map/object and pending-request
        // overhead; this is not a promise about whole-process V8 RSS.
        const bytes = Buffer.byteLength(JSON.stringify(script));
        if (bytes > maxBytes - totalBytes) { fail(); return; }
        totalBytes += bytes;
        scripts.set(params.scriptId, script);
        try { onScript?.(script); } catch { fail(); }
      });
    } catch { fail(); }
  });
  try {
    await new Promise((done, reject) => session.post('Debugger.enable', {}, (error) => error ? reject(error) : done()));
  } catch (error) { session.disconnect(); throw error; }
  return {
    snapshot() {
      if (closed || failed || pending) throw new Error('executed-script capture is closed, failed or incomplete');
      return [...scripts.values()];
    },
    close() {
      if (!closed) { closed = true; session.disconnect(); }
    }
  };
}
