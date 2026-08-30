# CVG-004 — scheduled financial-receivables report through the worker

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent read-only review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-RECEIVABLES-IR-001`

## Objective

Close the repository-local worker gap for the existing read-only
`financial-receivables` report. The catalog and authenticated on-demand API
already expose the persisted encounter receivable facts, while the scheduled
worker currently rejects this cataloged report because no worker source branch
is composed.

## Frozen bounded contract

1. Preserve the existing ReportsService catalog and on-demand API contract:
   `financial-receivables` remains a `billing.read` report with exactly these
   sixteen output columns: `patientName`, `ownerName`, `patientSpecies`,
   `encounterId`, `installmentNumber`, `installmentLabel`, `issuedAt`,
   `dueAt`, `settledAt`, `amountOriginal`, `amountPaid`,
   `amountOutstanding`, `status`, `financialStatus`, `encounterStatus` and
   `paymentCount`.
2. Add a shared read-only financial-module source, not an API-to-worker
   import, over the persisted `encounter_receivables`,
   `encounter_financial_accounts`, `encounters`, `patients`, `owners` and
   `encounter_receivable_payments` tables. The query must derive account scope
   from the claimed schedule, use explicit same-account joins, select only
   required fields and return no source row outside that account.
3. The worker forwards only validated schedule filters. `status` accepts
   `open` or `settled`; `search` is trimmed and limited to 200 UTF-8
   characters over patient, owner, installment label and notes; `dateFrom`
   and `dateTo` are strict ISO calendar dates and inclusive. The report date
   is `settledAt` for settled rows, `dueAt` for open rows, with
   `issuedAt` as the null fallback. Inverted dates fail before querying.
4. The source and resolver enforce a maximum of 10,000 rows by requesting
   10,001 and failing closed before `ReportsService.execute` persists an
   execution. The worker maps exactly the sixteen catalog columns and does not
   log names, documents, notes, payment details or full source rows.
5. A missing source, invalid persisted status, invalid persisted financial or
   encounter state, unavailable table/source and unknown report id fail closed.
   The scheduled job records `lastError` and does not create an execution,
   export or delivery containing an empty substitute. The one-shot entrypoint
   returns a non-zero exit code when the scheduled tick reports any failure;
   the continuous worker keeps its existing tick-and-continue behavior.
6. A real one-shot worker process against disposable PostgreSQL proves one
   due schedule for each of two accounts, exact row mapping, inclusive date
   and search/status filters, cross-account negatives, the overflow boundary,
   durable execution/export/audit and the existing retry/lease behavior. The
   schedule fixture uses empty recipients unless delivery behavior is part of
   an existing regression.
7. This slice is read-only. It does not authorize receivable settlement,
   cash/bank/PIX, journal posting, provider delivery, migrations, target,
   production, deployment, backfill, credentials, external Vetus operation,
   accessibility acceptance or release readiness. Existing on-demand API and
   SPA behavior remain regression-only and are not promoted by this task.

## TDD acceptance

### RED

- Worker resolver tests fail before implementation because the
  `financial-receivables` source branch and exact sixteen-column mapping are
  absent.
- Tests reject missing source, invalid status/search/date/inverted filters,
  foreign-account source rows, malformed persisted status, non-canonical
  output keys and a result over 10,000 rows.
- The real process test rejects the current unsupported-source behavior and
  requires a persisted receivable schedule to produce a completed execution
  with exact rows; it does not insert an outbox/report execution as the
  behavior under test.

### GREEN

- The financial module exports the bounded tenant-aware source and the worker
  bootstrap composes it without importing API repositories or in-memory
  fallback data.
- Focused worker/source tests and the real disposable PostgreSQL one-shot
  process proof pass with two-account isolation, PII-safe logs and durable
  report execution/export/audit.
- Worker, financial module and API regressions, typecheck/build, OpenAPI,
  RLS/security, migration-source, deploy-surface, formatting and diff
  hygiene remain green.

### REVIEW

- A fresh independent read-only review is required after implementation.
- Review unavailability must be recorded as a limitation and never inferred
  as approval; global CVG-004, parity, operations and release remain open.

## Revalidation triggers

- Changes to encounter financial schema, entity joins, receivable status or
  report column semantics.
- Changes to worker bootstrap, schedule claiming, report execution/export,
  actor identity or delivery retry behavior.
- Any expansion to receivable writes, cash/journal/provider flows, target
  operations or release acceptance.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-receivables.json`
- `packages/modules/financial/src/receivables-report.ts`
- `packages/modules/financial/src/receivables-report.test.ts`
- `apps/worker/src/runner.test.ts`
- `tests/integration/process/worker-run-once-reports.test.ts`
- `.agent/artifacts/CVG-004-report-scheduled-receivables-2026-08-28.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-RECEIVABLES-FINAL-001`

## Reconciled result

The bounded implementation and real process proof passed. The financial
module regression is `20/20`, the worker package suites are green, and the
disposable PostgreSQL one-shot process is `19/19`. The final independent
read-only review returned `PASS` with no scoped Critical/High/Medium finding.

The result closes only the scheduled read-only worker path. Keep CVG-004/global
ERP `IN_PROGRESS/PARTIAL` with promotion `BLOCKED`; revalidate before changing
receivable lifecycle semantics, actor/audit behavior or expanding to another
report family.
