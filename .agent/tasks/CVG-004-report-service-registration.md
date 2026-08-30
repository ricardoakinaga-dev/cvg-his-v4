# CVG-004 — bounded services registry report export

**Status:** `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CHECKPOINT`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** the original CVG HIS v4 consolidation request, narrowed below;
no target/provider or production authority is implied.

## Objective

Close one repository-local report gap by exporting the already persisted
services registry through the existing audited ReportsService boundary. This
slice is on-demand only and does not claim scheduled delivery, supplier
parity, Paymento Antecipado, personalized reports, provider behavior or full
Vetus parity.

## Frozen contract

1. The report catalog exposes `registration-services` in `registrations` with
   required permission `service.read` and columns `code`, `name`,
   `description`, `basePrice`, `status` and `createdAt`.
2. API rows come from `ServicesService.list(principal.user.accountId)`, whose
   production runtime is hydrated from the tenant-scoped `services` table.
   The route applies strict ISO `dateFrom`/`dateTo` bounds to the stored
   `createdAt` fact and never reads another account's rows.
3. The mapping contains only stored service facts. Null code and description
   become blank cells; `status` is the persisted `active` fact represented as
   `active` or `inactive`; `basePrice` remains numeric.
4. The execution rejects more than 10,000 rows before persistence, then uses
   the existing audited `execute` → `exportExecution` path. No worker schedule
   resolver is added in this slice.
5. The SPA `register-services` report uses `serverReportId:
registration-services` and an audited CSV action. It keeps the report
   read-only and does not add service mutation.
6. No supplier inference, payment-advance ledger, personalized/NFS-e report,
   migration, provider, credential, target, deployment, production or
   external-system action is authorized by this slice.

## TDD acceptance

### RED

- The reports module test rejects the absent `registration-services`
  definition and permission/column contract.
- The API route test rejects the absent report definition/source, and has no
  account-scoped service mapping or strict date-bound evidence.
- The SPA workbench test rejects the disabled `Solicitar Excel` placeholder and
  requires the server-side execution/export request.

### GREEN

- Reports module catalog, API route/RBAC/filter/row-limit, SPA workbench and a
  focused browser contract pass.
- API and SPA typecheck/build pass, with CSV formula neutralization retained by
  the existing ReportsService exporter.
- Runtime inspection confirms `ServicesService` hydration is part of the
  database bootstrap path; no fallback claim is made for external or target
  environments.

The bounded checkpoint passed Services 17/17, Reports 14/14, compiled API
routes 14/14, SPA Reports 56/56, API/module/SPA builds and Playwright 3/3
after rebuilding the served SPA artifact. The initial browser timeout was a
stale-dist failure and is retained as such; the independent reviewer attempt
was rejected by account model policy and no reviewer PASS is claimed.

## Review and limits

Fresh scouts ranked the public API → outbox → real worker process chain as the
largest system risk, but that work requires a separate decision on long-lived
worker behavior when consumers are missing and touches concurrent process
fixtures. It remains open and is not silently substituted by this report
slice. Laboratory's SPA/API signer mismatch and distinct clinical-review
decision also remain open.

The browser proof may stub the API and local route tests may use a service
fixture; these prove the contract and tenant predicate, not PostgreSQL-backed
browser persistence, two-tenant restart/concurrency/failure behavior or
production authorization operations. Global parity, clinical parity,
provider/homologation, operations, coverage, accessibility and release remain
open.

The parent task remains `IN_PROGRESS/PARTIAL`: global Vetus parity is 98/100
with 4/11 areas verified and `NOT VERIFIED`, clinical parity is 100/100 with
2/3 verified and `NOT VERIFIED`, and enterprise readiness is 95/100 with
42 PASS, 3 WARN and 1 FAIL. No commit, push, deploy, provider, target or
production action occurred.
