/**
 * Test-only launcher for the real API entrypoint.
 *
 * The integration process boundary starts this file directly with Node + tsx
 * so its PID is the process that owns the HTTP server and database pool.  It
 * intentionally delegates all runtime behavior to ../src/index.ts.
 */
if (process.env.API_PROCESS_FIXTURE !== '1' || process.env.NODE_ENV !== 'test') {
  throw new Error('api process fixture requires API_PROCESS_FIXTURE=1 and NODE_ENV=test');
}

await import('../src/index.js');
