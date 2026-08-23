# CVG-001 — bootstrap runtime harness (2026-08-23)

## Gate result

**GREEN bounded / no global promotion.** A disposable PostgreSQL database was
migrated through `0119_encounter_close_reason`, then exercised through real API
and worker bootstrap calls and the real `apps/api/src/index.ts` and
`apps/worker/src/index.ts` entrypoints. The test role fixtures are login roles
with `NOSUPERUSER`, `NOINHERIT` and `NOBYPASSRLS`; the unsafe fixture is a
disposable superuser and is dropped with the database.

## Fresh evidence

Command:

```text
pnpm exec vitest run tests/integration/setup/production-like-runtime-bootstrap.test.ts --config vitest.integration.config.ts --reporter=dot
```

Result: **6/6 passed**.

- API and worker restricted login roles were inspected directly in
  `pg_roles` and were `rolsuper=false`, `rolbypassrls=false`.
- API and worker production-like bootstrap rejected the disposable unsafe
  superuser with `Unsafe PostgreSQL runtime role`.
- Renaming `public.inbox_events` in the disposable schema caused API bootstrap
  to reject the missing `unitOfWork`/runtime contract instead of composing a
  mixed database/in-memory runtime.
- The same schema gap caused worker bootstrap to reject
  `Worker delivery guarantee schema is not ready` before account loading or
  the tick loop.
- Subprocesses running the real API and worker entrypoints under `NODE_ENV=staging`
  with a refused PostgreSQL URL exited non-zero and emitted no API/worker
  `listening` log. The worker therefore did not open its health listener or
  enter the infinite tick loop.
- `git diff --check` and Prettier check passed for the new test.

## Test boundary

This proves the startup boundary only. It does not certify the whole runtime
ACL matrix, `FORCE ROW LEVEL SECURITY` for every clinical/financial table,
cross-tenant behavior, setup/session durability, process behavior after a
post-start uncaught exception, or target deployment. The full admission →
handoff/stay → inventory → daily → discharge → close → receipt journey remains
the active `CVG-002C6` RED and must use two tenants, a real `NOBYPASSRLS` role,
replay/conflict/concurrency, failpoints, restart and reconciliation.

## Reproduction file

`tests/integration/setup/production-like-runtime-bootstrap.test.ts`
