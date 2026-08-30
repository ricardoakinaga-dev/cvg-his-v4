# CVG-004 — bounded scheduled patients registry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `RECONCILE` / `VERIFIED_BOUNDED`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-PATIENTS-IR-001`

## Objective

Close only the repository-local scheduled worker source gap for the existing
read-only `registration-patients` report. The catalog and on-demand API already
define the report; the worker currently has no persisted patient source or
resolver branch.

## Frozen bounded contract

1. The schedule report id is `registration-patients`, and the worker returns
   exactly the existing catalog fields `code`, `name`, `species`, `breed`,
   `sex`, `microchip`, `status` and `createdAt`. `code` uses the persisted
   Vetus legacy identifier when present and otherwise the patient identifier;
   nullable text is exported as an empty cell and status/sex use only the
   existing canonical values.
2. The source reads only the persisted `patients` relation under the claimed
   schedule account. It must use explicit tenant database context plus an
   account predicate, with no owner join, in-memory cache fallback or client
   supplied account. Existing patients-table RLS/FORCE-RLS rails are reused;
   no migration is authorized.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against
   persisted `created_at` in UTC, with deterministic `name ASC, id ASC` order.
   Inverted ranges, malformed filters, foreign-account rows and malformed
   persisted values fail closed before execution persistence.
4. The database query returns at most 10,001 rows and rejects more than 10,000.
   The worker revalidates account, exact source shape, dates and row bound
   before mapping the exact eight-field catalog projection.
5. Existing durable scheduled execution/export audit and one-shot failure
   semantics remain unchanged. Audit payloads contain report identity,
   execution/export identity, format and recipient count only; patient names,
   microchips and row data must not be logged.
6. This slice is read-only scheduled delivery only. It does not change patient
   CRUD, owner links, clinical encounters, on-demand API/SPA behavior, delivery
   providers, credentials, target, production, deployment, backfill, external
   systems or release acceptance.

## TDD acceptance

### RED

- The patients-module source test rejects the absent shared database source and
  freezes explicit tenant SQL, exact projection, strict dates, deterministic
  order and the 10,001-row guard.
- The worker runner test rejects the absent `registration-patients` branch,
  invalid dates, inverted intervals, missing/oversized/foreign sources and
  non-canonical output.
- The real process test is extended before implementation for two-account
  schedules, exact rows, inverse-account isolation, inclusive UTC dates,
  durable execution and non-PII audit.

### GREEN

- The patients source, worker resolver/bootstrap wiring and exact eight-field
  mapping pass focused tests.
- Module and worker builds/typechecks and the configured worker regression pass.
- Disposable PostgreSQL run-once evidence proves two-account isolation, exact
  rows, legacy-code fallback, inclusive UTC dates, overflow fail-closed
  behavior and durable schedule execution/export audit.
- An independent read-only review and final hygiene are completed before
  bounded reconciliation.

## Bounded result

The scheduled `registration-patients` worker path is closed as
`PASS_BOUNDED`, with `MEDIUM` confidence and `HIGH` residual risk. The source
reads only persisted `patients` facts through explicit tenant context and an
account predicate, uses an explicit projection, strict inclusive UTC dates,
deterministic `name ASC, id ASC` ordering and a 10,000-row fail-closed bound.
The worker validates the source again and emits exactly the eight catalog
fields, including the existing microchip field only in the report payload.

Patients module tests passed `55/55`, including `94.07%` statements/lines,
`90.41%` branches and `100%` functions for the new source. The configured
worker suites passed runner `49/49`, bootstrap `20/20`, account discovery
`7/7`, consumer composition `2/2`, report identity `8/8`, scheduled-job
`3/3` and PIX settlement `17/17`. The disposable PostgreSQL run-once process
passed `23/23`, including concurrent two-account patient schedules, legacy
code fallback, UTC date behavior, durable execution and audit redaction.
Prettier, `security:secrets`, `git diff --check` and empty-index hygiene
passed for the bounded scope.

The independent reviewer attempt timed out and was shut down without a
verdict; it is recorded as a condition, never approval. Global CVG-004/ERP
remains `IN_PROGRESS/PARTIAL`, general Vetus parity remains `4/11`, clinical
parity `2/3`, enterprise readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`)
and promotion remains `BLOCKED`.

## Explicit non-claims

This closes only the local scheduled `registration-patients` read path. It does
not establish complete Vetus patient parity, owner-link or clinical semantics,
target authorization, distributed-worker operations, provider delivery,
accessibility, operational LGPD, remote CI, backup/restore, coverage or release
readiness. Microchip is included only because it is already part of the exact
on-demand/catalog contract and is never written to audit logs.

## Revalidation triggers

- Changes to the patients schema, `alerts_json` metadata representation,
  patient/owner-link semantics or tenant RLS policy.
- Changes to report scheduling, worker identity, execution/export/audit or
  one-shot failure behavior.
- Any expansion beyond the existing eight-field scheduled patient projection,
  patient lifecycle, provider delivery or target/production behavior.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-patients.json`
- `.agent/gates/verified-CVG-004-report-scheduled-patients.json`
- `.agent/artifacts/CVG-004-report-scheduled-patients-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-PATIENTS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PATIENTS-FINAL-001`
