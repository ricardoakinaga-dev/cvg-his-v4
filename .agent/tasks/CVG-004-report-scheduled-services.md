# CVG-004 — bounded scheduled services registry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-SERVICES-IR-001`

## Objective

Close only the repository-local scheduled worker source gap for the existing
read-only `registration-services` report. The on-demand catalog/API and SPA
contract are already bounded separately; this slice adds the worker-side
tenant-scoped persisted source and real run-once proof.

## Frozen contract

1. The schedule report id is `registration-services`, and the worker returns
   exactly the catalog fields `code`, `name`, `description`, `basePrice`,
   `status` and `createdAt`. Null code/description become blank cells and
   persisted `active` maps only to `active` or `inactive`.
2. The source reads only the persisted `services` relation through a shared
   services-module database source. The account is the schedule account and
   must be applied both as an explicit tenant database context and as the
   source predicate. No client-provided account is accepted.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against
   the stored `createdAt` fact in UTC, with deterministic `createdAt` then
   service-id ordering. Inverted ranges, malformed filters, malformed persisted
   rows and foreign-account rows fail closed before execution is persisted.
4. The database source reads at most 10,001 rows and rejects more than 10,000
   with no empty-success fallback. The resolver passes only the frozen filters
   and exact six-field mapping to the existing scheduled ReportsService job.
5. Existing durable schedule execution/export audit and one-shot non-zero
   failure behavior remain in force. Audit payloads contain report identity,
   execution/export identity, format and recipient count only; service names,
   descriptions and other row data are not logged.
6. The continuous worker keeps its existing tick-and-continue behavior. This
   slice does not change report scheduling, delivery providers, retries or
   on-demand API/SPA behavior except for regression coverage.
7. No migration, CRUD, supplier/owner/patient/administrative report expansion,
   provider, credential, target, production, deployment, backfill, external
   system action or release acceptance is authorized.

## TDD acceptance

### RED

- The services-module source test rejects the missing shared database source
  and freezes explicit tenant SQL, date filtering, deterministic order and the
  10,001-row guard.
- The worker runner test rejects the absent `registration-services` branch,
  invalid dates, inverted intervals, missing/oversized/foreign sources and
  non-canonical output.
- The real process test is extended before implementation for two-account
  schedules, exact rows, inverse-account isolation, durable non-PII audit and
  one-shot failure behavior.

### GREEN

- The services source, worker resolver/bootstrap wiring and process fixture pass
  their focused tests.
- Module and worker builds/typechecks and the full worker regression suite pass.
- Disposable PostgreSQL run-once evidence proves two-account source isolation,
  exact six-field rows, inclusive UTC date bounds, overflow fail-closed behavior
  and durable schedule execution/export audit.
- Independent read-only review and final hygiene are required before closure.

## Explicit non-claims

This closes only the local scheduled `registration-services` read path. It does
not establish complete Vetus registry parity, supplier/owner/patient scheduled
reports, administrative-executive semantics, provider delivery, target
authorization, distributed operations, accessibility, operational LGPD, remote
CI, backup/restore, coverage or release readiness.

## Revalidation triggers

- Changes to the `services` schema, service status/price semantics or tenant
  RLS policy.
- Changes to ReportsService scheduling, export/audit, worker identity or
  one-shot shutdown/exit behavior.
- Any expansion to search/status filters, CRUD, another registry report,
  provider delivery or target/production operations.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-services.json`
- `.agent/gates/verified-CVG-004-report-scheduled-services.json`
- `.agent/artifacts/CVG-004-report-scheduled-services-2026-08-28.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-FINAL-001`

## Reconciled result

The bounded scheduled `registration-services` worker path is closed as
`PASS_BOUNDED` with `MEDIUM` confidence and `HIGH` residual risk. The shared
services source, worker resolver/bootstrap wiring and exact six-field mapping
passed module `21/21`, worker `97/97` and the fresh disposable PostgreSQL
two-account process `20/20`. The process proof covered inclusive UTC date
selection, deterministic rows, inverse-account isolation, durable execution
and non-PII audit. Final secrets, formatting, diff and control-plane hygiene
also passed.

Independent review was attempted but unavailable: the explicit reviewer role
was rejected by the account model policy and compatible default reviewers
timed out before a verdict. This is recorded as
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SERVICES-REVIEW-UNAVAILABLE-001`
and remains a condition, never approval. Obtain a fresh independent review
before higher-confidence use or scope expansion.

General Vetus parity remains `4/11` verified, clinical parity `2/3` and
enterprise readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`). Keep CVG-004 /
global ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`; all providers,
target operations, distributed worker behavior, accessibility, operational
LGPD, remote CI, remaining parity and release acceptance remain open.
