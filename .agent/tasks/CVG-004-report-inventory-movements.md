# CVG-004 — server-backed inventory movement ledger report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `AUTH-CVG-004-REPORT-INVENTORY-MOVEMENTS-IR-001`; no invoice,
provider, target, production or release authority is implied.

## Objective

Replace the Reports Workbench's local-only `inventory-movements` projection with
an authenticated, tenant-scoped, database-backed on-demand report execution and
audited export. The report is an operational projection of the persisted stock
movement ledger; it must not reconstruct movements from lots or consumptions.

## Frozen contract

1. The report id is `inventory-movements`, its required permission is
   `inventory.read` in addition to the existing `billing.read` Reports
   Workbench gate, and its grain is exactly one row per persisted
   `inventory_stock_movements` record belonging to the authenticated account.
2. The row schema is exactly these thirteen fields, in this order:
   `movementId`, `occurredAt`, `movementType`, `sku`, `name`, `unit`,
   `quantityDelta`, `balanceBefore`, `balanceAfter`, `unitCostAmount`,
   `reason`, `reference`, `recordedByUserId`. `movementType` preserves the
   persisted enum (`adjustment`, `inbound`, `outbound`, `transfer` or
   `consumption`); `quantityDelta` preserves its sign. Item identity is read
   through the same-account persisted `inventory_items` record.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against
   `occurredAt`; inverted periods fail before the source read. `search` is
   trimmed, case-insensitive over persisted SKU/name and capped at 200
   characters. The source is bounded at 10,001 rows so the report rejects more
   than 10,000 rows before ReportsService execution persistence. Results are
   deterministic: `occurredAt DESC`, then `movementId ASC`.
4. The API derives the account only from the authenticated principal, rechecks
   account, period, search and row shape after the source call, and fails closed
   when the inventory or stock-movement source is in-memory/disabled. Missing
   same-account item joins fail closed rather than fabricating labels.
5. ReportsService remains the only execution, audit and export boundary. The
   SPA forwards the strict filters, validates the exact row contract, renders
   the server execution and exports the audited server artifact without calling
   `/inventory`, `/inventory/lots`, `/inventory/consumptions` or the local
   movement projection for this report.
6. No lot or consumption reconstruction, invoice/NF-entry report, scheduled
   worker, historical/as-of valuation, write path, provider, fiscal operation,
   migration, credential, target, deployment, production, backfill or release
   action is authorized.

## TDD acceptance

### RED

- The Reports module test rejects the absent `inventory-movements` definition,
  permission, filters and exact thirteen-field contract.
- The inventory service/API tests reject the absent persisted ledger source,
  account-safe item join, strict period/search semantics, deterministic order,
  disabled-source fail-closed behavior and 10,001-row bound.
- The SPA Workbench test rejects the local `/inventory`/lots/consumptions load
  and requires server execution/export with the raw movement contract.

### GREEN

- Module catalog, inventory source, API RBAC/filter/row-limit, SPA Workbench
  and focused SPA contract pass.
- A disposable PostgreSQL integration proves two-account isolation, inclusive
  movement dates, search/order, raw signed movement fields, source overflow,
  durable execution/export audit and no cross-account item join.
- API/module/SPA typechecks and builds pass; CSV formula neutralization remains
  provided by the existing ReportsService exporter.

### REGRESSION

- Existing inventory, reports, API and SPA suites pass, along with the
  repository's coverage and static/security validators available locally.
- Global parity, clinical parity, providers, target operations, backup/restore,
  distributed worker failure proof, accessibility, LGPD, remote CI and release
  acceptance remain open unless independently reverified.

## Explicit non-claims

- The report does not turn a raw movement type into a Vetus business event,
  reconstruct movement history from lots/consumptions or certify fiscal NF
  entry semantics.
- Disposable local PostgreSQL/browser evidence does not certify target roles,
  production scale, external providers, continuous workers or release.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-inventory-movements.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-FOCUSED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-DB-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-E2E-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-MOVEMENTS-REVIEW-FINAL-001`
- `e2e/spa/inventory-movements-report-flow.spec.ts`
- `.agent/gates/verified-CVG-004-report-inventory-movements.json`
- `.agent/artifacts/CVG-004-report-inventory-movements-2026-08-28.md`

## Verified bounded closure

The implementation reached `PASS_BOUNDED` after the recorded RED checkpoint,
focused GREEN/regression, real disposable PostgreSQL verification, an official
authenticated browser E2E and fresh independent review. The movement browser
flow is now covered separately from the existing stock browser flow.

Current evidence: module-reports 21/21, module-inventory 30/30, compiled API
route focus 37/37, full API 450/450, SPA Workbench 44/44, disposable
PostgreSQL 4/4, authenticated browser E2E 1/1, production SPA build,
workspace coverage above the 80% bar, secret scan, formatting, diff and
empty-index checks. The final independent critic returned `APPROVE` and found
no scoped CRITICAL/HIGH/MEDIUM issue.

The gate remains limited to the raw persisted movement ledger and same-account
item facts. Exact Vetus dynamic-executor parity, lot or consumption
reconstruction, invoice/NF semantics, historical valuation, providers,
scheduled delivery, target operations, production, backup/restore, RTO/RPO,
accessibility, operational LGPD, remote CI and release acceptance remain open.
