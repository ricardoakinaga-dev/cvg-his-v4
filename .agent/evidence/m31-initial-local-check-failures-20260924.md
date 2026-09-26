# M-31 initial local check failures (2026-09-24)

These first attempts failed and were corrected before the I1 review. The failure
details below were transcribed from the command output in the active session after
the evidence log paths were reused for successful reruns; this file does not claim
to be the original raw stdout.

1. Initial mixed runner command:

   ```bash
   PATH=/home/ricardo/.nvm/versions/node/v22.23.2/bin:$PATH pnpm exec tsx --test packages/db/src/database-preflight.test.ts packages/db/src/migration-preflight.test.ts
   ```

   The six new Node tests passed, then the Node test runner loaded the existing
   Vitest test file and failed with `TypeError: Cannot read properties of undefined
   (reading 'config')` in `@vitest/runner`. The two test frameworks were separated:
   Node's runner executes `database-preflight.test.ts`, and Vitest uses the isolated
   no-database config for `migration-preflight.test.ts` (6/6 and 14/14 passed).

2. Initial DB package typecheck found TypeScript issues around Drizzle's union of
   literal-named table types and the overloaded `Pool.connect()` return type. The
   table scan now uses an `instanceof PgTable` loop, and the client is typed as
   `PoolClient`. The final package typecheck passed with exit 0.
