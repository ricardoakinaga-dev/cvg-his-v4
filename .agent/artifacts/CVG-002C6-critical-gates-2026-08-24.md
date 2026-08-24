# CVG-002C6 — critical gates and deployment guardrails

**Date:** 24 August 2026 (BRT)
**Branch:** `agent/sync-v4-full-program`
**Scope:** disposable PostgreSQL only; no production, provider or target-cluster mutation

## Fresh RED/GREEN evidence

The bounded fixes from this slice were validated before publication:

| Check | Result |
| --- | --- |
| Inventory charge-capture focused regression | 1 file, 3/3 tests, exit 0, 38.07 s |
| Encounter close → receipt focused regression | 1 file, 5/5 tests, exit 0, 41.96 s |
| Production-like runtime bootstrap focused regression | 1 file, 6/6 tests, exit 0, 87.76 s |
| `test:critical` base phase | 28 files, 387/387 tests, exit 0, 710.99 s |
| `test:critical` child-process phase | 1 file, 2/2 tests, exit 0, 60.09 s |

The full command used an explicit `DATABASE_URL_TEST` and `DATABASE_URL` base
URL. `tests/setup/env.ts` resolved separate physical databases by shell PID:

```text
cvg_his_v2_test_critical_final_critical_base_<pid>
cvg_his_v2_test_critical_final_critical_process_<pid>
```

Both phases applied migrations `0000–0123`, used ephemeral teardown and exited
green. The base phase observed 172 tables, 43 enums and 456 foreign keys. The
child-process phase exercised real PIDs, `SIGKILL`, lease expiry/takeover and
replay of the inpatient inventory command.

## Guardrail evidence

All of the following completed with exit 0 on 24 August:

- `pnpm deploy:check` — 12/12 checks;
- `node infra/scripts/check-cutover-readiness.mjs --json` — 12/12 pass, 0 failures;
- `node tools/migration-consistency-report.mjs` — manifest v2, five plan-only waves;
- `pnpm validate:rls` — 154/155 tenant tables protected, one documented exception;
- `pnpm validate:openapi` — 337 paths, 40 tags, 390 schemas;
- `pnpm security:secrets` — no secret findings in the scanned source/deploy surfaces;
- `pnpm typecheck` — all 70 scoped workspace projects completed with exit 0;
- `git diff --check` — clean for the intended changes.

The targeted ESLint command remains a baseline partial: it reports existing
unused imports/variables in `apps/api/src/server.ts` and the pre-existing
`no-useless-catch` finding in the inventory module. It did not report a new
rule violation specific to the added rollback-observability hunk.

The migration manifest is deliberately `PLAN_ONLY`: it documents waves and
rollback criteria but does not claim execution, reconciliation or cutover in a
legacy/target environment.

## Implementation recorded

- Production-like Compose now defaults `RUNTIME_DISTRIBUTED_STATE_ENABLED=1`
  and documents the host/container Redis port distinction (`6380`/`6379`).
- Cutover readiness is fail-closed for missing/invalid required documents and
  validates the plan-only migration manifest.
- `test:critical` runs its base and process phases against distinct ephemeral
  database names; explicit URLs are suffixed idempotently and migrations,
  pools and seed all use the resolved URL.
- Inventory balance-change conflicts have a bounded maximum of three retries,
  with database hydration between attempts.
- Encounter rollback cache hydration now observes rejected promises and logs
  the affected cache/account rather than creating an unhandled rejection or
  silently losing observability.
- The daily-charge rollback test uses the actual `VARCHAR` charge identifier
  contract instead of an invalid UUID cast.

## Review limits and open gates

The independent read-only review found no P0. It recorded two P1 hardening
items for future work: add an explicit concurrent-run proof/lock around the
full critical command, and consider backoff/jitter for repeated inventory
conflicts. The rollback observer now includes `correlationId` and
`encounterId`; the review also notes that the cutover checker remains
primarily static (`includes()`), and the Redis/migration manifest checks do
not prove target connectivity or execution.

These results are bounded engineering evidence only. They do not promote
`CVG-002C6`, the ERP, Vetus parity, global RLS/FORCE RLS, WebAuthn durability,
Redis/provider readiness, SPA/WCAG, coverage, backup/restore/failover,
production deployment or release. The global state remains
`IN_PROGRESS/PARTIAL`.
