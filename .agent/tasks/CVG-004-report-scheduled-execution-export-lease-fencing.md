# CVG-004 — fence scheduled-report execution and export persistence by the schedule lease

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `CLOSE` / `RECONCILED`
**Owner:** root integrator with TDD and direct audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-IR-001`

## Objective

Fence the durable execution and export artifacts produced by the scheduled
report worker with the schedule lease. A worker that loses its lease must not
write a stale execution/export artifact, while the worker that takes over must
be able to recompute the same deterministic run identifiers with fresh rows
and export content.

This is a new bounded slice after the delivery-row fence was closed. It does
not reopen that gate.

## Frozen bounded contract

1. Add an explicit scheduled execution/export path carrying the existing
   opaque schedule claim token and schedule id. Keep generic on-demand
   `execute` and `exportExecution` callers compatible and free of caller-
   supplied schedule capabilities.
2. In-memory scheduled persistence requires the account-local active schedule
   claim, matching token and unexpired lease before changing the execution or
   export maps. A stale, expired, foreign or blank capability raises the
   existing typed `ReportScheduleLeaseLostError` and leaves no new local
   artifact.
3. Database scheduled persistence requires the account, schedule, active
   claim token and unexpired lease. The schedule-row check is serialized with
   the write. Existing deterministic execution/export ids are refreshed by
   the current lease holder instead of being ignored by `ON CONFLICT DO
NOTHING`; a stale holder cannot insert or update either artifact.
4. The worker carries the schedule capability through scheduled execution and
   export before delivery/finalization. Lease loss stops stale processing and
   preserves the already-closed delivery-row fence and schedule-finalization
   behavior.
5. Preserve report payload definitions, generic API routes, delivery retry
   claims, provider calls, lease renewal/heartbeat, audit semantics, target,
   production, deployment, release and global ERP promotion. No migration is
   authorized unless source inspection proves the existing claim contract is
   insufficient.

## TDD acceptance

### RED

- Reports tests require stale scheduled execution and export persistence to
  fail closed without changing the in-memory artifact maps, while an active
  takeover claim refreshes deterministic execution/export content.
- Worker tests require the schedule capability to reach both scheduled
  execution and export paths and require lease loss to avoid stale schedule
  finalization.
- Disposable PostgreSQL tests require a stale worker to leave execution and
  export rows unchanged, while the current lease holder refreshes the same
  deterministic ids; a concurrency proof must prevent takeover interleaving
  with the conditional write.

### GREEN

- `ReportsService` exposes an explicit schedule-fenced execution/export
  capability and updates local state only after successful persistence.
- `DatabaseReportRepository` exposes conditional, serialized execution/export
  writes keyed by the active schedule claim and refreshes existing rows.
- `scheduled-report-job` propagates the schedule claim through the new paths
  without changing delivery/provider contracts.
- Focused module/worker/PostgreSQL tests, workspace regressions, coverage,
  static validators and independent review pass; parent/global ERP remains
  explicitly non-promoted.

## Selection checkpoint

- A fresh independent read-only scout confirmed that the delivery-row fence is
  sound but `saveExecution` and `saveExport` still use unfenced
  `ON CONFLICT (account_id, id) DO NOTHING`. The scheduled worker computes
  deterministic ids from the schedule tick, so takeover can retain stale
  artifacts instead of recomputing fresh output.
- Existing `report_schedules.claim_token` and `claim_until` columns and the
  repository lease contract are present; the correction is repository-local
  and can be attempted without a migration.
- The implementation-ready gate and authority are fresh for this residual;
  the closed delivery gate remains unchanged.

## Explicit non-claims

- This does not cancel or fence an external provider side effect already in
  flight, add provider idempotency, or redesign delivery retries.
- This does not add lease renewal, change schedule recurrence/finalization,
  alter report source freshness outside takeover recomputation, or certify
  distributed clocks/workers.
- This does not certify target roles/RLS, production, deployment, remote CI,
  backup/restore, accessibility, legal retention, Vetus parity, release or
  global ERP readiness. Parent/global ERP remains `IN_PROGRESS/PARTIAL` and
  promotion remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-execution-export-lease-fencing.json`
- `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-IR-001`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-GREEN-001`
- `packages/modules/reports/src/reports.test.ts`
- `apps/worker/src/jobs/scheduled-report-job.test.ts`
- `tests/integration/database/reports-scheduled-execution-export-lease-fencing-postgres.test.ts`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-EXECUTION-EXPORT-LEASE-FENCING-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-scheduled-execution-export-lease-fencing.json`
- `.agent/artifacts/CVG-004-report-scheduled-execution-export-lease-fencing-2026-08-30.md`

## Control-plane boundary

This task opens only the scheduled worker's durable execution/export
persistence fence. Keep the closed delivery-row, schedule-finalization,
owner/patient, services, appointments and professional-care gates unchanged;
keep parent CVG-004 and global ERP `IN_PROGRESS/PARTIAL`, with promotion
`BLOCKED`.
