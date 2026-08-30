# CVG-004 — bounded inventory purchase-entry report

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `VERIFY` / `RECONCILE`  
**Owner:** root integrator with TDD and read-only review attempt  
**Parent:** CVG-004 Vetus parity journeys  
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-INVENTORY-INVOICES-IR-001`

## Problem

The Reports Workbench route `inventory-invoices` currently invents invoice
numbers from lot/SKU values and reconstructs rows from process-local inventory
items and lots. The repository already persists inventory purchase headers with
an optional invoice reference, supplier text, purchase status, amounts and
receipt lifecycle, but the report has no server-backed source contract.

## Frozen bounded contract

1. The existing `inventory-invoices` report key is backed by the catalog
   definition `inventory-invoices` in the `inventory` category. It requires
   `inventory.read`, supports JSON/CSV/XLSX/PDF, and accepts only strict
   `search`, `status`, `dateFrom` and `dateTo` filters.
2. The only source is the authenticated account's persisted
   `inventory_purchases` header through a source-bounded
   `DatabaseProcurementRepository` query. The query returns only rows with a
   non-empty persisted `invoice_number`; the value is displayed as a reference
   exactly as stored and is not treated as a validated fiscal document number.
   Missing database composition or an unsupported repository capability fails
   closed; in-memory cache rows, inventory items and lots are never a fallback.
3. The grain is one row per persisted inventory purchase header. The exact
   fields are `purchaseId`, `invoiceNumber`, `supplierName`, `status`,
   `totalAmount`, `receivedAmount`, `payableId`, `createdByUserId`,
   `approvedByUserId`, `createdAt`, `updatedAt` and `receivedAt`. Null persisted
   values become empty export cells; no field is inferred from a lot, SKU,
   supplier catalog or financial record.
4. `status` accepts only `draft|approved|partially_received|received|cancelled`;
   `search` is trimmed/capped at 200 characters and matches the persisted
   supplier name or invoice reference; `dateFrom` and `dateTo` are inclusive
   ISO calendar bounds over persisted purchase `created_at`. Rows are ordered
   by `created_at DESC, id ASC` and the database read is bounded at 10,001
   rows so overflow is rejected before ReportsService persistence.
5. The authenticated API performs RBAC and account/tenant checks, validates
   the exact source and output shape, then uses the existing durable
   ReportsService execution, audit and formula-safe CSV export path. No
   scheduled worker source is added by this slice.
6. The SPA removes local item/lot reconstruction, executes
   `inventory-invoices` server-side, validates the exact row shape, renders
   loading/error/empty states and exports the audited server artifact. Its
   copy says this is an operational purchase-entry projection with stored NF
   reference, not fiscal issuance or authorization.
7. No migration, fiscal write, CFOP/tax calculation, municipality/provider
   call, certificate/credential handling, supplier-master creation, commercial
   reconciliation, lot/movement reconstruction, valuation, target, production,
   deployment, backfill, scheduled delivery or release acceptance is
   authorized.

## TDD acceptance

### RED

- The Reports catalog test rejects the absent inventory purchase-entry
  definition and exact twelve-column/filter/permission contract.
- Inventory/Procurement source tests reject cache-only reads, missing
  invoice-number filtering, invalid status/date/search forwarding,
  nondeterministic ordering, account mismatch and an unbounded read.
- API route tests reject the local item/lot path, missing database source,
  invalid filter forwarding, cross-account rows, invalid output shape and
  source overflow before execution persistence.
- SPA tests reject the local `inventoryService.list`/`listLots` path and
  require server execution, exact row validation and audited export.

### GREEN

- The database repository and ProcurementService expose an account-scoped,
  parameterized, bounded purchase-header report source.
- Reports catalog, API route and SPA agree on the same twelve-field contract,
  strict filters, permission and non-fiscal semantics.
- Disposable PostgreSQL proves tenant isolation, invoice-reference filtering,
  status/date/search boundaries, deterministic order, overflow rejection and
  durable execution/export/audit.
- An authenticated browser flow proves the server-only report path and CSV
  export; no local inventory fetch is used.

### REGRESSION

- Inventory procurement, ReportsService, API and SPA suites remain green;
  API/SPA builds and typechecks pass.
- OpenAPI, RLS, migration-source, secrets, formatting, diff hygiene and the
  repository coverage threshold remain green.
- Global Vetus parity, fiscal provider homologation, target operations,
  distributed workers, accessibility, LGPD, remote CI and release gates stay
  open unless separately reverified.

## Review boundary

The Vetus route confirms the existence and purpose of `EntradaNotaFiscal`, but
does not define exact columns or prove that the CVG purchase table is a fiscal
document source. Review must therefore attack the distinction between a stored
purchase invoice reference and a fiscal NF, including permission, tenant
isolation, fallback behavior, ordering and export completeness.

## Revalidation triggers

- Any change to inventory purchase persistence, invoice-reference validation,
  receipt lifecycle, supplier semantics or report grain/filters.
- Any attempt to add fiscal issuance/cancellation, tax/CFOP, provider,
  municipality, credentials, commercial reconciliation, worker delivery,
  target, production or release behavior.

## Evidence

- `.agent/gates/implementation-ready-CVG-004-report-inventory-invoices.json`
- `.agent/artifacts/CVG-004-report-inventory-invoices-2026-08-28.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-DB-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-E2E-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-REVIEW-UNAVAILABLE-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-GLOBAL-RETEST-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-FINAL-001`

## Bounded closure — 2026-08-28

The slice is reconciled as `PASS_BOUNDED` with `MEDIUM` confidence and `HIGH`
residual risk. Reports and inventory focused suites passed 22/22 and 33/33;
the compiled API route suite passed 39/39; the SPA regression passed 174 files
and 1,042 tests, with SPA typecheck and the module/API builds passing. The real
disposable PostgreSQL proof passed 5/5 and the official authenticated browser
flow passed 1/1. Workspace coverage passed with 2,051 tests and one skipped,
at 80.63% statements, 80.33% branches, 87.60% functions and 80.63% lines.

The database source reads only persisted `inventory_purchases` headers with a
non-empty stored `invoice_number`; the API and Workbench enforce the exact
twelve-field operational contract and use durable ReportsService execution,
audit and export. No local item/lot/consumption fallback or fiscal document
behavior is included. Targeted Prettier, `pnpm security:secrets`, diff and
empty-index checks passed.

Independent post-remediation approval was not obtained. The reviewer role was
rejected by account policy and two compatible default-review attempts timed
out before returning a verdict; the attempts were shut down and are not
represented as approval. This limitation is recorded at
`.agent/verification.jsonl#VFY-CVG-004-REPORT-INVENTORY-INVOICES-REVIEW-UNAVAILABLE-001`.
The bounded gate consequently retains `MEDIUM` confidence and requires a
fresh independent review before higher-confidence use or scope expansion.

The final artifact and gate are
`.agent/artifacts/CVG-004-report-inventory-invoices-2026-08-28.md` and
`.agent/gates/verified-CVG-004-report-inventory-invoices.json`.
Global Vetus/clinical parity, fiscal/provider homologation, target operations,
remote CI, distributed worker behavior, accessibility, LGPD and release
acceptance remain open; parent CVG-004/global ERP stays non-promoted.
