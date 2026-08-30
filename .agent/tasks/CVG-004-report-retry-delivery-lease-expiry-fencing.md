# CVG-004 — fence failed report-delivery retry finalization by active lease

**Status:** `COMPLETE_BOUNDED`; parent CVG-004 remains `IN_PROGRESS/PARTIAL`.
**Stage/activity:** `CLOSE` / `RECONCILED`
**Owner:** root integrator with TDD and direct audit
**Parent:** CVG-004 Vetus parity journeys
**Tier/risk/blast radius:** `T3_SYSTEM` / `HIGH` / `CROSS_SYSTEM`
**Authority:** `.agent/authority.jsonl#AUTH-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-IR-001`

## Objective

Prevent a failed-report-delivery retry worker from finalizing a durable
delivery row after its lease has expired, even when another worker has not yet
taken over the row. The in-memory service already checks expiry; the
PostgreSQL finalization path must enforce the same boundary.

## Frozen bounded contract

1. Keep the existing opaque failed-delivery `claimToken` capability and
   `claimFailedScheduleDeliveries` API unchanged. Do not reinterpret it as a
   schedule claim or change retry selection, provider calls or retry policy.
2. `DatabaseReportRepository.saveClaimedDelivery` must update a row only when
   `account_id`, delivery id, claim token and `claim_until > clock_timestamp()`
   all match. The existing boolean result and service error mapping remain
   unchanged.
3. An active delivery claim continues to finalize successfully and clears its
   claim fields. An expired claim is rejected before takeover and leaves the
   delivery status, artifact references, error and claim token unchanged.
4. A stale token remains rejected after another worker takes over. Existing
   takeover/concurrency coverage remains valid and is extended only as needed
   to distinguish expiry rejection from token replacement.
5. The current `0143_reports_delivery_leases.sql` columns are sufficient; no
   migration is authorized. Preserve report payloads, schedule fencing,
   recurrence, provider/idempotency behavior, lease renewal, target,
   production, deployment, release and global ERP promotion boundaries.

## TDD acceptance

### RED

- A disposable PostgreSQL test must prove that an expired retry claim can
  still be present without takeover and that `saveClaimedDelivery` currently
  accepts the stale finalization, producing the expected failure before the
  implementation change.
- The same test must retain active-claim success and post-takeover stale-token
  rejection assertions.

### GREEN

- The repository adds the active-expiry predicate to the conditional update.
- ReportsService and worker retry contracts remain source-compatible.
- Focused PostgreSQL/module/worker tests, workspace regression, coverage,
  static validation and independent review are run before bounded closure.

## Selection checkpoint

Fresh direct read-only reconciliation after the scheduled execution/export
closure compared the existing in-memory and PostgreSQL retry paths. The
in-memory `assertDeliveryClaim` rejects a missing, mismatched or expired
claim, while `saveClaimedDelivery` currently predicates only on account,
delivery id and token. The existing database test expires a claim and then
performs a takeover before checking the stale write, so it does not prove the
pre-takeover expiry boundary. The prior delivery-fence artifact explicitly
retains retry-lease expiry fencing as an adjacent residual.

## RED checkpoint

The intentional PostgreSQL RED passed the two existing delivery persistence
cases and failed only the new expiry-before-takeover assertion: the repository
returned `true` for `saveClaimedDelivery` after `claim_until` was moved into
the past. The new test also confirmed that the failure is observable before
any takeover changes the token. No production implementation was changed
before this RED.

## GREEN checkpoint

The minimal repository change adds `claim_until > clock_timestamp()` to the
conditional retry-finalization update. The focused PostgreSQL suite now passes
`3/3`, the ReportsService package suite passes `31/31`, and the complete worker
package suite passes, including scheduled-report `11/11` and all other worker
groups. Active finalization, expiry-before-takeover rejection and existing
post-takeover stale-token rejection remain green. No migration or provider
behavior changed; bounded closure still requires regression, quality and
independent review evidence.

## Explicit non-claims

- This does not add provider idempotency, cancellation, outbox semantics or
  exactly-once external delivery.
- This does not change retry backoff, maximum attempts, redrive,
  reconciliation status, claim renewal/heartbeat, schedule claims or worker
  topology.
- This does not certify target roles/RLS, production, deployment, remote CI,
  backup/restore, accessibility, legal retention, Vetus parity, release or
  global ERP readiness.
- Parent CVG-004/global ERP remains `IN_PROGRESS/PARTIAL` and promotion
  remains `BLOCKED`.

## Planned evidence

- `.agent/gates/implementation-ready-CVG-004-report-retry-delivery-lease-expiry-fencing.json`
- `.agent/authority.jsonl#AUTH-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-IR-001`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-RED-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-GREEN-001`
- `packages/modules/reports/src/index.ts`
- `packages/modules/reports/src/reports.test.ts`
- `tests/integration/database/reports-delivery-postgres.test.ts`
- `.agent/gates/verified-CVG-004-report-retry-delivery-lease-expiry-fencing.json`
- `.agent/artifacts/CVG-004-report-retry-delivery-lease-expiry-fencing-2026-08-30.md`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-REVIEW-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-004-REPORT-RETRY-DELIVERY-LEASE-EXPIRY-FENCING-CONTROL-PLANE-001`

## Control-plane boundary

This task opens only the PostgreSQL retry-finalization expiry predicate and
its bounded proof. Keep the closed schedule-delivery, schedule-finalization
and scheduled execution/export gates unchanged; keep parent CVG-004 and
global ERP `IN_PROGRESS/PARTIAL`, with promotion `BLOCKED`.

## Bounded closure checkpoint

The repository-local correction is complete as `PASS_BOUNDED`: the only
production change is the active `claim_until > clock_timestamp()` predicate
on `DatabaseReportRepository.saveClaimedDelivery`, and the new PostgreSQL
test proves rejection before takeover while preserving the failed row. The
active-claim success and post-takeover stale-token cases remain green.

Verification completed:

- Intentional RED failed exactly at the missing expiry predicate; the two
  existing delivery cases passed and the disposable database was cleaned up.
- Focused GREEN passed PostgreSQL `3/3`, ReportsService `31/31`, and the full
  worker package suite, including scheduled-report `11/11`.
- API regression passed `511/511`.
- Official coverage passed `2,165` tests with `1` skip: statements `80.19%`,
  branches `80.76%`, functions `86.76%`, lines `80.19%`.
- Full workspace typecheck and build passed, including SPA production/PWA
  generation.
- Secrets, OpenAPI (`354` paths / `413` schemas), migration source-of-truth,
  RLS (`165/166`, one documented exception), Prettier and `git diff --check`
  passed.

## Independent review reconciliation

The independent read-only review returned `APPROVE_BOUNDED` with no Critical,
High or unresolved in-scope finding. It verified the account, delivery id,
opaque token and active-expiry predicate, plus the tenant/RLS boundary. The
review recorded one Low-confidence residual observation: takeover selection
still uses the caller-provided `asOf` while finalization uses the database
clock; this is pre-existing and outside the frozen slice.

The review did not execute tests or certify providers, targets, deployment or
global readiness. Provider side effects/idempotency and lease renewal remain
explicit adjacent residuals.

## Explicit non-claims and next residuals

This closure does not add provider idempotency/cancellation, outbox semantics,
exactly-once external delivery, retry-policy changes, redrive/reconciliation,
lease renewal, target-role/RLS certification, production, deployment, release
or Vetus/global ERP parity. Parent CVG-004/global ERP remains
`IN_PROGRESS/PARTIAL` and promotion remains `BLOCKED`.

No commit, push, deployment, provider mutation or target operation occurred.

Final gate: `.agent/gates/verified-CVG-004-report-retry-delivery-lease-expiry-fencing.json`.
