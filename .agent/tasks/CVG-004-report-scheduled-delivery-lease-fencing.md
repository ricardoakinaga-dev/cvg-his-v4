# CVG-004 — fence scheduled-report delivery persistence by schedule lease

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `CLOSE` / `RECONCILED`
**Owner:** root integrator with TDD and direct audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-IR-001`

## Objective

Prevent a scheduled-report worker that has lost its schedule lease from
creating or finalizing durable delivery rows after another worker has taken
over. Correct only the local/durable delivery persistence fence and the
worker's token propagation; preserve report payloads, retry-delivery leases
and the existing provider adapter contract.

## Frozen bounded contract

1. The schedule claim token and the failed-delivery retry claim token remain
   distinct opaque capabilities. `deliverExport` receives an explicit
   `scheduleClaimToken` only for the scheduled-job path; existing retry callers
   continue to use their delivery claim token.
2. `recordScheduleDeliveries` accepts an optional schedule claim token for
   worker failure finalization. When present, every delivery write requires
   the same account, schedule and currently active schedule lease.
3. `deliverExport` checks and persists its placeholder and final delivery
   state through the active schedule lease when called by the scheduled
   worker. A stale/expired/taken-over token raises a typed schedule lease-loss
   error and does not perform an unfenced delivery-row write.
4. The database repository exposes a fenced delivery write whose INSERT or
   conflict UPDATE is conditional on the matching `report_schedules` claim
   token and active lease. The in-memory service applies the equivalent
   schedule-token/expiry guard; a repository without the fenced capability
   fails closed rather than falling back to `saveDelivery`.
5. The scheduled worker passes the schedule token through success and failure
   delivery paths, orders failure-row persistence while the schedule lease is
   still held, and handles lease loss without stale recurrence/delivery
   mutation. Existing `recordScheduleExecution` fencing remains unchanged.
   Export-audit failures before `deliverExport` preserve the execution id and
   create a fenced retryable delivery-history row.
6. External provider calls, provider idempotency, export generation, audit
   delivery semantics, heartbeat/renewal, target operations, production,
   deployment, credentials, migrations unrelated to this repository contract,
   release and global ERP promotion remain out of scope. A provider call may
   already be in flight when a short lease expires; this slice guarantees the
   local durable fence only.

## TDD acceptance

### RED

- Worker tests require the scheduled claim token in `deliverExport` and in
  failure delivery persistence, with delivery persistence occurring before
  schedule finalization when the source fails.
- Reports tests require a stale schedule token to fail closed for both direct
  delivery-history writes and `deliverExport`, while an active token succeeds.
- Disposable PostgreSQL tests require a stale schedule worker to leave no
  delivery row and the current lease holder to persist exactly one sent row.

### GREEN

- ReportsService and `DatabaseReportRepository` expose a separate schedule
  claim fence for delivery writes without changing retry-delivery claims.
- `scheduled-report-job` propagates the token and preserves batch failure
  semantics while preventing unfenced stale writes.
- Focused module/worker tests, PostgreSQL takeover proof, worker/API/workspace
  regressions, coverage and static validators pass; global parity and
  promotion remain blocked.

## Historical checkpoints

- **RED:** The focused reports selection failed 2 expected new assertions;
  the worker selection failed 2 expected new assertions; and the disposable
  PostgreSQL schedule-lease file passed its existing takeover case but failed
  the new stale-delivery case because `deliverExport` resolved and persisted
  after takeover. No production implementation was changed before this RED.
- **Next:** Implement the distinct schedule claim capability and conditional
  delivery persistence, then rerun the focused tests before broad regressions.

## GREEN checkpoint

- The ReportsService suite passed 27/27, the compiled worker suite passed with
  its scheduled-report job at 8/8, and the disposable PostgreSQL schedule
  lease file passed 3/3, including stale-delivery rejection, current-holder
  single-row persistence and concurrent schedule-row serialization.
- The worker now records an export-audit failure as fenced retryable delivery
  history before finalizing the schedule, preserving the execution id.
- Full workspace typecheck/build passed; official coverage passed 2,161 tests
  with one explicit skip at 80.11% statements, 80.78% branches, 86.62%
  functions and 80.11% lines. Reports, worker, API, integration, security,
  OpenAPI, migration-source, RLS, formatting and diff checks passed.

## Review remediation checkpoint

- The independent bounded review identified a PostgreSQL check/write TOCTOU
  risk and a worker export-audit failure path that could lose retry history.
- The delivery fence now locks the active schedule row with `FOR UPDATE`, and
  the concurrent PostgreSQL test proves a takeover cannot interleave while a
  delivery write is blocked on its row.
- The worker now tracks whether delivery started, records pre-delivery
  export/audit failures with the schedule token, and preserves `executionId`
  during failure finalization.
- The focused audit-failure RED/GREEN proof showed that provider invocation
  remains at zero when export audit fails while one retryable fenced delivery
  history row is retained.
- Retry-lease expiry fencing, scheduled execution/export persistence fencing
  and provider-side-effect races remain adjacent residuals; they are not
  claimed by this delivery-row gate and require separate authority.

## Preliminary closure checkpoint — superseded by delayed review finding

- The preliminary seven-criterion gate was recorded as `PASS_BOUNDED` before
  the delayed second review returned. That gate is superseded for closure by
  the follow-up finding below; no final bounded closure is currently claimed.
- No commit, push, deployment, provider mutation, target operation or global
  ERP promotion occurred.

## Review follow-up checkpoint — remediated

- The delayed independent re-review found one MEDIUM in-scope issue: the worker
  marked `deliveryStarted` before `deliverExport` durably created its
  placeholder. A non-lease delivery setup/persistence error could therefore
  finalize the schedule without a retryable failure-history row.
- The RED regression reproduces the missing `delivery-history` step; the
  remediation moves the marker after successful `deliverExport` return so any
  non-lease setup/persistence error enters the existing fenced failure-history
  path. Lease-loss errors still fail closed without stale finalization.
- Post-remediation ReportsService, worker, PostgreSQL, API, coverage, full
  typecheck/build, static validators and final review reconciliation passed.
- The v2 seven-criterion bounded gate is `PASS_BOUNDED`; no unresolved
  in-scope review finding remains. Parent/global ERP remains explicitly open.

## Explicit non-claims

- This does not guarantee that an external SMTP/API/provider side effect is
  cancelled when a lease expires, nor does it certify provider idempotency.
- This does not add lease renewal/heartbeat or redesign scheduled report
  payloads, report sources, API clients, retry-delivery claim semantics or
  audit event contracts.
- This does not certify distributed clock quality, worker topology, target
  roles/RLS, production, deployment, remote CI, backup/restore, accessibility,
  legal retention, Vetus parity or release readiness.
- Parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
  remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-scheduled-delivery-lease-fencing.json`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-CONCURRENT-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-CONCURRENT-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-AUDIT-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-AUDIT-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-SETUP-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-SETUP-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-REGRESSION-V2-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-QUALITY-V2-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-REVIEW-V2-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-POSTGRES-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-SCHEDULED-DELIVERY-LEASE-FENCING-CONTROL-PLANE-001`
- `.agent/gates/verified-CVG-004-report-scheduled-delivery-lease-fencing.json`
- `.agent/gates/verified-CVG-004-report-scheduled-delivery-lease-fencing-v2.json`
- `.agent/artifacts/CVG-004-report-scheduled-delivery-lease-fencing-2026-08-30.md`

## Control-plane boundary

This task opens only the scheduled-worker delivery persistence fence. Keep the
closed owner/patient, services, appointments, professional-care and schedule
execution lease gates unchanged within their scopes; keep parent CVG-004 and
global ERP `IN_PROGRESS/PARTIAL`, with promotion `BLOCKED`.
