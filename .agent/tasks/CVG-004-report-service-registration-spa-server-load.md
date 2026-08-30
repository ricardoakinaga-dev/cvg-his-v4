# CVG-004 — align register-services Workbench loading with the server report

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `MEDIUM` / `SPA-REPORTS`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-IR-001`

## Objective

Align the `register-services` Reports Workbench load path with the existing
server-backed, audited `registration-services` report. The report already
declares a server report id and uses it for export, but its initial table/card
load still calls the process-local `servicesService.list()` path. Close only
that inconsistency without changing the API report source or service CRUD.

## Frozen bounded contract

1. When `reportKey` is `register-services`, `loadReport` calls
   `reportsService.execute({ reportId: 'registration-services', filters })`
   and does not call `servicesService.list()`.
2. The Workbench validates every returned row against exactly the six existing
   server report fields: `code`, `name`, `description`, `basePrice`, `status`
   and `createdAt`. Invalid rows fail with a user-facing load error rather than
   being rendered or replaced by a local fallback.
3. The visible services table and cards derive from the validated server
   execution, preserving the current labels for blank code/description and
   active/inactive status. Existing date filters are passed through the same
   `buildServerReportFilters` boundary used by export.
4. Export remains the existing audited server-side
   `reportsService.execute` → `reportsService.exportExecution` flow; no browser
   CSV or duplicate local source is introduced.
5. This is read-only SPA/report wiring only. The existing API route, persisted
   services source, `service.read` authorization, report catalog, six-field
   semantics and service CRUD remain unchanged.

## TDD acceptance

### RED

- The focused Workbench test rejects `servicesService.list()` on initial load,
  requires `reportsService.execute` with `registration-services` and date
  filters, and requires table/card rendering from the execution rows.
- A malformed server row is rejected before it can appear in the Workbench.
- The test preserves the existing audited export assertion and verifies that
  the browser does not use the local services list for this report.

### GREEN

- The register-services Workbench loads and validates the server report,
  renders the same six-field rows/cards and preserves audited export.
- Focused SPA tests, SPA typecheck/build and the relevant compiled regression
  pass without changing the API/database/provider/worker paths.
- No unrelated report or service screen changes are included.

## Closure evidence

- **RED:** The intentional focused selection ran 48 discovered tests with 2
  selected failures and 46 skipped before implementation: the component still
  called `servicesService.list()` and had no server execution boundary for the
  malformed-row case.
- **GREEN:** The focused server-backed services selection passed 2/2 and the
  complete `ReportWorkbenchPage` suite passed 48/48. The server execution,
  existing date filters, exact six-field validation, no-fallback error and
  audited export assertions are covered.
- **Regression:** The SPA production build passed with Vue typecheck and 773
  transformed modules. Official workspace coverage passed 185 test files,
  2,159 tests and one explicit skip.
- **Quality:** Coverage is 80.15% statements/lines, 80.79% branches and
  86.62% functions. OpenAPI (354 paths/40 tags/413 schemas), migration-source,
  RLS (165/166 protected with one documented exception), secret scan,
  formatting, diff hygiene and the fresh parity audit passed. Parity remains
  100/100 evidence, 4/11 verified and `NOT VERIFIED`.
- **Independent review:** The fallback reviewer was closed after bounded waits
  without a conclusion. No independent approval is claimed; this closure is
  based on direct source, test, build and static evidence with MEDIUM
  confidence.
- **Final decision:** The verified gate and artifact close only this SPA
  wiring slice as `PASS_BOUNDED` / `COMPLETE_BOUNDED`. Parent CVG-004/global
  ERP remain `IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

## Explicit non-claims

- This does not redesign the `registration-services` API/source, services
  schema, tenant RLS, report catalog or service CRUD.
- This does not add scheduled worker delivery, provider behavior, external
  integrations, credentials, target operations, production deployment,
  accessibility certification, backfill, legal retention or release evidence.
- Local component tests and build do not certify a target-browser,
  PostgreSQL-backed browser session, remote CI or global Vetus parity.
- The parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
  remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-service-registration-spa-server-load.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SERVICE-REGISTRATION-SPA-SERVER-LOAD-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-service-registration-spa-server-load.json`
- `.agent/artifacts/CVG-004-report-service-registration-spa-server-load-2026-08-29.md`

## Control-plane boundary

This bounded slice is closed only within its own scope. Keep the closed
appointments, professional-care and scheduled-report lease-fencing gates
unchanged within their scopes; keep parent CVG-004 and global ERP
`IN_PROGRESS/PARTIAL`, with promotion `BLOCKED`. Return to fresh read-only
residual scouting under a new implementation-ready authority before expanding
into API/source, CRUD, worker/provider, target, production or release scope.
