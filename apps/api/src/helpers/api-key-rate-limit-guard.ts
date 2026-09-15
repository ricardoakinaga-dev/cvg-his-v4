import type { IncomingMessage } from 'node:http';

/**
 * The same HTTP request may pass through more than one API-key authorization
 * boundary (the pipeline preflight and the delegated route handler). The rate
 * limit must be charged exactly once per request while key validity and
 * permissions are re-evaluated at every boundary.
 *
 * The marker lives at module scope so both implementations share it and it is
 * initialized before any server factory can handle a request.
 */
const CONSUMED = new WeakSet<IncomingMessage>();

export function claimApiKeyRateLimitConsumption(request: IncomingMessage): boolean {
  if (CONSUMED.has(request)) return false;
  CONSUMED.add(request);
  return true;
}
