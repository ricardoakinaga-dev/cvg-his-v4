# CVG-004 — bounded persisted NFS-e service-invoice report

**Status:** PASS_BOUNDED; parent CVG-004 remains IN_PROGRESS/PARTIAL.
**Stage/activity:** VERIFY / RECONCILE
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `AUTH-CVG-004-REPORT-SERVICE-INVOICES-IR-001`; no target,
provider, credential, production or release authority is implied.

## Objective

Close the Reports Workbench placeholder for `Relatório de NF de Serviços
Prestados` with a bounded, read-only report over persisted NFS-e documents.
This is a repository-local report contract, not a claim of exact Vetus dynamic
executor parity.

## Frozen contract

1. The report catalog exposes `fiscal-service-invoices`; the SPA key
   `service-invoices` maps to it and requires `billing.read` at the Reports
   boundary plus `fiscal.read` at the definition boundary.
2. The only source is the authenticated account's persisted
   `fiscal_nfse_documents` through the existing tenant-scoped fiscal repository
   and `FiscalService.listNfseDocuments`. In-memory fallback is rejected.
3. The report grain is one row per persisted NFS-e document. It exposes only
   persisted document facts: series/number, competence, current status,
   customer name/document, provider, service descriptions/codes, service
   quantity, service subtotal, document total and creation timestamp. It does
   not infer execution, payment, cancellation event time/actor/reason, or
   commercial source linkage.
4. `status` is optional and accepts only the persisted NFS-e states
   `draft|issued|cancelled|error`; `dateFrom` and `dateTo` are strict ISO
   calendar dates applied inclusively to persisted fiscal `competencia`;
   `search` is trimmed and capped at 200 characters and matches persisted
   customer or service text. Inverted periods fail before the source is read.
   Rows are deterministically ordered by persisted `createdAt DESC, id DESC`
   and the report is bounded at 10,000 rows.
5. Execution and CSV export use the existing ReportsService persistence,
   formula-safe export and audit path. The complete filtered execution is
   exported, not only visible UI rows.
6. The SPA removes the disabled placeholder path, renders the server execution
   with loading/error/empty states, keeps the page read-only, and explicitly
   states that no NFS-e is emitted, cancelled, sent to a municipality or
   reconciled with commercial/financial records by this report.
7. No migration, fiscal write lifecycle, provider call, credential handling,
   external Vetus operation, target, deployment, production, backfill or
   release acceptance is authorized by this slice.

## TDD acceptance

### RED

- Reports catalog tests reject the absent report, permission, filter schema and
  persisted-document columns.
- Fiscal report source/API tests reject in-memory fallback, invalid periods,
  oversized results, cross-tenant source calls and unbounded/ambiguous rows.
- SPA tests reject the disabled/local aggregate path and require server
  execution, row validation and audited export.

### GREEN

- Module, API and SPA tests pass with tenant-scoped persisted fiscal data,
  strict filters, deterministic bounded rows and formula-safe CSV.
- Disposable PostgreSQL proves account isolation, competence boundaries,
  document ordering and service-line aggregation.
- API/module builds, SPA typecheck/build and an authenticated browser flow pass.

### REGRESSION

- Workspace regression and official coverage remain at or above the repository
  80% threshold.
- OpenAPI, RLS, secrets, migration-source, deploy-surface, formatting and
  diff-hygiene controls remain green.
- Global Vetus/clinical parity, provider/homologation, target, restore/RTO-RPO,
  distributed operations, accessibility, LGPD, remote CI and release gates
  remain open unless independently reverified.

## Review boundary

The Vetus evidence confirms the legacy dynamic-executor route and functional
purpose but not its exact columns, filters or grain. A fresh independent review
must inspect the bounded implementation before reconciliation as
PASS_BOUNDED.

## Verification and reconciliation

The bounded contract is reconciled as PASS_BOUNDED with HIGH residual risk.
The catalog, API, SPA and worker now use the same persisted NFS-e document
contract. The API rejects an in-memory fiscal source, validates status and
period filters, reads at most 10,001 rows to detect overflow, and delegates
execution/export/audit to ReportsService. The shared fiscal document endpoint
also has a 1,000-row default and maximum.

The database path applies tenant/account context, literal search semantics
with escaped ILIKE wildcards, inclusive competence boundaries and deterministic
createdAt DESC / id DESC ordering. The browser page is read-only and states
that this report does not issue, cancel, send to a municipality/provider or
reconcile commercial and financial records. The scheduled worker source is
wired to the same FiscalService read path and maps the same 22 report fields.

TDD RED was observed before implementation for the absent report catalog and
fiscal filter-forwarding contract. GREEN and regression evidence passed:

- Reports and Fiscal focused module tests: 36/36.
- Compiled API Reports route tests: 26/26; compiled Fiscal route tests:
  16/16.
- SPA Reports Workbench tests: 40/40; SPA typecheck and relevant builds:
  passed.
- All Worker suites passed, including the fiscal scheduled-source mapping.
- Disposable PostgreSQL fiscal integration: 2/2, including literal wildcard,
  competence, ordering, account isolation and a real restricted-role RLS
  cross-tenant negative assertion.
- Disposable process worker execution: 1 passed, with 14 unrelated tests
  skipped by the selected test expression.
- Official authenticated Docker browser flow:
  E2E_PLAYWRIGHT_TARGET=e2e/spa/service-invoices-report-flow.spec.ts
  bash infra/scripts/run-e2e-spa.sh — 1/1 passed with cleanup.
- Workspace coverage: 170 test files passed, 1 skipped; 2,038 tests passed,
  1 skipped; statements 80.60%, branches 80.09%, functions 87.64% and lines
  80.60%.

The independent read-only reviewer returned APPROVE_BOUNDED after checking the
five remediation points: worker wiring, adversarial RLS proof, shared fiscal
endpoint bound, SQL wildcard escaping and whitespace-prefixed CSV formula
neutralization.

## Global non-promotion

This closes only the local persisted NFS-e report slice. OpenAPI, RLS
coverage, migration source-of-truth, deploy-surface, secrets, Prettier and
diff hygiene passed. The strict parity unit test passed 4/4, but the live
parity audit remains NOT VERIFIED at 4/11 areas, clinical parity remains NOT
VERIFIED at 2/3 areas, and enterprise readiness remains 95/100 with 42 PASS,
3 WARN and 1 FAIL. The parent CVG-004 and global ERP remain
IN_PROGRESS/PARTIAL; promotion is BLOCKED.

Still open are exact Vetus dynamic-executor parity, fiscal write/issuance and
municipality/provider homologation, external credentials, commercial and
financial reconciliation, remaining report families, target RLS and
operations, backup/restore and RTO/RPO, distributed worker observability,
accessibility, operational LGPD, remote CI, deployment, production and
release acceptance. No provider, target, staging, production, credential,
commit, push or external state was changed.
