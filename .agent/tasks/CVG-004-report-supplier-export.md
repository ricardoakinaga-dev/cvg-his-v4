# CVG-004 — bounded supplier and expense registry report export

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `AUTH-CVG-004-REPORT-SUPPLIER-EXPORT-IR-001` plus the additive
schema revalidation `AUTH-CVG-004-REPORT-SUPPLIER-EXPORT-MIGRATION-IR-002`;
no target, provider or production authority is implied.

## Objective

Close the repository-local supplier/expense registration report gap through
the existing audited ReportsService boundary. The source is the persisted
finance expense catalog already used by the finance catalog API and SPA. This
slice is on-demand and read-only; it does not create a supplier master,
advance-payment ledger or inferred contact/tax/payment facts.

## Frozen contract

1. The report catalog exposes `registration-suppliers` in `registrations` with
   required permission `billing.read` and the persisted columns `code`, `name`,
   `kind`, `category`, `costCenterCode`, `costCenterName`, `description`,
   `createdAt` and `updatedAt`. The existing SPA key `register-suppliers`
   maps to this server report id.
2. The API source is the tenant-scoped
   `finance_expense_catalog_items` repository through the runtime's
   `DatabaseFinanceCatalogRepository`. Migration `0146_finance_catalogs.sql`
   is the only authorized schema change for this dependency and must create
   both tracked `finance_catalogs.ts` relations with tenant RLS/FORCE RLS.
   The account is always derived from the authenticated principal; no
   client-supplied account identifier is used. If the database-backed source
   is not composed, execution fails closed rather than falling back to the
   file-backed catalog or a fabricated row.
3. Rows contain only persisted catalog facts. `description` remains a
   description. The export must not relabel or infer it as a contact, tax
   identifier, payment term, bank account, supplier status or financial
   obligation.
4. Strict ISO `dateFrom`/`dateTo` bounds apply to persisted `createdAt`.
   Existing catalog search, category and cost-center filters are passed to the
   tenant repository. Pagination is drained deterministically with a bounded
   10,000-row guard before ReportsService execution persistence.
5. The existing `execute_report` and `export_report` audit path remains the
   only execution/export path. ReportsService CSV formula neutralization stays
   in force. No CRUD, scheduled delivery or worker behavior is added.
6. The SPA keeps the report read-only, labels the stored field as
   `Descrição`, enables the audited CSV action and does not add supplier
   mutation or a claim of complete Vetus supplier parity.
7. Only the additive canonical migration described in point 2 is authorized;
   no migration deletion, rewrite, destructive change, data backfill, provider,
   credential, target, deployment, production, import/reconciliation,
   payment-advance, personalized-report or external system action is
   authorized by this slice.

## TDD acceptance

### RED

- The reports module test rejects the absent `registration-suppliers`
  definition, permission and exact column contract.
- The API route tests reject the absent definition/source branch, prove the
  principal account is passed to the source, require persisted-field mapping,
  strict date validation, pagination/row bounds and fail-closed behavior when
  the database source is missing.
- The database integration test rejects the absent finance catalog relations
  and tenant RLS boundary before migration 0146 is applied.
- The SPA workbench test rejects the disabled `Solicitar Excel` placeholder,
  the contact relabeling and the absence of the server execution/export
  request.

### GREEN

- Module catalog, API route/RBAC/filter/row-limit, runtime composition and SPA
  workbench tests pass.
- The canonical migration runner creates both finance catalog relations and a
  disposable PostgreSQL test proves RLS/FORCE RLS, policies and account
  isolation before any database-backed report claim.
- API and SPA typechecks/build pass; CSV formula neutralization is covered by
  the existing ReportsService exporter and the new report export uses it.
- A focused browser contract, where available, proves the read-only report
  action and explicit description label; it does not claim browser-to-target
  PostgreSQL persistence.

### REGRESSION

- Existing reports, finance catalog, API and SPA suites pass.
- OpenAPI, RLS, secrets, migration-source, deploy-surface, formatting and
  diff hygiene controls remain green.
- Global parity remains open unless all independent global criteria are fresh;
  this task cannot promote the parent or release gates.

## Bounded verification checkpoint — 2026-08-26

The authorized supplier/expense registry report slice reached
`PASS_BOUNDED`. Reports module tests passed 15/15, the full API suite passed
382/382, the focused SPA workbench suite passed 36/36, the finance catalog and
global FORCE-RLS integration passed 4/4 on a fresh disposable PostgreSQL
database, the migration unit contract passed 1/1, the canonical runtime
composition test passed 1/1, and the DB/API/SPA builds and typechecks passed.
Official coverage passed with 1,948 tests passing and one skipped; statements
were 82.07%, branches 80.06%, functions 88.53% and lines 82.07%.

The independent read-only critique identified seven concrete P1/P2 findings:
additive migration policy safety, missing runtime source injection,
SPA/server/date drift, globally unsafe per-account IDs, OpenAPI category drift,
non-deterministic pagination/incomplete source bounds and incomplete RLS
coverage. Each was addressed and rechecked. No reviewer approval is inferred.

The verified gate and evidence artifact are
`.agent/gates/verified-CVG-004-report-supplier-export.json` and
`.agent/artifacts/CVG-004-report-supplier-export-2026-08-26.md`.

## Review and limits

The persisted catalog is the narrowest remaining report source found during
discovery. It has tenant predicates and parameterized filters, but it is not a
dedicated supplier entity and does not establish Vetus semantic parity for
supplier registration. The independent critique was completed for this slice;
its addressed findings are recorded in the verification ledger. The critique
does not grant supplier-parity, production, target, provider or release
approval.

The parent task remains `IN_PROGRESS/PARTIAL`: external providers and
homologation, Live Lab, distributed-worker failure/observability, Vetus
import, payment advances, personalized and remaining reports, target-backed
RLS/restore/RTO-RPO, remote CI, accessibility, operations and release remain
open. The official repository coverage threshold now passes, but it does not
close the broader parity or release gates. No commit, push, deploy, provider,
target or production action is authorized.
