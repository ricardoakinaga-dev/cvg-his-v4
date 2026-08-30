# CVG-002C2 — corrida de faturamento diário com chaves distintas

**Status:** `COMPLETE_BOUNDED` — parent CVG-002/CVG-002C2 remains `IN_PROGRESS/PARTIAL`  
**Stage/activity:** `CLOSE` / `RECONCILED`  
**Owner:** root integrator with TDD and independent review  
**Parent:** CVG-002 / CVG-002C2 clinical-financial backbone  
**Tier/risk/blast radius:** `T4_CRITICAL` / `HIGH` / `CROSS_SYSTEM`  
**Authority:** `.agent/authority.jsonl#AUTH-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-IR-001`

## Problem

The public daily-charge billing command runs inside the tenant idempotent unit
of work. `BillingService.addItem` catches a unique-source violation and tries
to reload the winning item, but the PostgreSQL client is already in the
failed-transaction state when the insert was not protected by a savepoint.
Two equivalent requests with different idempotency keys can therefore return
`500`/`25P02` instead of converging on one billed daily charge.

The existing same-key replay, source uniqueness and direct-service race tests
do not prove this HTTP/UoW boundary. This task addresses only that local
financial concurrency invariant.

## Frozen bounded contract

1. Two concurrent public POSTs for the same tenant, daily charge and
   equivalent source payload, but distinct idempotency keys, must complete
   without `500` or `25P02` and converge on the same successful daily-charge
   response.
2. PostgreSQL must persist exactly one source-linked billing item and one
   billed daily charge. The losing transaction must recover from the source
   uniqueness race without querying an aborted transaction and must preserve
   tenant context.
3. A distinct-key request with a different source payload must return the
   existing typed conflict, leave no additional billing item/daily-charge
   mutation and never expose a database transaction error.
4. Existing same-key replay, rollback, cache rehydration, tenant isolation,
   daily-charge cutoff, receipt and full clinical-financial regressions remain
   green. No migration is authorized unless source inspection proves the
   existing uniqueness contract insufficient.
5. Keep the public API payload/response and the existing repository/service
   contracts compatible where possible. Do not change provider behavior,
   target/RLS operations, credentials, deployment, production, release,
   global parity or unrelated billing commands.

## Quality Bar and TDD

### RED

- Add a disposable PostgreSQL HTTP regression that starts equivalent distinct
  key requests concurrently and fails before the correction at the observed
  `500`/aborted-client boundary.
- Add a divergent-payload negative assertion if the existing fixture can
  exercise it without weakening the race reproduction.
- Record the exact failure before changing production code.

### GREEN

- Use a transaction-safe local recovery boundary (for example a savepoint
  around the expected uniqueness race) or an equivalent atomic repository
  contract. The outer tenant UoW must remain usable for the daily-charge
  update and idempotency completion.
- Preserve typed conflict behavior for mismatched source values and avoid
  mutating hot caches before durable success.
- Run focused module/API/PostgreSQL tests, then relevant clinical-financial
  regressions, typecheck, build, static/security checks and official coverage.
- Obtain a fresh independent read-only review before bounded closure; the
  parent/global ERP remains `IN_PROGRESS`/`PARTIAL` and promotion remains
  `BLOCKED`.

## Explicit non-claims

This slice proves only the repository-local PostgreSQL HTTP/UoW daily-charge
race boundary. It does not certify every financial command, external payment
provider, PIX/webhook behavior, distributed clock/worker topology, target
roles/RLS, backup/restore, accessibility, Vetus parity, production,
deployment, release or global ERP readiness.

## Evidence plan

- `.agent/gates/implementation-ready-CVG-002C2-daily-charge-distinct-key-race.json`
- `.agent/verification.jsonl#VFY-SCOUT-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-RED-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-CACHE-RED-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-CACHE-GREEN-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-DIVERGENT-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-REGRESSION-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-QUALITY-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-REVIEW-002`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-GLOBAL-NON-PROMOTION-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-FINAL-001`
- `.agent/verification.jsonl#VFY-CVG-002C2-DAILY-CHARGE-DISTINCT-KEY-RACE-CONTROL-PLANE-001`
- `packages/modules/billing/src/index.ts`
- `packages/modules/billing/src/repositories/database-billing.repository.ts`
- `tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts`
- `packages/modules/billing/src/billing.test.ts`
- `tests/integration/database/inpatient-daily-charge-billing-idempotency.test.ts`
- `tests/integration/database/inpatient-daily-charge-billing-rollback.test.ts`
- `tests/integration/database/inpatient-clinical-financial-vertical-http-postgres.test.ts`
- `.agent/gates/verified-CVG-002C2-daily-charge-distinct-key-race.json`
- `.agent/artifacts/CVG-002C2-daily-charge-distinct-key-race-2026-08-30.md`

## Decision boundary

Only the daily-charge source uniqueness recovery inside the existing tenant
HTTP UoW is authorized. Stop and request fresh authority before changing
schema semantics, idempotency policy, other billing commands, external
providers or any target/production/release surface.

## Bounded closure checkpoint

The repository-local correction is complete as `PASS_BOUNDED`. The expected
PostgreSQL `23505` race is isolated inside savepoints around `createRecord` and
`createItem`, so `BillingService` can reload the committed winner through the
still-usable outer tenant transaction. In repository mode source-item replay
now consults `findItemBySource` instead of trusting a pre-commit hot-cache
entry; in-memory mode retains its existing cache behavior. The legacy
`acc_cvg_demo` bootstrap audit marker is also isolated from the first real
tenant command when RLS correctly rejects that legacy identity; command audit
writes remain fail-closed.

The intentional RED reproduced `current transaction is aborted` / `25P02`
after the losing unique insert. Subsequent bounded proof passed:

- BillingService full suite: `17/17`.
- Disposable PostgreSQL idempotency/UoW suite: `4/4`, including equivalent
  distinct-key convergence and typed divergent-source conflict with the daily
  charge left pending and unlinked.
- Published HTTP daily-charge suite: `5/5`, including two API instances,
  distinct-key convergence, same-key replay, rollback and tenant isolation.
- Clinical-financial vertical HTTP suite: `16/16`.
- Rollback-specific PostgreSQL proof: `1/1`; AuditService: `29/29`.
- Compiled API suite: `511/511`.
- Full workspace `typecheck` and `build` passed, including SPA/PWA output.
- Official coverage completed with `121` instrumented files: `80.20%`
  statements, `80.75%` branches and `86.76%` functions.
- Secret scan, OpenAPI (`354` paths / `40` tags / `413` schemas), migration
  source-of-truth, RLS (`165/166`, one documented exception), Prettier and
  `git diff --check` passed.

The independent read-only review returned `APPROVE_BOUNDED` with no
Critical/High/Medium finding. The public route derives its billing source from
the persisted daily-charge row, so divergent source-value proof is exercised
at the direct tenant-UoW/service boundary; the HTTP proof covers the public
equivalent-source path. No migration, provider, target, production, release
or global ERP behavior changed.

No commit, push, deployment, provider mutation or target operation occurred.
The final verified gate is
`.agent/gates/verified-CVG-002C2-daily-charge-distinct-key-race.json`; return
to fresh residual scouting under a new authority while preserving the parent
and global ERP non-promotion boundary.
