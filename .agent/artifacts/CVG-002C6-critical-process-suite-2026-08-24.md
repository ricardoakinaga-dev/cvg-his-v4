# Evidence artifact — serialized critical process suite — 2026-08-24

## Scope

This artifact records the P1 regression-protection gate for `CVG-002C6`. It
covers the six real process boundaries already present in the repository and
does not promote the clinical-financial journey, the ERP, production, parity,
operations or release gates.

## Known-bad RED

Before implementation, `pnpm test:critical:process` was absent and returned
exit `254` (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`). The existing
`test:critical` script contained the database/setup/foundational phase followed
by only `inpatient-domain-sigkill.test.ts`.

## Implementation

The Builder changed only:

- [`package.json`](../../package.json), adding `test:critical:process` and
  preserving the existing database/setup/foundational command before the new
  process phase;
- [`infra/scripts/run-critical-process-suite.mjs`](../../infra/scripts/run-critical-process-suite.mjs),
  with an explicit six-file manifest, synchronous child execution, fail-fast
  exit propagation, per-file `REQUIRE_TEST_DB=1`, `TEST_DB_EPHEMERAL=1`, a
  distinct `TEST_DB_SUFFIX`, `--no-file-parallelism`,
  `--hookTimeout=120000` and `--teardownTimeout=120000`.

The manifest is:

1. `tests/integration/process/inpatient-domain-sigkill.test.ts`
2. `tests/integration/process/inpatient-clinical-financial-restart.test.ts`
3. `tests/integration/process/inpatient-cash-receipt-sigkill.test.ts`
4. `tests/integration/process/inpatient-cash-receipt-concurrency.test.ts`
5. `tests/integration/process/pix-provider-settlement-sigkill.test.ts`
6. `tests/integration/process/worker-runtime-entrypoint.test.ts`

## Independent critique

The read-only critic returned **APPROVE**. It verified the six-file manifest,
serial `spawnSync` loop, distinct PID/index database suffixes, no-file
parallelism, bounded Vitest hooks, fail-fast behavior, preservation of the
original critical phase, no shell interpolation and no secret exposure. A
bounded probe with an unavailable `pnpm` child returned non-zero after the
first manifest item. The critic noted only a non-blocking P2 hardening idea:
the runner relies on each test's global teardown and does not install its own
SIGTERM/SIGINT forwarding.

## Lead GREEN — real serial suite

Command:

```bash
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 TEST_DB_SUFFIX=critical_process_lead_final_$(date +%s)_$$ \
pnpm test:critical:process
```

Result: exit `0`; all six files passed serially against six disposable
PostgreSQL databases. The observed Vitest durations were:

| Order | File | Result | Duration |
|---:|---|---|---:|
| 1 | `inpatient-domain-sigkill.test.ts` | 4/4 | 78.28 s |
| 2 | `inpatient-clinical-financial-restart.test.ts` | 1/1 | 39.19 s |
| 3 | `inpatient-cash-receipt-sigkill.test.ts` | 1/1 | 60.26 s |
| 4 | `inpatient-cash-receipt-concurrency.test.ts` | 1/1 | 40.67 s |
| 5 | `pix-provider-settlement-sigkill.test.ts` | 5/5 | 117.31 s |
| 6 | `worker-runtime-entrypoint.test.ts` | 1/1 | 55.20 s |

The six database suffixes were distinct (`..._01_` through `..._06_`), and
the runner printed each item only after the previous child had completed. The
sum of Vitest-reported durations was `390.91 s`; bootstrap and teardown are
included in each file's wall-clock output.

## Additional checks

- `pnpm test:critical:process -- --list`: six manifest paths, exit `0`;
- `pnpm test:critical:process -- --dry-run`: six commands and six suffixes,
  exit `0`;
- JSON parse, `node --check`, Prettier, ESLint, `pnpm security:secrets` and
  `git diff --check`: pass;
- the user-owned cache
  `packages/design-system/tsconfig.vue.tsbuildinfo` was not staged or changed.

## Limitations and next gate

The top-level `pnpm test:critical` was not rerun after wiring because its
database/foundational phase is a separate long-running harness; the phase is
preserved verbatim and the complete process phase was executed independently.
This evidence remains bounded to `NODE_ENV=test` and does not prove
production-like boot, Helm rendering, cluster Secret provisioning, global
RLS/FORCE RLS, Redis, webhook retry/DLQ/fencing, DR/RPO, Vetus parity, UX,
coverage, operations or release readiness. The next highest open gate is
simultaneous laboratory bootstrap safety, followed by Helm-rendered validation
in an authorized runner and the remaining PIX/webhook/provider boundaries.
