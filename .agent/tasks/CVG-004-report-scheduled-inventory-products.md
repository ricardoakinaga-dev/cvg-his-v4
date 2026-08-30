# CVG-004 — bounded scheduled inventory-products report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `RECONCILE` / `VERIFIED_BOUNDED`
**Owner:** root integrator with TDD and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-IR-001`

## Objective

Close only the repository-local scheduled worker source gap for the existing
read-only `inventory-products` report. The catalog and on-demand API already
define the report over persisted inventory items; the worker currently has no
inventory-products source, resolver branch or database bootstrap wiring.

## Frozen bounded contract

1. The schedule report id is `inventory-products`, and the worker returns
   exactly the existing catalog fields `sku`, `name`, `unit`,
   `onHandQuantity`, `reorderLevel`, `unitCostAmount`, `createdAt` and
   `updatedAt`. The internal source may carry only the account and persisted
   item identity required for validation; neither is emitted as a report
   field.
2. The source reads only the persisted `inventory_items` relation under the
   claimed schedule account. It must use explicit tenant database context plus
   an account predicate, with no in-memory cache, lot/movement/invoice join or
   client-supplied account. Existing migration `0062` and its tenant rails are
   reused; no migration is authorized.
3. `search` matches persisted SKU or name case-insensitively. `dateFrom` and
   `dateTo` are strict ISO calendar dates, inclusive against persisted
   `created_at` in UTC. Empty filters are omitted; inverted ranges and
   malformed filters fail closed. Ordering is deterministic by `name ASC,
id ASC`.
4. The database query returns at most 10,001 rows and rejects more than
   10,000. The worker revalidates account, exact source shape, canonical
   timestamps, non-negative two-decimal numeric facts and the row bound before
   mapping the exact eight-field catalog projection.
5. Existing durable scheduled execution/export audit, recipient handling and
   one-shot failure semantics remain unchanged. Row data and inventory values
   must not enter schedule audit or worker logs.
6. This slice is read-only scheduled delivery only. It does not change
   inventory CRUD, current-stock derivation, lot/movement/invoice semantics,
   historical/as-of valuation, API/SPA behavior, providers, credentials,
   target, production, deployment, backfill, external action or release
   acceptance.

## TDD acceptance

### RED

- The inventory-module source test rejects the absent shared source and freezes
  explicit tenant SQL, exact projection, search/date filters, deterministic
  order and the 10,001-row guard.
- The worker runner test rejects the absent `inventory-products` branch,
  invalid filters, missing/oversized/foreign/malformed source output and any
  mapping outside the exact eight catalog fields.
- The real process test is extended before implementation for two-account
  schedules, exact rows, inverse-account isolation, inclusive UTC dates,
  durable execution and non-PII audit.

### GREEN

- The inventory products source, worker resolver/bootstrap wiring and exact
  eight-field mapping pass focused tests.
- Inventory module and worker builds/typechecks and the configured worker
  regression pass.
- Disposable PostgreSQL run-once evidence proves persisted item reads,
  search/date behavior, two-account isolation, exact rows, overflow
  fail-closed behavior and durable scheduled execution/export audit.
- A fresh independent read-only review and final hygiene are completed before
  bounded reconciliation. Review approval remains limited to this slice and
  does not promote the parent or global readiness.

## Bounded result

The scheduled `inventory-products` worker path is closed as `PASS_BOUNDED`,
with `HIGH` confidence for this local slice and `HIGH` residual risk. The
shared source reads only persisted `inventory_items` through explicit tenant
context and an account predicate, applies literal case-insensitive SKU/name
search, inclusive UTC `createdAt` dates, deterministic `name ASC, id ASC`
ordering and a 10,000-row fail-closed bound. The worker revalidates source
rows and emits exactly the eight existing catalog fields while preserving
durable schedule execution/export audit and one-shot semantics.

Inventory module tests passed `37/37`; focused source coverage passed `92.07%`
statements/lines, `89.85%` branches and `100%` functions. Module typecheck and
build passed. Configured worker suites passed runner `53/53`, bootstrap
`20/20`, account discovery `7/7`, consumer composition `2/2`, report identity
`8/8`, scheduled-job `3/3` and PIX settlement `17/17`. The final disposable
PostgreSQL run-once process passed `25/25` with concurrent two-account
isolation, literal `%` search escaping, inclusive UTC boundaries, exact rows,
durable execution and non-PII audit. `security:secrets`, Prettier and
`git diff --check` also passed.

The independent reviewer returned `APPROVE_BOUNDED` with no CRITICAL, HIGH or
MEDIUM finding. The reviewer noted a LOW testing gap around real PostgreSQL
execution of the new `ILIKE ... ESCAPE` path; the process fixture was then
strengthened with a literal `%` search and an in-window false-positive row,
and the full process suite was rerun successfully. Approval remains limited
to the bounded local implementation. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL`, general parity remains `4/11`, clinical parity `2/3`,
enterprise readiness `95/100` (`42 PASS`, `3 WARN`, `1 FAIL`) and promotion
remains `BLOCKED`.

## Explicit non-claims

This task does not establish complete Vetus inventory parity, current-stock or
historical valuation parity, lot/movement/invoice semantics, target
authorization, distributed-worker operations, provider delivery,
accessibility, operational LGPD, remote CI, backup/restore or release
readiness. Global CVG-004/ERP stays `IN_PROGRESS/PARTIAL` and promotion stays
`BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-products.json`
- `.agent/gates/verified-CVG-004-report-scheduled-inventory-products.json`
- `.agent/artifacts/CVG-004-report-scheduled-inventory-products-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-PRODUCTS-FINAL-001`

## Revalidation triggers

- Changes to `inventory_items` schema, numeric/timestamp semantics or tenant
  RLS/FORCE-RLS policy.
- Changes to report scheduling, worker identity, execution/export/audit or
  one-shot failure behavior.
- Expansion beyond the eight persisted item fields, search/date filters,
  scheduled delivery or the bounded source relation.
