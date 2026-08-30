# CVG-004 — persisted appointments report in the Reports Workbench

**Status:** `COMPLETE_BOUNDED` / `PASS_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-APPOINTMENTS-PERSISTED-IR-001`

## Objective

Replace the `appointments` Reports Workbench path that currently reads the
process-local `/appointments` projection and creates a browser-local CSV with
an authenticated, tenant-scoped, persisted report execution and audited
server-side export. This slice is limited to the appointment report; the
separate `professional-care` aggregate remains a later task.

## Frozen bounded contract

1. The report id is `scheduling-appointments`, its required permission is
   `scheduling.read` in addition to the existing `billing.read` Reports
   Workbench gate, and its grain is one row per persisted appointment belonging
   to the authenticated account.
2. The source row and catalog expose exactly these thirteen fields, in this
   order: `appointmentId`, `scheduledAt`, `status`, `reason`, `patientId`,
   `ownerId`, `practitionerStaffId`, `serviceId`, `unit`, `specialty`,
   `resourceLabel`, `createdAt`, `updatedAt`. Values are persisted facts; no
   patient, owner, professional or service name is resolved from a process-
   local cache by the report source.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against the
   UTC calendar date of `scheduledAt`; inverted periods fail before the source
   read. `status` accepts only the normalized appointment statuses
   `scheduled`, `checked_in`, `completed` and `cancelled`. `search` is trimmed,
   case-insensitive, capped at 200 characters and matches persisted IDs and
   appointment text fields (`reason`, `unit`, `specialty`, `resourceLabel`).
   Results are deterministic by `scheduledAt ASC`, then `appointmentId ASC`.
4. The database source is bounded at 10,001 rows so more than 10,000 matching
   rows fails closed before ReportsService execution persistence. The source
   requires database mode, verifies the active tenant context when present,
   uses parameterized predicates and the existing appointments RLS/account
   rails, and never falls back to the in-memory scheduling map for this report.
5. The API derives account identity only from the authenticated principal,
   rechecks filters and row shape, applies the existing ReportsService
   execution/export/audit boundary, and fails closed for an unavailable or
   in-memory scheduling source. The SPA `appointments` report executes and
   exports this server report while preserving its existing read-only table
   presentation. `professional-care` remains on its existing local path.
6. No appointment writes, queue lifecycle, patient/owner joins, professional
   productivity aggregation, scheduling worker, provider, migration, target,
   deployment, production, backfill, legal-retention or release action is
   authorized by this task.

## TDD acceptance

### RED

- The scheduling module/repository tests reject the absent persisted report
  source, invalid filter handling, cross-account context, nondeterministic
  ordering and missing 10,001-row read bound.
- The ReportsService catalog test rejects the absent `scheduling-appointments`
  definition, permission, filters and exact thirteen-field contract.
- The API route tests reject the unsupported report branch, in-memory source,
  malformed source rows, invalid status/date/search filters, overflow and
  missing account scope.
- The SPA Workbench test rejects the local `appointmentService.list` and
  browser-local CSV path for `appointments`, requiring server execution and
  audited export while keeping `professional-care` compatible.

### GREEN

- The scheduling repository/service, report catalog, API route/runtime seam and
  SPA Workbench pass focused tests with the frozen contract.
- A disposable PostgreSQL integration proves two-account isolation, normalized
  status filtering, inclusive UTC dates, literal search, deterministic order,
  exact rows, source overflow and durable report execution/export behavior.
- API/module/SPA typechecks and builds, security/quality validators and the
  existing report regressions remain green; global parity and promotion remain
  blocked.

## Explicit non-claims

- This report does not certify patient/owner/professional name enrichment,
  productivity semantics, queue/encounter lifecycle or complete Vetus agenda
  parity.
- Local PostgreSQL and SPA evidence does not certify target roles, production
  scale, external providers, continuous workers, accessibility, backup/restore
  or release acceptance.

## Verification closure

- Intentional TDD RED was executed before implementation: the scheduling and
  reports module selection recorded the expected three failures, and the SPA
  appointment export expectation rejected the old local CSV path.
- Focused GREEN passed scheduling/reports `81/81`, compiled reports API route
  `42/42` and SPA Workbench `45/45`.
- Disposable PostgreSQL passed `3/3`, including account/RLS isolation,
  inclusive UTC periods, normalized statuses, literal search, deterministic
  ordering and a real `10,001`-row overflow sentinel.
- API package regression passed `509/509`; module/API builds, SPA typecheck and
  production build passed (`773` modules transformed).
- Official coverage passed `2,156` tests with one explicit skip at `80.08%`
  statements/lines, `80.65%` branches and `86.55%` functions. RLS remained
  `165/166` protected tables with one documented exception; migration-source,
  OpenAPI (`354` paths / `40` tags / `413` schemas), secret scan, Prettier and
  diff hygiene passed.
- The first wide coverage run exposed a clock-boundary flake in an unrelated
  MFA test. The test now uses its already controlled `nowMs`; the isolated MFA
  suite passed `61/61` and the final full coverage run passed. No production MFA
  behavior changed.
- No fresh independent approval was obtained in this execution context. The
  gate therefore records medium confidence and does not infer reviewer
  approval.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-appointments-persisted.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-POSTGRES-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-APPOINTMENTS-PERSISTED-REVIEW-001`
- `.agent/gates/verified-CVG-004-report-appointments-persisted.json`
- `.agent/artifacts/CVG-004-report-appointments-persisted-2026-08-29.md`

## Control-plane decision

Close only this bounded report as `COMPLETE_BOUNDED`. Keep parent CVG-004 and
the global ERP `IN_PROGRESS/PARTIAL`, with promotion `BLOCKED`. The next
activity is fresh read-only residual scouting under a new implementation-ready
authority. No provider, credential, target, production, deployment, backfill,
legal-retention or release action was performed or authorized.
