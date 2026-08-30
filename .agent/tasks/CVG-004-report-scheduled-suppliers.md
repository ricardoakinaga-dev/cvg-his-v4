# CVG-004 — bounded scheduled suppliers registry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-SUPPLIERS-IR-001`

## Objective

Close only the missing scheduled-worker source for the existing read-only
`registration-suppliers` report. The on-demand supplier/expense registry
contract is already bounded separately; this slice adds a shared,
tenant-scoped persisted source and the real worker run-once proof.

## Frozen contract

1. The schedule report id is `registration-suppliers`, and the worker returns
   exactly the catalog fields `code`, `name`, `kind`, `category`,
   `costCenterCode`, `costCenterName`, `description`, `createdAt` and
   `updatedAt`. The source maps the persisted catalog item id to `code`.
2. The source is read-only and uses only persisted
   `finance_expense_catalog_items` through a shared financial-module source.
   The schedule account is the only tenant authority and must be applied as
   both explicit tenant database context and source predicate. No
   client-provided or cross-account identifier is accepted.
3. Only the existing filters `search`, `category`, `costCenterCode`,
   `dateFrom` and `dateTo` are accepted. String filters are strict strings of
   at most 200 Unicode characters; dates are strict ISO calendar dates,
   inclusive against persisted `createdAt` in UTC. Inverted ranges fail
   closed. Ordering is deterministic by `name ASC, id ASC`.
4. The database source reads at most 10,001 rows and rejects more than 10,000
   with no empty-success fallback. Foreign-account, missing, malformed or
   non-canonical persisted output fails closed before scheduled execution is
   persisted. The resolver forwards only the frozen filters and exact
   nine-field mapping.
5. Existing durable schedule execution/export audit, recipient handling,
   delivery and one-shot failure semantics remain unchanged. Audit payloads
   contain report/execution/export identity, format and recipient count only;
   supplier names, descriptions, cost-center names and row data are not
   logged. The continuous worker keeps its existing tick-and-continue path.
6. Migration `0146_finance_catalogs.sql` and its account RLS/FORCE RLS are
   already present and are not changed by this slice. No supplier master,
   CRUD, contact, tax, payment, obligation, provider, target, production,
   deployment, backfill, external action or release acceptance is authorized.

## TDD acceptance

### RED

- The financial-module source test rejects the missing shared source and
  freezes explicit tenant SQL, all five filters, inclusive UTC dates,
  deterministic ordering, exact projection and the 10,001-row guard.
- The worker runner test rejects the absent `registration-suppliers` branch,
  invalid filters, foreign/malformed/oversized source output and any mapping
  outside the exact nine catalog fields.
- The real process test is extended before implementation for two-account
  schedules, search/category/cost-center/date filtering, exact rows,
  inverse-account isolation, durable non-PII audit and one-shot failure
  behavior.

### GREEN

- The shared financial source, worker resolver/bootstrap wiring and exact
  nine-field mapping pass focused tests.
- Financial module and worker builds/typechecks and the full worker regression
  suite pass.
- Disposable PostgreSQL run-once evidence proves two-account isolation,
  strict filters, inclusive UTC date bounds, deterministic order,
  overflow/malformed fail-closed behavior and durable schedule
  execution/export audit.
- A fresh independent read-only review and final hygiene are completed before
  bounded reconciliation.

## Explicit non-claims

This closes only the local scheduled `registration-suppliers` read path. It
does not establish complete Vetus supplier parity, a supplier master, tax or
payment semantics, provider delivery, target authorization, distributed
operations, accessibility, operational LGPD, remote CI, backup/restore,
coverage or release readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-suppliers.json`
- `.agent/gates/verified-CVG-004-report-scheduled-suppliers.json`
- `.agent/artifacts/CVG-004-report-scheduled-suppliers-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-SUPPLIERS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-PROCESS-002`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-FINAL-001`

## Revalidation triggers

- Changes to finance catalog schema, item identity, cost-center relations or
  account RLS/FORCE RLS.
- Changes to worker bootstrap, schedule claiming, report execution/export,
  delivery/audit or one-shot failure behavior.
- Any expansion to supplier master, CRUD, search semantics, fiscal/payment
  meaning, provider delivery or another registry report.

## Reconciled result

The scheduled `registration-suppliers` worker path is closed as
`PASS_BOUNDED`, with `MEDIUM` confidence and `HIGH` residual risk. The
financial module passed `24/24`, the configured worker suites passed (runner
`43/43`, bootstrap `20/20`, account discovery `7/7`, consumer composition
`2/2`, report identity `8/8`, scheduled-job `3/3` and PIX settlement `17/17`),
and the post-format disposable PostgreSQL process passed `21/21`.

The source and resolver preserve the exact nine-field catalog contract,
explicit tenant context and predicate, strict filters, inclusive UTC dates,
deterministic ordering, the 10,000-row fail-closed bound, malformed/foreign
rejection and non-PII audit semantics. Migration `0146_finance_catalogs.sql`
was reused and not changed.

The independent review attempt timed out and was shut down without a verdict;
it remains a condition and is not approval. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity is `4/11`, clinical parity is `2/3`,
readiness is `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion remains
`BLOCKED`. Any next slice requires fresh scouting and a new implementation-ready
authority; revalidate before scope expansion.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-suppliers.json`,
`.agent/artifacts/CVG-004-report-scheduled-suppliers-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-SUPPLIERS-FINAL-001`.
