# CVG-OPS — Critical baseline regression repair

**Status:** VERIFY / COMPLETE_BOUNDED / PASS_BOUNDED  
**Priority:** P1  
**Owner:** root integrator  
**Date opened:** 2026-08-31

## Objective

Restore the repository's official critical integration baseline after the
latest application/migration contracts changed. This bounded slice covers
only stale test fixtures and assertions; production behavior, schema and
migrations remain unchanged.

## Authorized scope

- Align the worker event-consumer assertion with the explicit account
  mismatch rejection contract of `DatabaseOutboxRepository`.
- Give inpatient close/receipt and discharge fixtures distinct patients for
  distinct encounters/stays so migration `0151`'s one-active-encounter rule
  is respected.
- Make the PIX service-principal legacy-column simulation remove and restore
  the migration `0155` authorization trigger inside its existing rollback
  transaction.
- Align the inpatient receipt idempotency assertion with the route's
  canonical operation name.
- Run focused and official critical regression evidence and reconcile this
  control-plane slice without promoting global ERP readiness.

## Explicit exclusions

- No production source, schema, migration, RLS policy, repository SQL,
  deployment or runtime configuration changes.
- No weakening of tenant, idempotency, active-encounter or authorization
  contracts to make tests pass.
- No target, production, provider, credential, remote-CI or release claim.

## Quality bar

Close only when the focused four-file regression is green, the official
`test:critical` base and process phases are green or have an explicitly
documented external blocker, formatting/diff hygiene passes, and an
independent review confirms that the fixture changes preserve the
authoritative contracts. Global ERP remains `IN_PROGRESS/PARTIAL` and
promotion remains `BLOCKED`.

## RED evidence

- Before the bounded fixture/assertion correction, the official base phase
  reported 542 passed, 1 failed and 13 skipped across 57 files; three files
  failed during setup or legacy DDL cleanup.
- The isolated worker contract reported 5/6 before the explicit mismatch
  rejection assertion was corrected.

## Closure evidence — 2026-08-31

- Focused inpatient close/receipt, inpatient discharge, PIX service-principal
  and worker suites passed 19/19 after the bounded changes. The isolated worker
  contract also passed 6/6 with the explicit administrative-account mismatch
  rejection.
- The official critical base phase passed 57/57 files and 556/556 tests. The
  ephemeral database was dropped by the test teardown.
- The official critical process phase passed all 10 serial entries with
  `DATABASE_URL_TEST` supplied as required by the runner; every per-entry
  ephemeral database was dropped and the command exited 0.
- The independent read-only review of all four test diffs found no in-scope
  Critical, High or Medium finding. Formatting and `git diff --check` passed.

## Residuals

This task does not prove target PostgreSQL/Redis, real backup and restore,
remote CI, cutover, providers, production observability or complete Vetus
parity. Those remain global release blockers and are not inferred from local
test success.

## Non-promotion and worktree policy

This is a bounded test-compatibility closure only. No production source,
schema, migration, RLS, deployment or runtime behavior was changed. Global ERP
readiness remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`. No
commit or push was performed; the mixed dirty worktree, including unrelated
prior changes, remains preserved for owner review.

Closure evidence: `.agent/gates/verified-CVG-critical-regression-baseline-repair.json`,
`.agent/artifacts/CVG-CRITICAL-regression-baseline-repair-2026-08-31.md`,
`.agent/verification.jsonl#VFY-CVG-CRITICAL-REGRESSION-BASELINE-REPAIR-FINAL-001`,
`.agent/verification.jsonl#VFY-CVG-CRITICAL-REGRESSION-BASELINE-REPAIR-REVIEW-001`,
and `.agent/verification.jsonl#VFY-CVG-CRITICAL-REGRESSION-BASELINE-REPAIR-CONTROL-PLANE-001`.
