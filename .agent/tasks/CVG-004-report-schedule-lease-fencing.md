# CVG-004 — fenced scheduled-report execution leases

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `VERIFY` / `CLOSE`
**Owner:** root integrator with TDD and direct final audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-IR-001`

## Objective

Prevent an expired scheduled-report worker from finalizing or clearing a
schedule after another worker has taken over its durable lease. Correct only
the claim propagation and finalization boundary; preserve report payloads,
delivery leases and the existing schedule compatibility surface.

## Frozen bounded contract

1. A due-schedule claim returns an opaque `claimToken` paired with the
   `ReportScheduleSummary`, its `claimUntil` and `claimWorkerId`. The existing
   `claimDueSchedules` summary wrapper remains available for compatibility;
   the scheduled-report job uses the token-bearing method.
2. `recordScheduleExecution` requires the claim token for the claimed
   schedule. A token must match the account and schedule and remain active at
   finalization. A lost/expired token raises a typed lease-loss error and does
   not mutate the local schedule or persist a stale execution state.
3. The database finalization writes schedule recurrence/error fields only when
   `account_id`, `id`, `claim_token` and an active `claim_until` match. It
   clears claim columns only in that successful fenced update and returns a
   boolean/typed lease loss otherwise. There is no worker fallback to the
   unfenced `saveSchedule` path.
4. The in-memory scheduling fallback applies the same token/expiry guard for
   bounded unit tests. Explicit administrative schedule writes may retain their
   existing claim-release semantics; the worker completion path is fenced.
5. The worker passes the same token on both successful and failed report
   execution finalization. If finalization loses the lease, it records a
   bounded failure/metric without creating stale failed-delivery rows or
   throwing an unfenced retry that can overwrite the new owner.
6. No report row/payload, delivery-provider, recipient, schedule frequency,
   API client, migration, provider, target, production, deployment, backup,
   retention, legal or release semantics are changed unless required only to
   express this existing claim contract.

## TDD acceptance

### RED

- Reports module tests reject the absent token-bearing claim, missing token
  finalization and stale in-memory takeover.
- Worker tests reject a scheduled job that does not propagate the claim token
  and require a lease-loss result without stale delivery side effects.
- Disposable PostgreSQL tests reject stale worker finalization after lease
  expiry/takeover and require the current worker to finalize exactly once,
  leaving claim columns clear only for the current token.

### GREEN

- ReportsService and DatabaseReportRepository expose the token-bearing claim
  and fenced finalization contract.
- `scheduled-report-job` carries the claim token through success/failure and
  handles lease loss without stale schedule/delivery mutation.
- Focused module/worker tests, real PostgreSQL takeover proof, worker/API
  regressions, coverage and static validators pass; global parity and
  promotion remain blocked.

## Closure evidence

- **RED:** The reports module intentionally failed 2 expected assertions out of
  25 before implementation because `claimDueSchedulesWithLease` was absent;
  the worker source test and the disposable PostgreSQL test also failed at the
  missing token-bearing method boundary. No product implementation was
  changed before this RED evidence.
- **GREEN:** Reports tests passed 25/25, the compiled scheduled-report job
  passed 5/5, and the reports/worker builds passed after the token-bearing
  claim and fenced finalization implementation.
- **PostgreSQL:** The disposable canonical-migration takeover proof passed
  1/1. A stale worker could not finalize or clear the current claim; the
  current worker finalized successfully. The existing delivery persistence
  regression passed 2/2.
- **Regression:** The worker package suite passed 118/118; the compiled API
  suite passed 511/511; workspace typecheck and build passed, including the
  production SPA bundle (773 modules).
- **Quality:** Official coverage passed 185 test files with 2,159 tests passed
  and one explicit skip at 80.15% statements/lines, 80.78% branches and
  86.62% functions. OpenAPI (354 paths/40 tags/413 schemas), migration-source,
  RLS (165/166 protected with one documented exception), secret scan,
  formatting and diff hygiene passed. The fresh Vetus audit remains 100/100
  evidence but only 4/11 verified and therefore non-promoting.
- **Independent review:** A read-only fallback review completed and found no
  in-scope account/SQL bypass, but did not approve the slice end-to-end. It
  identified external provider/export/delivery/audit side effects that can
  occur before schedule finalization and the absence of lease renewal as
  residual scope risks. These findings are recorded transparently; no global
  or production approval is inferred.

The bounded implementation is closed as `PASS_BOUNDED` with `MEDIUM`
confidence under the verified gate and artifact recorded below.

## Explicit non-claims

- This does not certify provider idempotency, email delivery, distributed
  clock quality, target database roles, worker deployment topology or
  production SLOs.
- This does not fence provider/export/delivery/audit or other external side
  effects that happen before the schedule finalization fence, and it does not
  add a heartbeat or lease-renewal protocol for long-running jobs.
- The legacy summary-only `claimDueSchedules` wrapper remains a compatibility
  surface and drops the token; any finalization caller must use
  `claimDueSchedulesWithLease` and pass its token.
- The PostgreSQL proof uses a disposable account and controlled claim expiry;
  it is not a real multi-process concurrency, clock-topology or deployment
  certificate.
- It does not redesign schedule APIs, report payloads, delivery retry leases,
  report semantics, external integrations, Vetus parity or global ERP
  readiness.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-schedule-lease-fencing.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-POSTGRES-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULE-LEASE-FENCING-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-schedule-lease-fencing.json`
- `.agent/artifacts/CVG-004-report-schedule-lease-fencing-2026-08-29.md`

## Control-plane boundary

This bounded slice is closed only within its own scope. Keep the previous
professional-care and appointments gates closed only within their own scopes;
keep parent CVG-004 and global ERP `IN_PROGRESS/PARTIAL`, with promotion
`BLOCKED`. Reconcile the control plane, then return to fresh read-only
residual scouting under a new authority.
