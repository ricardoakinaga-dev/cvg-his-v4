# CVG-004 — scheduled financial-payables report source

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent read-only review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-PAYABLES-IR-001`

## Problem

The ReportsService catalog and API already expose `financial-payables` from
the tenant-scoped financial subledger, but the scheduled-report worker has no
payables source. A persisted schedule therefore falls through the resolver's
generic empty-array path and can be marked successful with an empty report.
The same fallback silently masks other cataloged report IDs without worker
sources.

## Frozen contract

1. The existing `financial-payables` catalog and audited scheduled-report
   execution/export path remain the public contract. This slice adds only the
   worker source required to resolve its persisted rows.
2. The worker composes `DatabaseFinancialPayablesRepository` through the
   existing `@cvg-his-v2/module-financial` boundary. The source receives the
   claimed schedule's account id and may return only persisted payable facts;
   it must not import an API repository or derive supplier/settlement facts.
3. `status` accepts only `open`, `partial`, `paid` or `cancelled`; `search`
   uses the same normalized supplier/description/category/cost-center/notes
   fields as the API; `dateFrom` and `dateTo` are strict ISO calendar dates
   applied inclusively to the persisted `dueAt` fact. Invalid or inverted
   filters fail before execution.
4. Rows contain exactly the catalog columns: `supplierName`, `description`,
   `category`, `issuedAt`, `dueAt`, `totalAmount`, `paidAmount`,
   `outstandingAmount`, `status`, `paymentMethod` and `reconciliationStatus`.
   No report value is inferred from a different table or from timestamps.
5. A known report without a configured worker source, and an unknown report
   id reaching the resolver, fail closed with an explicit error. The worker
   records `lastError` and does not create an execution, export or delivery
   containing an empty substitute.
6. A real `run-once` process against disposable PostgreSQL proves a due
   `financial-payables` schedule reads the persisted tenant-scoped payable,
   honors filters and stores the exact mapped rows. Existing lease,
   idempotency, delivery and retry behavior remains unchanged.
7. No migration, payable write lifecycle, provider, credential, target,
   production, deployment, external mutation or global parity/release claim
   is authorized by this slice.

## TDD acceptance

### RED

- The worker resolver tests fail before implementation because the payables
  source contract and `financial-payables` branch are absent.
- The resolver tests reject absent sources, invalid status/search/date filters,
  inverted dates, foreign-account rows and non-canonical output fields.
- The real process test rejects the current empty-success behavior by requiring
  a persisted payable row and a completed execution with exact rows.
- The process test proves a cataloged but unsupported report fails with
  `lastError` and no execution or delivery.

### GREEN

- `DatabaseFinancialPayablesRepository` is composed in worker bootstrap and the
  resolver forwards account/status while applying strict date/search semantics
  plus a defensive account/status check on returned facts.
- Focused worker tests and the real one-shot PostgreSQL process test pass.
- Worker typecheck/build, package regression, API report regression, security
  checks and diff hygiene pass; no external provider is contacted.

## Explicit non-claims

This closes only scheduled resolution of the existing financial-payables
report. It does not close scheduled advance-payment, receivable, registration,
personalized or remaining report families; it does not certify the full Vetus
report journey, worker failure injection, target RLS, provider delivery,
operations, accessibility, coverage, production readiness or release.

## Scope clarification from independent review

The pre-existing `administrative-executive` branch is intentionally outside
the missing-source guarantee in this slice. It has a built-in schedule-control
source (recipient, active-state and last-failure rows); optional operational
enrichments report an explicit `Fonte indisponivel` attention row when their
source call fails. Those diagnostic rows are not persisted business facts and
are not the empty substitute removed here for `financial-payables`, cataloged
unsupported ids and unknown ids. Hardening that administrative availability
policy is a separate report-family decision.

## Revalidation triggers

- Changes to the financial-payables schema, repository mapping or API filter
  semantics.
- Changes to report catalog columns, schedule claiming, worker bootstrap or
  delivery retry behavior.
- Expansion to another scheduled report family, a write lifecycle, a provider,
  target operation or a release decision.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-payables.json`
- `.agent/artifacts/CVG-004-report-scheduled-payables-2026-08-27.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-UNIT-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-PAYABLES-FINAL-001`
