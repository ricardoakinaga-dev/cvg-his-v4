# CVG-004 — audited registry report exports

**Status:** `PASS_BOUNDED` local; CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `BUILD` / `VERIFY`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** original CVG HIS v4 consolidation request; no target/provider or
production authority is implied.

## Objective

Close the repository-local export gap for the already persisted Vetus-style
owner and patient registries through the existing audited ReportsService path.
The slice is deliberately limited to `registration-owners` and
`registration-patients`; services, suppliers, Paymento Antecipado and custom
reports remain separate open gaps.

## Frozen contract

1. The report catalog exposes `registration-owners` with `owners.read` and
   `registration-patients` with `patients.read`.
2. API rows come from the existing owner/patient services, filter by the
   authenticated account and use strict ISO `dateFrom`/`dateTo` bounds against
   the stored `createdAt` fact.
3. Mappings contain only stored registry facts. Missing optional document,
   city, breed or microchip values remain blank; patient code uses the stored
   legacy id when present and otherwise the stored patient id.
4. Registry executions reject snapshots above 10,000 rows before the report
   execution is persisted. Execution and CSV export continue through the
   existing audited report route.
5. SPA owner and patient report buttons invoke the server-side report ids and
   retain the existing read-only table views. No registry mutation is added.
6. No migration, provider, credential, target, deployment, production or
   external-system action is authorized by this slice.

## TDD acceptance

### RED

- The SPA workbench test failed because the owner registry still exposed a
  disabled `Solicitar Excel` placeholder.
- The compiled API route suite failed the new registry test with
  `Report definition not found` before the catalog/source implementation.

### GREEN

- Reports module catalog test: 13/13 passed.
- Compiled API report route suite: 12/12 passed, including account filtering
  and required `billing.read` plus registry-specific permissions.
- SPA ReportWorkbench suite: 35/35 passed.
- SPA `vue-tsc --noEmit`, API/module builds and SPA production build passed.
- Focused Playwright browser contract: 2/2 passed; both execution and CSV
  export requests were asserted for owners and patients.
- OpenAPI, enterprise security/secrets, migration-source and deploy-surface
  checks passed.

## Review and limits

The specialized reviewer was rejected by the account model policy. A default
reviewer attempt timed out and was shut down without a report; it is not
counted as approval. The bounded result rests on the focused tests, builds,
browser contract and direct inspection.

The browser test stubs API responses and the route test uses local service
fixtures. This proves the report contract and tenant predicate locally, not
PostgreSQL browser persistence, two-tenant restart/concurrency/failure
behavior, or production authorization operations. General Vetus parity,
clinical parity, provider/homologation, backup/restore, remote CI, coverage,
accessibility, operations and release remain open.
