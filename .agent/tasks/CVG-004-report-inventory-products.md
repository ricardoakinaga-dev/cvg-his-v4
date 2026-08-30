# CVG-004 — server-backed inventory-products report

**Status:** PASS_BOUNDED; parent CVG-004 remains IN_PROGRESS/PARTIAL.
**Stage/activity:** VERIFY / RECONCILE
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** T3_SYSTEM / HIGH / CROSS_SYSTEM
**Authority:** AUTH-CVG-004-REPORT-INVENTORY-PRODUCTS-IR-001; no target,
provider, credential, production or release authority is implied.

## Objective

Replace the Reports Workbench's local-only `inventory-products` projection with
an authenticated, tenant-scoped, database-backed on-demand report execution and
audited export. The implementation must preserve the existing read-only
navigation while making the report's source and bounds explicit.

## Frozen contract

1. The report id is `inventory-products`, its required permission is
   `inventory.read` in addition to the existing `billing.read` Reports
   Workbench gate, and its grain is exactly one row per persisted
   `inventory_items` record belonging to the authenticated account.
2. The row schema is exactly these eight persisted fields, in this order:
   `sku`, `name`, `unit`, `onHandQuantity`, `reorderLevel`,
   `unitCostAmount`, `createdAt`, `updatedAt`. No lot, movement, invoice,
   derived valuation, status inference, or client-only field is part of this
   server contract.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against
   persisted `createdAt`; inverted periods fail before the source read.
   `search` is trimmed, case-insensitive over SKU/name, and capped at 200
   characters. The source requests 10,001 rows to detect overflow and the
   report rejects more than 10,000 rows.
4. The database repository uses parameterized tenant-scoped SQL with escaped
   search semantics and deterministic `name ASC, id ASC` ordering. The API
   defensively rechecks account, period and search semantics after the source
   call before mapping the exact eight fields.
5. An in-memory source fails closed. The existing ReportsService remains the
   execution, audit and export boundary; the SPA consumes the server execution
   and does not reconstruct rows from `/inventory` or `/inventory/lots`.
6. This slice is on-demand API/SPA only. Scheduled worker resolution for this
   report, historical/as-of stock, valuation/reconciliation, providers,
   fiscal writes, migration/backfill, target, production, deployment and
   release acceptance are explicitly outside the authority.

## TDD acceptance

### RED

- Reports catalog and API tests fail before the new definition/source branch
  exists.
- Inventory source tests fail before the persisted query method exists.
- SPA test fails while the Workbench still loads local item/lot projections.

### GREEN

- Inventory unit tests prove database-only source behavior, normalized
  filters, defensive account/search/createdAt filtering and the overflow
  detection bound; in-memory mode fails closed.
- API route tests prove permission/catalog exposure, exact eight-field mapping,
  strict filters and the 10,000-row bound.
- SPA tests prove server execution/filter forwarding, exact row validation and
  the absence of local inventory/lot loading for this report.
- Disposable PostgreSQL integration proves two-account isolation, inclusive
  createdAt filtering, deterministic ordering and overflow behavior against
  the real repository/RLS context.

### REGRESSION

- Focused module/API/SPA/build checks, workspace coverage and repository
  validators remain within the established bar.
- The global Vetus/clinical parity, fiscal/provider, target/restore/RTO-RPO,
  distributed worker, accessibility, operational LGPD, remote CI and release
  gates remain open unless independently reverified.

## Verification and reconciliation

The bounded contract is implemented and locally reconciled as PASS_BOUNDED with
HIGH residual risk. The API and SPA use the same database-backed persisted
`inventory_items` source; ReportsService remains the execution, export and audit
boundary. The report rejects in-memory inventory, validates strict filters,
detects more than 10,000 rows through a 10,001-row read, and maps only the
eight frozen fields. The SPA no longer reconstructs this report from
`/inventory` or `/inventory/lots`.

TDD RED was observed before the catalog/source/API/SPA branches were added.
GREEN and regression evidence passed: inventory unit tests 27/27, reports
module tests 19/19, compiled API package tests 442/442, SPA tests 1,040/1,040,
inventory/reports/API builds and SPA `vue-tsc` passed, and workspace coverage
passed with 170 files, 1 skipped, 2,042 tests passed and 1 skipped at 80.65%
statements, 80.15% branches, 87.67% functions and 80.65% lines.

Disposable PostgreSQL integration passed 3/3, including account/date/search
isolation, inclusive upper date, escaped literal wildcard, deterministic
ordering, tenant-context mismatch and a real 10,001-row overflow read. The
official authenticated browser runner passed 1/1 with PostgreSQL and Redis
disposable services, real API/SPA execution, filtered rows, no local inventory
requests, CSV export and audit verification. Static/security validators passed:
secrets, OpenAPI, RLS, migration source, deploy surface, Helm and strict Vetus
parity tests. The independent read-only review is recorded in the verified
gate and is limited to this bounded slice.

## Review boundary

Independent review must inspect the repository query, service source boundary,
API row mapping/permission path, SPA migration from local projection, tests and
disposable database evidence. Approval is limited to this read-only report
slice and cannot promote the global ERP.

## Global non-promotion

CVG-004 and the global ERP remain `IN_PROGRESS/PARTIAL`; promotion is
`BLOCKED`. Exact Vetus dynamic-executor parity, fiscal/provider homologation,
financial reconciliation, remaining report families and worker deliveries,
target RLS/roles, backup/restore and RTO/RPO, Redis/continuous operations,
accessibility, operational LGPD, remote CI, deployment, credentials and release
acceptance remain open.
