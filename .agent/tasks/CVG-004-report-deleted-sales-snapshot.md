# CVG-004 — bounded cancelled-sales snapshot and export

**Status:** `VERIFY`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `BUILD` / `VERIFY`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `AUTH-CVG-004-REPORT-DELETED-SALES-SNAPSHOT-IR-001`; no target,
provider or production authority is implied.

## Objective

Close the repository-local Reports Workbench gap for a bounded, read-only
snapshot of persisted counter-sales whose current status is `cancelled`.
This is an operational state report, not a historical cancellation ledger and
not a claim of Vetus report parity.

## Frozen contract

1. The report catalog exposes `commercial-deleted-sales`. The existing SPA key
   `deleted-sales-counter-sales` maps to that server report id, and the report
   requires `billing.read` at the Reports boundary plus `counter_sale.read` at
   the definition boundary.
2. The only source is the authoritative database-backed `counter_sales`
   repository for the authenticated principal's account. The source filters
   `status = cancelled`, optional search over number/notes, and the calendar
   period against persisted `createdAt` (opening date). In-memory fallback is
   rejected.
3. Exposed fields are only persisted facts: number, current status, owner id,
   opening user id, opening timestamp, last-update timestamp, amounts and notes. The contract
   must not relabel `updatedAt` as cancellation time or infer cancellation
   actor, reason, event provenance or deletion history.
4. Date input is strict ISO calendar date, `dateTo` is inclusive, search is
   trimmed and capped at 200 characters, and inverted periods fail before the
   source is read. Repository reads use parameterized SQL, deterministic
   `created_at DESC, id DESC` ordering and a bounded `LIMIT 10.001`; more than
   10,000 matching rows fail closed before report persistence.
5. Execution and CSV export use the existing ReportsService persistence and
   audit path. The complete filtered execution, not only visible UI rows, is
   exported, and existing CSV formula neutralization remains active.
6. The SPA remains read-only, documents the opening-date/last-update
   semantics and unavailable cancellation facts, supports bounded search and
   invokes audited server-side execution/export. It must show loading, error
   and empty states without retaining an unsafe local substitute.
7. No migration, cancellation-lifecycle redesign, audit schema change,
   provider, credential, target, deployment, production, external Vetus
   operation, data backfill or release acceptance is authorized by this slice.
   `service-invoices` remains blocked until fiscal persistence is wired to the
   reports runtime and its document/service grain is defined.

## TDD acceptance

### RED

- Reports catalog tests reject the absent `commercial-deleted-sales`
  definition, permission, filter schema and persisted-field columns.
- Counter-sales service tests reject a repository call that omits period and
  bounded-read filters.
- API route tests reject absent source composition, invalid periods/search,
  oversized results and missing persisted status filtering; they also require
  account-scoped source arguments and audited export.
- SPA tests reject the old local list/disabled export path and require the
  server report id, bounded row mapping and export request.

### GREEN

- Module, service and API route tests pass with the database-backed source,
  tenant account argument, strict filters, formula-safe CSV and row bound.
- A disposable PostgreSQL integration test passes the SQL period boundary,
  deterministic order and cross-account isolation.
- SPA Workbench tests, `vue-tsc --noEmit`, API/module builds and SPA build pass.
- The official Docker SPA runner proves browser authentication, creation and
  cancellation of a disposable sale, persisted report search and audited CSV
  export.

### REGRESSION

- Existing root/API/SPA suites and official coverage remain green at or above
  the repository's 80% threshold.
- OpenAPI, RLS, secrets, migration-source, deploy-surface, formatting and
  diff hygiene controls remain green.
- Global Vetus parity, clinical parity, provider/homologation, target,
  restore/RTO-RPO, distributed operations, accessibility, LGPD operations,
  remote CI and release gates remain explicitly open unless independently
  reverified.

## Review boundary

The implementation is limited to the first feasible Reports placeholder.
Available Vetus evidence confirms the legacy report name/URL but not its
filters, columns, grain or export semantics, so no legacy-parity claim is
made. A fresh independent review must inspect the current diff before this
task can be reconciled as `PASS_BOUNDED`.

## Verification result — 2026-08-27

Status: `PASS_BOUNDED`, residual risk `HIGH`.

The bounded persisted cancelled-counter-sale snapshot/export passed focused
TDD, API/RBAC, disposable PostgreSQL, official SPA browser, workspace
regression, coverage, validators and hygiene checks. The independent review
returned `APPROVE_BOUNDED` with no material finding remaining in this
contract.

Evidence:

- `.agent/gates/verified-CVG-004-report-deleted-sales-snapshot.json`
- `.agent/artifacts/CVG-004-report-deleted-sales-snapshot-2026-08-27.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-DELETED-SALES-SNAPSHOT-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-DELETED-SALES-SNAPSHOT-POST-FORMAT-001`

The slice remains limited to the current `counter_sales.status = cancelled`
snapshot, filtered by opening `createdAt`. It does not close cancellation
history, `service-invoices`, fiscal/provider behavior, external Vetus, target,
production, deployment, restore/RTO-RPO, accessibility, LGPD operations,
remote CI or release. `CVG-004` and the global ERP remain
`IN_PROGRESS/PARTIAL`; promotion is blocked.
