# CVG-004 — server-backed inventory-stock report

**Status:** PASS_BOUNDED; parent CVG-004 remains IN_PROGRESS/PARTIAL.
**Stage/activity:** VERIFY / RECONCILE
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** T3_SYSTEM / HIGH / CROSS_SYSTEM
**Authority:** AUTH-CVG-004-REPORT-INVENTORY-STOCK-IR-001; no target,
provider, credential, production or release authority is implied.

## Objective

Replace the Reports Workbench's local-only `inventory-stock` projection with an
authenticated, tenant-scoped, database-backed on-demand report execution and
audited export. The report must describe the current persisted stock position
without inventing lot, invoice or historical valuation facts.

## Frozen contract

1. The report id is `inventory-stock`, its required permission is
   `inventory.read` in addition to the existing `billing.read` Reports
   Workbench gate, and its grain is exactly one row per persisted
   `inventory_items` record belonging to the authenticated account.
2. The row schema is exactly these ten fields, in this order:
   `sku`, `name`, `unit`, `onHandQuantity`, `reorderLevel`,
   `unitCostAmount`, `stockValue`, `reorderStatus`, `createdAt`, `updatedAt`.
   `stockValue` is the current persisted balance multiplied by the current
   persisted unit cost. `reorderStatus` is `below_reorder_level` when the
   balance is less than or equal to the persisted minimum, otherwise
   `adequate`. No lot, location, invoice, movement, historical/as-of,
   average-cost or external-provider field is part of this server contract.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against
   persisted `createdAt`; inverted periods fail before the source read.
   `search` is trimmed, case-insensitive over SKU/name, and capped at 200
   characters. The source requests 10,001 rows to detect overflow and the
   report rejects more than 10,000 rows.
4. The source is the existing parameterized tenant-scoped `inventory_items`
   repository query. The API defensively rechecks account, period and search
   semantics after the source call before mapping the exact ten fields.
5. An in-memory source fails closed. ReportsService remains the execution,
   audit and export boundary; the SPA consumes the server execution and does
   not hydrate `/inventory`, `/inventory/lots` or synthetic lot summaries for
   this report.
6. This slice is on-demand API/SPA only. Scheduled worker resolution,
   historical stock, lot lifecycle, NF entry, valuation reconciliation,
   providers, fiscal writes, migration/backfill, target, production,
   deployment and release acceptance are explicitly outside the authority.

## TDD acceptance

### RED

- Reports catalog and API tests fail before the new definition/source branch
  exists.
- The SPA test fails while the Workbench still loads local item/lot
  projections for `inventory-stock`.
- Fixtures include own-account, foreign-account, date-miss and search-miss
  rows so the test rejects structural leakage at the report boundary.

### GREEN (executed)

- The Reports catalog exposes the exact ten-field contract with
  `inventory.read`.
- The API report source returns only account-matching persisted items, applies
  strict filters, derives only the frozen current-value fields, preserves
  deterministic ordering and detects the 10,001-row overflow.
- Workbench execution renders the server rows, forwards filters, exports the
  audited server artifact and clears stale rows on failed refresh.
- In-memory inventory fails closed; no local item/lot endpoint is called for
  this report.
- Disposable PostgreSQL proved two-account isolation, inclusive `createdAt`
  filtering, deterministic ordering, current stock-value derivation, durable
  execution/export audit and the 10,001-row overflow bound.

### REGRESSION (executed)

- Focused module/API/SPA/build checks, full API regression, workspace coverage,
  authenticated browser E2E and repository validators remained within the
  established bar.
- Global Vetus/clinical parity, fiscal/provider, target/restore/RTO-RPO,
  distributed worker, accessibility, operational LGPD, remote CI and release
  gates remain open unless independently reverified.

## Explicit non-claims

- This is not a historical inventory ledger, lot report, movement report or
  NF-entry report.
- Current `stockValue` is a bounded operational projection, not historical
  accounting valuation or a financial ledger balance.
- No external Vetus executor, provider, target environment, production,
  deployment or release acceptance is certified.

## Revalidation triggers

- Changes to inventory item persistence, cost/balance semantics, report
  authorization or Workbench server-report behavior.
- Any request to add lots, locations, movements, NF, historical/as-of,
  valuation, scheduled delivery, providers, target, production or release
  behavior.

## Final bounded reconciliation — 2026-08-28

The authenticated tenant-scoped on-demand `inventory-stock` report/export is
closed as `PASS_BOUNDED` with `HIGH` residual risk. The exact ten-field
contract, current persisted `inventory_items` source, strict filters,
deterministic ordering, current stock derivations, overflow guard,
ReportsService audit/export boundary and SPA server-only path remain within
the confirmed authority.

The first fresh independent review found no scoped functional CRITICAL, HIGH
or MEDIUM issue and blocked only on the deliberately pending control-plane
records. After reconciliation, a second fresh read-only review returned
`APPROVE` for V-001 through V-008. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-inventory-stock.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-RED-REMEDIATION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FOCUSED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-DB-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-E2E-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-REVIEW-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-REVIEW-FINAL-002`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-FINAL-002`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-STOCK-HYGIENE-002`
- `.agent/gates/verified-CVG-004-report-inventory-stock.json`
- `.agent/artifacts/CVG-004-report-inventory-stock-2026-08-28.md`
