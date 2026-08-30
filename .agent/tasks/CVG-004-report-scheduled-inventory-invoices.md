# CVG-004 — bounded scheduled inventory purchase-entry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `RECONCILE`.
**Owner:** root integrator with TDD, security checks and independent review.
**Parent:** CVG-004 Vetus parity journeys.
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`.
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-IR-002`.

## Objective

Close the repository-local scheduled-worker gap for the already implemented
`inventory-invoices` on-demand report. The real worker must read only the
persisted `inventory_purchases` header projection and emit the same operational
purchase-entry contract already exposed by ReportsService.

## Frozen contract

1. The report id is `inventory-invoices`, with the existing twelve fields:
   `purchaseId`, `invoiceNumber`, `supplierName`, `status`, `totalAmount`,
   `receivedAmount`, `payableId`, `createdByUserId`, `approvedByUserId`,
   `createdAt`, `updatedAt` and `receivedAt`, in that order.
2. The source is a dedicated read-only worker source over the existing
   `DatabaseProcurementRepository.findPurchaseReportRows` contract. It reads
   only persisted `inventory_purchases` headers with a non-empty stored
   `invoice_number`, under explicit account context and the existing account
   predicate. Lines, lots, items and in-memory hydrated purchase maps are not
   a fallback.
3. `search` is a trimmed, case-insensitive match on persisted supplier name or
   invoice reference; `status` accepts only `draft`, `approved`,
   `partially_received`, `received` or `cancelled`; `dateFrom` and `dateTo`
   are strict inclusive UTC calendar bounds over `createdAt`.
4. The source and worker reject malformed/foreign rows and more than 10,000
   rows. Ordering remains persisted `createdAt DESC, purchaseId ASC`.
5. The worker maps only the twelve contract fields and preserves existing
   durable schedule execution, export audit, recipient handling and one-shot
   failure semantics. Audit/log metadata must not contain supplier names,
   invoice references, purchase ids or row values.
6. This slice adds no API/SPA behavior, catalog change, migration, fiscal
   document claim, tax/CFOP logic, supplier lifecycle, receipt mutation,
   provider, credential, target, production, deployment, backfill or release
   acceptance.

## TDD acceptance

### RED

- The inventory source test fails before the new source export exists and
  rejects missing/foreign/malformed purchase rows and source overflow.
- Worker tests fail before the `inventory-invoices` branch/wiring exists and
  reject invalid filters, wrong status, wrong field types and overflow.
- The real run-once test fails before bootstrap wiring and requires two
  account-scoped schedules, stored-reference filtering, exact rows and
  non-PII execution audit.

### GREEN

- The dedicated source delegates with explicit account and the bounded
  persisted purchase-report filters, validates the source shape and fails
  closed on unsafe state.
- The worker resolves `inventory-invoices` with strict filters, exact twelve
  fields, tenant validation and the 10,000-row guard.
- Disposable PostgreSQL proves concurrent two-account schedules, blank
  invoice-reference exclusion, search/status/date boundaries, durable
  execution identity and redacted audit/output.

### Regression and review

- Inventory module, worker configured suites, module/worker build/typecheck
  and the complete `worker-run-once-reports` process file remain green.
- Targeted formatting, `pnpm security:secrets`, diff/index hygiene and global
  parity/clinical/readiness retests are recorded without promotion.
- A fresh read-only reviewer inspects the source, worker, bootstrap and
  process assertions. Unavailability is recorded as a limitation, never as
  approval.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-invoices.json`
- `packages/modules/inventory/src/inventory-invoices-report.ts`
- `packages/modules/inventory/src/inventory-invoices-report.test.ts`
- `apps/worker/src/runner.test.ts`
- `tests/integration/process/worker-run-once-reports.test.ts`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-PROCESS-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-FINAL-001`

## Non-claims and revalidation

This is a local scheduled read proof, not complete Vetus `Entrada de NF`
parity, fiscal issuance, historical valuation, lot/movement reconciliation,
target RLS/runtime evidence, provider homologation, distributed-worker
certification, accessibility, LGPD, backup/restore, remote CI, production or
release approval. Revalidate before adding fiscal semantics, line-level joins,
new report fields, API/SPA behavior, target/provider work or any mutation.

## Selection change

This candidate was deferred before RED or production-code changes. Fresh
independent scouting identified the real child-process clinical-financial
restart/replay gap as the higher-impact next bounded slice. Keep this task and
its authority as historical scouting evidence only; do not treat this gate as
the active implementation checkpoint.

## Reselection — 2026-08-28

After closing `CVG-OPS-CRITICAL-PROCESS-RUNNER-001` as `PASS_BOUNDED`, local
scouting reselected this credential-free report-worker gap. The existing
on-demand `inventory-invoices` source and its verified API/SPA contract are
already bounded; the remaining gap is the scheduled worker source, resolver,
bootstrap wiring and disposable process proof. The fresh authority is
`.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-INVENTORY-INVOICES-IR-002`;
the implementation-ready gate is
`.agent/gates/implementation-ready-CVG-004-report-scheduled-inventory-invoices-IR-002.json`.

The selection is limited to the persisted purchase-header projection and exact
twelve-field operational contract described above. It excludes fiscal/NF-e
semantics, line/lot reconstruction, provider/credential/target/production
work, scheduled delivery changes outside this report, and release acceptance.
The next action is intentional TDD RED before any source, worker or process
implementation.

## Verification checkpoint — 2026-08-29

The implementation is complete and remains bounded pending the final compatible
independent review. Intentional RED was recorded before production code:
source collection failed because the module was absent, the worker suite had
57 existing passes and 2 new failures, and the disposable process had 27
existing passes and 1 new failure. GREEN then passed the source tests 4/4,
inventory module 51/51, worker runner 59/59, bootstrap 20/20 and the complete
run-once report process 28/28. The process used a non-UTC PostgreSQL session,
proved the UTC boundary row and two-account isolation, and persisted one
pre-execution failed delivery with null execution/export ids.

The focused source coverage is 94.51% statements/lines, 85.04% branches and
100% functions. Module/worker build and typecheck passed; the complete
workspace `pnpm test` exited 0, with SPA 174/174 files and 1,042/1,042 tests,
worker 59/59 and API 452/452 visible final summaries. The real PostgreSQL
inventory report regression passed 5/5. Fresh OpenAPI, RLS and secret/dependency
checks passed. General Vetus parity remains 100/100 evidence with only 4/11
areas verified; clinical parity remains 100/100 with 2/3 verified; enterprise
readiness remains 95/100 (42 PASS, 3 WARN, 1 FAIL), so no global promotion is
made. The fresh compatible independent review returned `APPROVE_BOUNDED` with
no P0/P1/P2 finding. The bounded gate is now reconciled as `PASS_BOUNDED`.

## Bounded closure — 2026-08-29

The scheduled `inventory-invoices` slice is closed as `PASS_BOUNDED` under
`.agent/gates/verified-CVG-004-report-scheduled-inventory-invoices.json`.
The source, worker, bootstrap, schedule-failure persistence and process proof
passed the frozen contract. The final compatible read-only review confirmed
UTC SQL boundaries, null-ID pre-execution delivery persistence, exact twelve
fields, tenant/overflow validation, PII-safe audit and wiring, with no P0/P1/P2
finding. Final hygiene and control-plane parsing also passed.

This closure remains local and bounded. Global CVG-004/ERP is still
`IN_PROGRESS/PARTIAL`, general Vetus parity is 4/11 verified, clinical parity
is 2/3 verified, enterprise readiness is 95/100 (42 PASS, 3 WARN, 1 FAIL),
and promotion is `BLOCKED`. The next action is fresh scouting for a new
repository-local authority; provider, fiscal, target, production, distributed
operations, accessibility, LGPD, backup/restore, remote CI and release claims
remain excluded.
