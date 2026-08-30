# CVG-004 — persisted professional-care report

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-IR-001`

## Objective

Replace only the `professional-care` Reports Workbench path that currently
loads the process-local `appointmentService` and aggregates in the browser
with an authenticated, tenant-scoped, persisted appointment aggregate and
server-side audited export. The already closed `appointments` report remains
unchanged.

## Frozen bounded contract

1. The report id is `scheduling-professional-care`, its required permission is
   `staff.read` in addition to the existing `billing.read` Reports Workbench
   gate, and its grain is one row per practitioner group in persisted
   appointments belonging to the authenticated account. Appointments without
   a practitioner form the deterministic `Sem profissional` group.
2. The aggregate exposes exactly these six fields, in this order:
   `professional`, `scheduled`, `completed`, `checkedIn`, `cancelled`,
   `services`. `professional` is the persisted practitioner staff id or
   `Sem profissional`; no staff display name is resolved by a local registry or
   an unscoped join. `services` is the count of distinct non-null persisted
   service ids in the group.
3. `dateFrom` and `dateTo` are strict ISO calendar dates, inclusive against the
   UTC calendar date of persisted `scheduledAt`; inverted periods fail before
   the source read. Normalized counts map database `scheduled|confirmed` to
   `scheduled`, `checked_in|in_progress` to `checkedIn`, `completed` to
   `completed` and `cancelled|no_show` to `cancelled`. Results are deterministic
   by `scheduled DESC`, then `professional ASC`.
4. The source is bounded at 10,001 persisted appointment rows so more than
   10,000 matching appointments fails closed before ReportsService execution
   persistence. It requires database mode, active tenant context when present,
   parameterized/account-scoped predicates and existing appointments RLS rails;
   it never falls back to the in-memory scheduling map.
5. The API revalidates filters and aggregate row shape, derives account identity
   only from the authenticated principal, requires `staff.read`, and uses the
   existing ReportsService execution/export/audit boundary. The SPA loads and
   exports this server report; it does not call `appointmentService.list` for
   `professional-care`.
6. No display-name enrichment, patient/owner joins, commission calculation,
   clinical productivity semantics, encounter/queue lifecycle, appointment
   writes, worker scheduling, providers, migrations, target, deployment,
   production, backfill, legal retention or release action is authorized.

## TDD acceptance

### RED

- The scheduling tests reject the absent persisted professional-care aggregate,
  invalid date handling, account/tenant mismatch, nondeterministic grouping and
  missing 10,001-row bound.
- The ReportsService catalog test rejects the absent definition, `staff.read`
  permission, exact six-field contract and date filters.
- The API route tests reject the unsupported branch, in-memory source,
  malformed aggregate rows, invalid periods, overflow and missing account
  scope, while preserving the generic execution/export/audit path.
- The SPA Workbench test rejects `appointmentService.list` and browser-local
  CSV for `professional-care`, requiring server execution and audited export.

### GREEN

- Scheduling service/repository, report catalog, API/runtime seam and SPA
  Workbench pass focused tests with the frozen aggregate contract.
- Disposable PostgreSQL proves account/RLS isolation, inclusive UTC dates,
  normalized status counts, distinct services, unassigned grouping,
  deterministic ordering and the real 10,001-row overflow sentinel.
- API/module/SPA typechecks and builds, security/quality validators and report
  regressions remain green; global parity and promotion remain blocked.

## Explicit non-claims

- This report does not certify professional names, productivity/commission
  semantics, billing attribution, patient/owner enrichment or complete Vetus
  professional-care parity.
- Local PostgreSQL and SPA evidence does not certify target roles, production
  scale, external providers, accessibility, backup/restore, remote CI or
  release acceptance.

## Verification closure

- TDD RED preceded implementation; focused module/catalog, compiled API and
  SPA tests then passed `84/84`, `2/2` and `47/47` respectively.
- Disposable PostgreSQL passed `3/3`, including RLS/account isolation,
  tenant mismatch, normalized statuses, distinct services, unassigned grouping
  and the real 10,001-row overflow sentinel.
- The compiled reports route suite passed `45/45`; the full API passed
  `511/511`; module/API builds, SPA typecheck and the 773-module production
  build passed.
- Official coverage passed 2,158 tests plus one explicit skip at
  `80.13%` statements/lines, `80.80%` branches and `86.56%` functions.
  OpenAPI, migration-source, RLS, secret, Prettier and diff checks passed.
- No independent review verdict was obtained. The final gate therefore carries
  `MEDIUM` confidence and does not infer reviewer approval.

## Evidence

- `.agent/gates/implementation-ready-CVG-004-report-professional-care-persisted.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-POSTGRES-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-PROFESSIONAL-CARE-PERSISTED-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-professional-care-persisted.json`
- `.agent/artifacts/CVG-004-report-professional-care-persisted-2026-08-29.md`

## Control-plane boundary

Only this bounded slice is closed as `PASS_BOUNDED` under
`.agent/gates/verified-CVG-004-report-professional-care-persisted.json`. Keep
the previous persisted appointments gate closed only within its own scope;
keep parent CVG-004 and global ERP `IN_PROGRESS/PARTIAL`, with promotion
`BLOCKED`. No target, production, deployment, provider, credential, commit,
push or release action was performed.
