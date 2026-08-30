# CVG-004 — bounded scheduled inventory-movements report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD, security review and independent review
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-IR-001`

## Objective

Complete only the repository-local scheduled worker path for the existing
read-only `inventory-movements` report. The Reports catalog and authenticated
on-demand path already define the raw persisted movement ledger contract; the
worker lacks the scheduled source, resolver branch, bootstrap composition and
real process proof.

## Frozen bounded contract

1. The schedule report id is `inventory-movements`. Each emitted row contains
   exactly these thirteen catalog fields, in order:
   `movementId`, `occurredAt`, `movementType`, `sku`, `name`, `unit`,
   `quantityDelta`, `balanceBefore`, `balanceAfter`, `unitCostAmount`,
   `reason`, `reference`, `recordedByUserId`. A nullable persisted reference
   is represented as the empty string, matching the existing on-demand
   report contract. Internal account/item identity is retained only for
   validation and is never emitted.
2. The source reads one row per existing persisted
   `inventory_stock_movements` record, joined only to the same-account
   persisted `inventory_items` row for SKU, name and unit. It must use the
   claimed schedule account, explicit tenant context and account predicates;
   in-memory, disabled or missing sources fail closed. No lot/consumption
   reconstruction or Vetus event interpretation is allowed.
3. `search` is trimmed, case-insensitive over persisted SKU/name and capped at
   200 characters. `dateFrom` and `dateTo` are strict ISO calendar dates,
   inclusive against `occurredAt` in UTC; inverted or malformed filters fail
   before report execution. Results are deterministic by `occurredAt DESC`,
   then `movementId ASC`.
4. The source and worker use a 10,001-row guard and reject more than 10,000
   rows before ReportsService execution persistence. Movement type must be
   one of the persisted enum values; quantity delta preserves its sign;
   balance/cost values are finite, safe two-decimal facts; text, account,
   references and canonical timestamps are validated. Missing same-account
   item labels, foreign rows, malformed rows and unsafe numbers fail closed.
5. The worker revalidates source output, applies the exact thirteen-field
   projection and preserves existing durable schedule execution/export audit,
   recipient handling and one-shot failure semantics. Movement values and
   labels must not enter schedule audit or worker logs.
6. This is read-only scheduled delivery only. It does not change the existing
   on-demand API/SPA path, inventory writes, lots, consumption semantics,
   invoices/NF, fiscal behavior, historical valuation, migrations, providers,
   credentials, target, production, deployment, backfill, external action or
   release acceptance.

## TDD acceptance

### RED

- A new inventory-module source test fails before the scheduled movement
  source exists and freezes explicit tenant-safe persisted delegation, exact
  thirteen-field mapping, signed deltas, nullable-reference handling,
  deterministic order and malformed/overflow rejection.
- Worker runner tests fail before the `inventory-movements` branch exists and
  freeze exact mapping, strict filters, 10,001-row guard, foreign/malformed
  source rejection and missing/disabled-source failure.
- The disposable PostgreSQL run-once process is extended before implementation
  with two-account movement rows, inclusive UTC dates, literal search,
  deterministic order, source tenant isolation, durable execution and
  non-PII audit assertions.

### GREEN

- The source, worker resolver and bootstrap wiring pass focused tests without
  changing the existing on-demand path.
- Inventory module and worker typechecks/builds and configured worker
  regressions pass.
- Disposable PostgreSQL process evidence proves concurrent two-account
  run-once isolation, raw signed movement facts, same-account item labels,
  filters, durable execution and non-PII audit/log behavior. Source and
  runner tests prove the 10,001-row and malformed fail-closed guards.
- A fresh independent read-only review, global non-promotion retest and final
  hygiene are completed before bounded reconciliation.

## Explicit non-claims

This task does not establish complete Vetus inventory parity, dynamic executor
event semantics, lot/consumption reconstruction, invoice or fiscal/NF meaning,
historical/as-of valuation, target authorization, distributed-worker
operations, provider delivery, accessibility, operational LGPD, remote CI,
backup/restore or release readiness. Global CVG-004/ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-movements.json`
- `.agent/gates/verified-CVG-004-report-scheduled-inventory-movements.json`
- `.agent/artifacts/CVG-004-report-scheduled-inventory-movements-2026-08-28.md`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-FULL-MODULE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-HYGIENE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-FINAL-001`

## Revalidation triggers

- Changes to `inventory_stock_movements`, `inventory_items`, numeric/timestamp
  semantics or tenant RLS/FORCE-RLS policy.
- Changes to report scheduling, worker identity, execution/export/audit or
  one-shot failure behavior.
- Expansion beyond the raw persisted movement ledger, same-account item
  labels, exact thirteen-field projection or stated filters.

## Reconciliation

The intentional RED checkpoint is complete and the bounded GREEN implementation
is now evidenced: the source, worker branch/bootstrap wiring, configured module
and worker suites, and the full disposable run-once report process pass. The
fresh independent review returned `APPROVE_BOUNDED` with no scoped finding.
Final local hygiene passed, and the bounded verified gate and control-plane
documents are now reconciled as `PASS_BOUNDED`, while keeping the parent/global
ERP `IN_PROGRESS/PARTIAL` and promotion `BLOCKED`.

Evidence: `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-RED-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-GREEN-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-REVIEW-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-HYGIENE-001`,
`.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-MOVEMENTS-FINAL-001`.
