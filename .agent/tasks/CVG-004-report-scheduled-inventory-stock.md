# CVG-004 — bounded scheduled inventory-stock report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-IR-001`

## Objective

Complete only the repository-local scheduled worker path for the existing
read-only `inventory-stock` report. The catalog and authenticated on-demand
API already define the current persisted stock projection; the worker lacks
only the scheduled source, resolver branch, database bootstrap wiring and
real process proof.

## Frozen bounded contract

1. The schedule report id is `inventory-stock`. The emitted row contains
   exactly the existing catalog fields, in order: `sku`, `name`, `unit`,
   `onHandQuantity`, `reorderLevel`, `unitCostAmount`, `stockValue`,
   `reorderStatus`, `createdAt` and `updatedAt`. Internal account and item
   identity may be retained only for validation and is never emitted.
2. The source reads the existing explicit read-only `inventory_items`
   projection and derives no facts from lots, movements, invoices, charges or
   historical records. It must execute under explicit tenant context and the
   claimed schedule account predicate; no client-supplied account or
   in-memory inventory source is accepted.
3. `search` matches persisted SKU or name case-insensitively. `dateFrom` and
   `dateTo` are strict ISO calendar dates, inclusive against persisted
   `createdAt` in UTC. Empty filters are omitted; inverted ranges and malformed
   filters fail closed. Ordering remains deterministic by `name ASC, id ASC`.
4. The source and worker reject more than 10,000 rows using a 10,001-row
   guard. Persisted quantity, reorder level and unit cost are non-negative,
   finite, two-decimal facts. `stockValue` is current quantity multiplied by
   current unit cost and rounded to two decimals; unsafe or non-finite derived
   values fail closed. `reorderStatus` is `below_reorder_level` when quantity
   is less than or equal to the persisted reorder level, otherwise `adequate`.
5. The worker revalidates account, exact source shape, canonical timestamps,
   numeric facts and derived fields before mapping the exact ten-field catalog
   projection. Existing durable scheduled execution/export audit, recipient
   handling and one-shot failure semantics remain unchanged; stock rows and
   values must not enter schedule audit or worker logs.
6. This is read-only scheduled delivery only. It does not change inventory
   CRUD, current-stock persistence, lot/movement/invoice semantics,
   historical/as-of valuation, API/SPA behavior, providers, credentials,
   target, production, deployment, backfill, external action or release
   acceptance.

## TDD acceptance

### RED

- A new inventory-module source test fails before the scheduled stock source
  exists and freezes explicit delegation to the persisted inventory-items
  projection, current-value derivation, status threshold and unsafe-value
  rejection.
- Worker runner tests fail before the `inventory-stock` branch exists and
  freeze exact ten-field mapping, filters, row bounds, foreign/malformed
  source rejection and missing-source failure.
- The disposable PostgreSQL run-once process is extended before implementation
  with two-account stock rows, inclusive dates, search, derived values,
  isolation, durable execution and non-PII audit assertions.

### GREEN

- The inventory stock source, worker resolver/bootstrap wiring and exact
  ten-field mapping pass focused tests.
- Inventory module and worker builds/typechecks and the configured worker
  regression pass.
- Disposable PostgreSQL process evidence proves two-account run-once
  isolation, inclusive UTC filters, current-value derivation, deterministic
  rows, the 10,001-row fail-closed bound, durable execution/export audit and
  one-shot failure semantics.
- A fresh independent read-only review and final hygiene are completed before
  bounded reconciliation. Approval remains limited to this scheduled slice
  and does not promote the parent or global readiness.

## Explicit non-claims

This task does not establish complete Vetus inventory parity, historical or
accounting valuation, lot/movement/invoice semantics, target authorization,
distributed-worker operations, provider delivery, accessibility, operational
LGPD, remote CI, backup/restore or release readiness. Global CVG-004/ERP
remains `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-stock.json`
- `.agent/gates/verified-CVG-004-report-scheduled-inventory-stock.json`
- `.agent/artifacts/CVG-004-report-scheduled-inventory-stock-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-FULL-MODULE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-PROCESS-FULL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-FINAL-001`

## Revalidation triggers

- Changes to `inventory_items` schema, numeric/timestamp semantics or tenant
  RLS/FORCE-RLS policy.
- Changes to report scheduling, worker identity, execution/export/audit or
  one-shot failure behavior.
- Expansion beyond the current ten-field projection, persisted source,
  filters or scheduled read-only delivery.

## Reconciliation

The bounded scheduled inventory-stock slice is reconciled as `PASS_BOUNDED`
with `HIGH` local confidence and `HIGH` residual risk. Inventory module tests
passed `43/43`; focused source coverage passed `96.15%` statements/lines,
`91.42%` branches and `100%` functions; module build/typecheck passed; the
configured worker suites passed; and the focused disposable PostgreSQL process
passed with concurrent two-account run-once execution, exact ten-field rows,
current value/status derivation, tenant isolation and non-PII audit/log
assertions. A fresh independent read-only reviewer returned
`APPROVE_BOUNDED` with no CRITICAL/HIGH/MEDIUM/LOW finding.

The global retest remains non-promoting: general Vetus parity is `4/11`
verified, clinical parity is `2/3` verified, and enterprise readiness is
`95/100` (`42 PASS`, `3 WARN`, `1 FAIL`). Promotion remains `BLOCKED`; target
operations, providers/homologation, distributed worker operations,
accessibility, operational LGPD, remote CI, backup/restore, complete parity
and release acceptance remain open.

Evidence: `.agent/gates/verified-CVG-004-report-scheduled-inventory-stock.json`,
`.agent/artifacts/CVG-004-report-scheduled-inventory-stock-2026-08-28.md`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-STOCK-FINAL-001`.
