# CVG-OPS — critical process runner reliability and evidence preservation

**Status:** `PASS_BOUNDED`; parent `CVG-002C6` and global ERP remain `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`.
**Owner:** root integrator with TDD, security review and fresh independent review.
**Priority:** `P0` — the failing runner prevents observation of later critical boundaries.
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-OPS-CRITICAL-PROCESS-RUNNER-IR-001`.
**Implementation-ready gate:** `.agent/gates/implementation-ready-CVG-OPS-CRITICAL-PROCESS-RUNNER-001.json`.

## Objective

Make the existing serial process harness a trustworthy local evidence boundary:
the ten named process files must be attempted under finite budgets, a timeout
must be distinguishable from spawn/exit/signal failure, termination must clean
only the runner-owned descendants, and a failure must leave a sanitized,
diagnosable artifact for the next recovery pass.

## Confirmed gap

The fresh 2026-08-28 run passed entries 1–7, reached the existing PIX entry at
15/25 and then returned `spawnSync pnpm ETIMEDOUT`; fail-fast prevented entries
9 and 10. The current runner treats `result.error` as “Failed to start”,
removes the report directory in `finally` even when the child fails, and has no
explicit signal forwarding or process-group cleanup. The current process file
contains 25 PIX cases, so the older 5/5 or 8/8 records cannot stand in for the
current manifest.

## Frozen bounded contract

1. Keep the current ten-entry `PROCESS_TESTS` manifest and its real files. No
   case may be removed, skipped, silently retried or replaced with a lighter
   fixture to make the runner green.
2. Launch each child without shell interpolation, with explicit
   `REQUIRE_TEST_DB=1`, `TEST_DB_EPHEMERAL=1`, a unique bounded suffix,
   `--no-file-parallelism`, JSON reporting and the existing hook/teardown
   limits. Each child has a finite timeout configurable only within a safe
   positive bounded range.
3. Classify and report `timeout`, `spawn_error`, `signal`, `exit` and report
   contract failures separately, including elapsed time and bounded sanitized
   stdout/stderr diagnostics. Non-zero or incomplete child evidence stops the
   suite with a non-zero exit code.
4. Own the detached child process group on POSIX (with a safe platform fallback)
   and forward SIGINT/SIGTERM only to active groups created by this runner.
   Escalate after a finite grace period and ensure cleanup is attempted before
   the parent exits.
5. Preserve a failure artifact containing the failure classification, command
   metadata without secrets, timing, sanitized diagnostics and the Vitest JSON
   report when present. Remove generated artifacts only after a complete
   validated success.
6. CI must retain the artifact and allow a finite job budget large enough to
   observe all ten entries; increasing a ceiling must not remove timeout
   enforcement or claim remote execution locally.

## Authorized surface

- `infra/scripts/run-critical-process-suite.mjs`;
- `tests/unit/infra/critical-process-suite-contract.test.ts` and a focused
  process-runner unit test;
- `.github/workflows/ci.yml` and `docs/CI_GATES.md` only for the runner timeout,
  artifact retention and current ten-entry contract;
- bounded task, gate, artifact, risk/debt, verification and checkpoint ledgers.

## Explicit exclusions

No application/domain/financial/clinical semantics, migration, test-fixture
business behavior, provider, credential, target, production, deployment,
external mutation, release decision or global parity/readiness promotion is
authorized. The runner's eventual local result remains bounded evidence only.

## TDD acceptance

### RED

- Contract tests fail before implementation when the runner has no exported
  failure classifier/artifact-preservation contract, still uses synchronous
  child execution, deletes failed artifacts, or lacks owned signal cleanup.
- The RED record must be intentional and must not be presented as a product
  failure.

### GREEN

- Focused runner tests cover timeout, spawn error, signal/exit classification,
  bounded secret redaction, preserved failure artifacts and owned descendant
  termination.
- The real runner's `--list` exposes exactly ten unique files and `--dry-run`
  exposes ten unique bounded suffixes without executing tests.
- A fresh full local runner attempts 10/10 entries and the current PIX file
  completes 25/25; every child JSON report is complete with no failed, pending,
  todo or skipped tests.

### Regression and review

- Critical runner contract, focused process runner tests, relevant process
  regressions, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm security:secrets`,
  `pnpm validate:openapi`, `git diff --check` and control-plane parsing pass.
- A fresh independent read-only review examines process-group ownership,
  signal races, timeout enforcement, artifact secrecy and failure propagation.
- Global parity/readiness retests remain non-promoting and the existing target,
  provider, remote-CI, operations, accessibility, backup/restore and release
  limitations remain explicit.

## Revalidation triggers

- Any change to the ten-entry manifest, process fixtures, Vitest report format,
  timeout policy or CI job budget.
- Any request to run against target/production, use provider credentials or
  turn local evidence into a release verdict.

## Historical resume note

Resume from the host-restart checkpoint: obtain a fresh compatible independent
review of the hardened runner, rerun focused and full verification, then run a
unique final ten-entry matrix. Do not rewrite the historical six-entry
handoff; append a current ten-entry addendum only after fresh verification.

At checkpoint creation, the implementation was saved in the working tree and
the focused critical-runner plus CI contract run passed 18/18. Workspace lint,
typecheck and build were intentionally interrupted for the host restart. That
historical state is superseded by the final bounded verification below; the
checkpoint itself remains immutable evidence of the interruption.

## Final bounded reconciliation — 2026-08-28

The selected `CVG-OPS-CRITICAL-PROCESS-RUNNER-001` slice is reconciled as
`PASS_BOUNDED` with `HIGH` local confidence and `CRITICAL` residual risk. The
runner keeps the ten-entry manifest and now uses asynchronous shell-free child
execution, finite per-child budgets, typed failure classification, bounded
secret-safe diagnostics, retained failure artifacts and owned descendant
cleanup. POSIX uses detached process groups; Windows uses a suspended native
supervisor with Job Object kill-on-close, creation-identity-bound termination
and fail-closed tree verification.

TDD RED remains recorded before implementation. The post-patch focused runner
and CI contracts passed `31/31`; the Windows contract file passed as `5
skipped` on this Linux host. Syntax, targeted Prettier, `git diff --check` and
`pnpm security:secrets` passed. Full workspace `pnpm lint`, `pnpm typecheck`
and `pnpm build` passed; `pnpm validate:openapi` passed with 348 paths, 40
tags and 405 schemas.

The final disposable PostgreSQL matrix used a unique suffix and passed all
`10/10` manifest entries, including PIX `25/25`, worker runtime and webhook.
Each per-entry ephemeral database was removed; the post-run database query,
artifact-root check and owned-process check found no residual runner state.
Global parity/readiness remain explicitly non-promoting: general parity `4/11`,
clinical parity `2/3`, enterprise readiness `95/100` (`42 PASS`, `3 WARN`,
`1 FAIL`) and promotion `BLOCKED`.

The first fresh review found and drove closure of concrete Windows race,
deadline and exit-code issues. The final compatible independent review returned
`APPROVE_BOUNDED` with no remaining P0/P1/P2 finding. No product semantics,
provider, target, production, deployment, commit, push or external mutation
was performed.

Evidence: `.agent/gates/verified-CVG-OPS-CRITICAL-PROCESS-RUNNER-001.json`,
`.agent/artifacts/CVG-OPS-CRITICAL-PROCESS-RUNNER-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-OPS-CRITICAL-PROCESS-RUNNER-FINAL-001`.

## Post-restart final4 verification addendum — 2026-08-28

After the host-restart checkpoint, the current code was revalidated with the
combined runner and CI contract suite: `31/31` passed (`24/24` runner and
`7/7` CI). The Windows contract suite remained `5 skipped` with exit `0` on
this Linux host; its native path remains exercised by the `windows-2022` CI
job. The fresh unique final4 disposable matrix completed all `10/10` serial
manifest entries, including PIX `25/25`; every per-entry ephemeral database
was cleaned. Post-run PostgreSQL, artifact-root and owned-process checks were
empty, and `git diff --check` passed.

This addendum supersedes the earlier final3 command as the freshest local
process evidence. The bounded runner remains `PASS_BOUNDED`; global ERP stays
`IN_PROGRESS/PARTIAL`, general parity `4/11`, clinical parity `2/3`, readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion `BLOCKED`. No product,
provider, target, production, deployment, commit, push or external mutation
was performed.
