# CVG-004 — align owner/patient registry Workbench loading with server reports

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `MEDIUM` / `SPA-REPORTS`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-IR-001`

## Objective

Align the `register-owners` and `register-patients` Reports Workbench load
paths with their existing audited server-backed reports. Both specs already
declare `serverReportId` and export through ReportsService, but initial load
still calls the process-local owner/patient list services. Close only this
caller inconsistency without changing the API report sources or CRUD.

## Frozen bounded contract

1. `register-owners` loads with
   `reportsService.execute({ reportId: 'registration-owners', filters })` and
   does not call `ownerService.list()`.
2. Owner rows are validated against exactly these seven server fields:
   `documentId`, `fullName`, `primaryContact`, `city`,
   `financialResponsible`, `status` and `createdAt`. Status remains the
   existing `active|inactive` value and financial responsibility remains
   `Sim|Não`.
3. `register-patients` loads with
   `reportsService.execute({ reportId: 'registration-patients', filters })`
   and does not call `patientService.list()`.
4. Patient rows are validated against exactly these eight server fields:
   `code`, `name`, `species`, `breed`, `sex`, `microchip`, `status` and
   `createdAt`. Existing status/species/sex labels, blank labels and cards are
   preserved from validated server rows.
5. Existing date filters are passed through `buildServerReportFilters`; bad
   rows fail with a user-facing error and no local fallback. Export remains
   the existing audited server-side execute → exportExecution path.
6. This is read-only SPA/report wiring only. API routes, report catalog/source,
   tenant authorization, owner/patient schema and CRUD remain unchanged.

## TDD acceptance

### RED

- Focused Workbench tests reject the owner/patient local list calls and require
  their respective server report IDs and date-filter propagation.
- Malformed owner/patient server rows fail before they can render.
- Existing table/card labels and audited export assertions remain active.

### GREEN

- Both registry screens derive visible rows/cards only from validated server
  executions and retain their current user-facing labels.
- Focused/full Workbench tests, SPA Vue typecheck/build and official coverage
  remain green without changing API/database/worker/provider paths.
- No unrelated report or registry screen changes are included.

## Closure evidence

- Intentional RED selected four owner/patient tests and produced four expected
  failures before implementation: local owner/patient list calls were still
  present and malformed server responses had no server execution boundary.
- Focused GREEN passed 4/4 and the complete Workbench suite passed 50/50.
- The SPA production build passed Vue typecheck, Vite transformation of 773
  modules and PWA generation. The complete workspace `typecheck` and `build`
  commands also passed.
- Official workspace coverage passed 185 test files, 2,159 tests and one
  explicit skip at 80.15% statements/lines, 80.79% branches and 86.62%
  functions.
- OpenAPI, migration-source, RLS, secret scan, Prettier and diff-hygiene
  checks passed. Fresh Vetus parity remains 100/100 evidence, 4/11 verified
  and `NOT VERIFIED`.
- The configured independent reviewer could not start because the account
  rejected its `gpt-5.3-codex` model; no independent approval is claimed.

## Explicit non-claims

- This does not redesign `registration-owners` or `registration-patients`
  API/source semantics, report catalog, tenant RLS or owner/patient CRUD.
- It does not add search/filter families, scheduled delivery, providers,
  credentials, target operations, production deployment, accessibility,
  backfill, legal retention or release evidence.
- Local component tests/build do not certify target-browser behavior,
  PostgreSQL-backed browser sessions, remote CI or global Vetus parity.
- Parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
  remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-registry-owners-patients-spa-server-load.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-REGISTRY-OWNERS-PATIENTS-SPA-SERVER-LOAD-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-registry-owners-patients-spa-server-load.json`
- `.agent/artifacts/CVG-004-report-registry-owners-patients-spa-server-load-2026-08-29.md`

## Control-plane boundary

This closure covers only the bounded SPA caller alignment. Keep the closed
services, appointments, professional-care and scheduled-report lease-fencing
gates unchanged within their scopes; keep parent CVG-004 and global ERP
`IN_PROGRESS/PARTIAL`, with promotion `BLOCKED`.
