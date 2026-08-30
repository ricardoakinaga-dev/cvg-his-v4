# CVG-004 — bounded scheduled commission-calculations report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `RECONCILE` / `VERIFIED_BOUNDED`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-COMMISSIONS-IR-001`

## Objective

Close only the repository-local scheduled-worker source gap for the existing
read-only `commission-calculations` report. The catalog and API already define
the report, and the commission tables already persist calculation headers and
lines; the current worker path only reads a synchronous in-memory service
cache that is not hydrated by worker bootstrap.

## Frozen bounded contract

1. The schedule report id is `commission-calculations`, and the worker returns
   exactly `number`, `period`, `status`, `totalBaseAmount`,
   `totalCommissionAmount` and `lineCount`. `period` is the canonical
   `periodStart..periodEnd` representation from persisted calculation dates.
2. The source is read-only and uses only persisted
   `commission_calculations` headers plus same-account
   `commission_lines` for the line count. The schedule account is the only
   tenant authority and must be applied as explicit tenant database context
   and predicates on both tables. No staff, owner, patient, billing or
   client-provided account join is accepted.
3. Only the existing `status`, `dateFrom` and `dateTo` filters are accepted.
   Status is one of `draft`, `reviewed`, `paid` or `cancelled`; dates are
   strict ISO calendar dates. A date range selects calculations whose persisted
   period overlaps the requested interval (`periodEnd >= dateFrom` and
   `periodStart <= dateTo`). Inverted ranges fail closed.
4. The database query returns at most 10,001 grouped rows and rejects more
   than 10,000. Ordering is deterministic by persisted `created_at DESC,
id DESC`. Foreign-account, missing, malformed, non-canonical status,
   unsafe amount, invalid period or invalid line-count output fails closed
   before scheduled execution is persisted.
5. The resolver accepts an asynchronous persisted source, revalidates the
   exact row shape and account, applies only the frozen filters and maps the
   exact six catalog fields. Existing durable schedule execution/export audit,
   recipient handling, delivery and one-shot failure semantics remain
   unchanged; the continuous worker keeps its existing tick-and-continue
   path.
6. Existing commission schema/RLS migrations are reused. No migration,
   commission calculation/write lifecycle, payable/payment behavior, API/SPA
   changes, provider, target, production, deployment, backfill, external
   action or release acceptance is authorized.

## TDD acceptance

### RED

- The commissions-module source test rejects the absent shared source and
  freezes explicit tenant SQL, same-account line aggregation, status/period
  filters, deterministic order, explicit projection and the 10,001-row guard.
- The worker runner test rejects the absent persisted source, invalid filters,
  foreign/malformed/oversized source output and any mapping outside the exact
  six catalog fields.
- The real process test is extended before implementation for a persisted
  calculation schedule, line count, status/overlap filters, inverse-account
  isolation, durable non-PII audit and one-shot failure behavior.

### GREEN

- The shared commissions report source, worker resolver/bootstrap wiring and
  exact six-field mapping pass focused tests.
- Commissions-module and worker builds/typechecks and the full configured
  worker regression pass.
- Disposable PostgreSQL run-once evidence proves persisted calculations,
  same-account line counts, strict filters, period overlap, two-account
  isolation, overflow/malformed fail-closed behavior and durable schedule
  execution/export audit.
- A fresh independent read-only review and final hygiene are completed before
  bounded reconciliation. An unavailable reviewer remains a condition, not
  approval.

## Bounded result

The scheduled `commission-calculations` worker path is closed as
`PASS_BOUNDED`, with `MEDIUM` confidence and `HIGH` residual risk. The source
reads only persisted `commission_calculations` headers and same-account
`commission_lines`, applies explicit tenant context and predicates, strict
status/date-overlap filters, deterministic ordering and a 10,000-row
fail-closed bound. The worker validates the source again and emits exactly the
six existing catalog fields while preserving durable execution, export audit
and one-shot semantics.

Commissions module tests passed `18/18`, focused source coverage passed
`94.02%` statements/lines, `88%` branches and `100%` functions. Configured
worker suites passed runner `51/51`, bootstrap `20/20`, account discovery
`7/7`, consumer composition `2/2`, report identity `8/8`, scheduled-job
`3/3` and PIX settlement `17/17`. The disposable PostgreSQL run-once process
passed `24/24` with concurrent two-account isolation, filters, same-account
line counts, exact rows, durable execution and non-PII report payloads.
Prettier, `security:secrets`, `git diff --check` and empty-index hygiene
passed for the bounded scope.

The independent reviewer role was unsupported and the default-model fallback
returned no verdict within the bounded wait; this remains an explicit
condition, never approval. Global CVG-004/ERP remains `IN_PROGRESS/PARTIAL`,
general parity remains `4/11`, clinical parity `2/3`, enterprise readiness
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains `BLOCKED`.

## Explicit non-claims

This closes only the local scheduled `commission-calculations` read path. It
does not establish complete Vetus commission parity, commission rule or
calculation write semantics, payable/payment lifecycle, API/SPA behavior,
provider delivery, target authorization, distributed operations,
accessibility, operational LGPD, remote CI, backup/restore, coverage or
release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-commissions.json`
- `.agent/gates/verified-CVG-004-report-scheduled-commissions.json`
- `.agent/tasks/CVG-004-report-scheduled-commissions.md`
- `.agent/artifacts/CVG-004-report-scheduled-commissions-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-COMMISSIONS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-COMMISSIONS-FINAL-001`

## Revalidation triggers

- Changes to commission calculation/line schema, account RLS/FORCE-RLS or
  persisted amount/date/status semantics.
- Changes to worker bootstrap, schedule claiming, report execution/export,
  delivery, audit or one-shot failure behavior.
- Any expansion to commission writes, rules, payable/payment lifecycle,
  staff/patient joins, additional fields/filters, API/SPA or provider
  delivery.
