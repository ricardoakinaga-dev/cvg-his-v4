# CVG-004 — scheduled bounded deleted-sales report source

**Status:** PASS_BOUNDED; parent CVG-004 remains IN_PROGRESS/PARTIAL.
**Stage/activity:** VERIFY / RECONCILE
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** T3_SYSTEM / HIGH / CROSS_SYSTEM
**Authority:** AUTH-CVG-004-REPORT-SCHEDULED-DELETED-SALES-IR-001; no target,
provider, credential, production or release authority is implied.

## Objective

Close the worker source drift for the already verified bounded
commercial-deleted-sales report. Scheduled execution must read the same
persisted current cancelled counter-sale snapshot as the on-demand API report,
with tenant isolation and fail-closed bounds.

## Frozen contract

1. The report id is commercial-deleted-sales. Its source is only the
   authenticated schedule account's persisted counter_sales through the
   existing CounterSalesService.listPersisted path. An in-memory source is
   rejected.
2. The grain and fields are exactly the on-demand bounded report:
   number, status, ownerId, openedByUserId, createdAt, updatedAt, total,
   discountAmount, paidAmount, balanceDue and notes. Current status is
   cancelled. createdAt is the opening date; cancellation history is not
   inferred.
3. search is trimmed, lower-cased and capped at 200 characters. dateFrom and
   dateTo are strict ISO calendar dates, inclusive on persisted createdAt, and
   inverted periods fail before the source read. The worker requests the
   existing 10,001-row bound and rejects more than 10,000 rows.
4. The worker defensively rechecks account, current status, period and search
   semantics after the source call, then hands the rows to the existing
   ReportsService scheduled execution. This slice proves row resolution and
   persisted execution; it does not add an external delivery provider.
5. Two real one-shot worker processes must run schedules for two accounts and
   prove that each persisted report execution contains only its own cancelled
   counter-sale.
6. No migration, cancellation history, fiscal write, provider call,
   credential handling, target, production, deployment, backfill or release
   acceptance is authorized.

## TDD acceptance

### RED

- Worker resolver tests fail because commercial-deleted-sales has no source.
- Invalid periods, overlong search, in-memory source and oversized rows fail
  closed before execution.
- The process test fails until two-account schedules persist the expected
  rows without cross-tenant data.

### GREEN

- Worker unit tests prove exact filter forwarding and 11-field mapping.
- Disposable PostgreSQL process evidence proves two-account isolation and
  persisted report executions through the real run-once entrypoint.
- No external email/provider call is required; recipients remain empty in the
  process proof.

### REGRESSION

- Worker package tests, relevant builds, workspace coverage and global
  validators remain within the repository bar.
- The global Vetus/clinical parity, provider, target, restore/RTO-RPO,
  distributed operations, accessibility, LGPD, remote CI and release gates
  remain open unless independently reverified.

## Review boundary

The independent scout confirmed that the on-demand contract is already
PASS_BOUNDED and that only the worker resolver/bootstrap source is missing.
A fresh independent review must inspect the implementation and process proof
before reconciliation as PASS_BOUNDED.

## Verification and reconciliation

The worker now resolves `commercial-deleted-sales` only through the
database-backed `CounterSalesService.listPersisted` source composed by
`createDatabaseReportSources`. It forwards the normalized search and
inclusive opening-date filters, requests 10,001 rows to detect overflow,
rejects more than 10,000, defensively rechecks account/status/period/search,
and maps exactly the eleven on-demand fields. The existing
`ReportsService` scheduled execution path remains responsible for persisting
the report execution; this slice keeps recipients empty and does not add an
external delivery call.

TDD and fresh evidence passed:

- Intentional RED was observed before implementation: the resolver rejected
  `commercial-deleted-sales` because the worker source branch was absent.
- Worker resolver tests: 33/33, including normalized filter forwarding,
  invalid ISO period, overlong search, in-memory source and oversized-source
  fail-closed cases.
- Full worker package suites/build: runner 33/33, bootstrap 20/20, account
  discovery 7/7, consumer composition 2/2, worker identity 8/8,
  scheduled-report job 2/2 and PIX settlement 17/17.
- Disposable PostgreSQL process proof: 1 selected test passed, with 15
  unrelated tests skipped by the selector. Two real one-shot worker
  processes ran due schedules for two accounts and each persisted only its
  own cancelled sale; no recipient/provider was invoked.
- Workspace coverage passed with 170 test files, 2,038 tests passed and 1
  skipped: statements 80.60%, branches 80.07%, functions 87.64% and lines
  80.60%.
- OpenAPI, RLS, migration-source, deploy-surface, static Helm, secrets,
  Prettier, `git diff --check` and the empty-index boundary passed. Strict
  Vetus parity tests passed 4/4; the report-only parity audit, clinical
  parity and enterprise readiness remain intentionally open.
- Independent re-review returned `APPROVE_BOUNDED` after a stale test typing
  finding was corrected. No other material finding remained in this scope.

The bounded result is reconciled as `PASS_BOUNDED` with residual risk
`HIGH`. It closes only the scheduled read path for the current persisted
cancelled counter-sale snapshot. It does not create cancellation history or
infer cancellation time/actor/reason, and it does not certify exact Vetus
dynamic-executor parity, production operations or release readiness.

## Global non-promotion

CVG-004 and the global ERP remain `IN_PROGRESS/PARTIAL`; promotion is
`BLOCKED`. Live Vetus parity remains `NOT VERIFIED` at 4/11 areas and
100/100 evidence coverage; clinical parity remains `NOT VERIFIED` at 2/3;
enterprise readiness remains 95/100 with 42 PASS, 3 WARN and 1 FAIL.
Provider/municipality homologation, fiscal writes, financial/bank
reconciliation, remaining report families and worker deliveries, target RLS
and roles, backup/restore and RTO/RPO, Redis/continuous distributed
operations, accessibility, operational LGPD, remote CI, deployment,
credentials and release acceptance remain open. No provider, target,
staging, production, credential, commit, push or external state was changed.
